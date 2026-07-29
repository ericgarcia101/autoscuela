-- ===========================================================================
-- 0008_engine.sql — Motor de generación de tests y ciclo de vida de la sesión
--
-- Toda la selección de preguntas ocurre en el servidor. El cliente nunca
-- recibe `correct_index` antes de responder: se corrige con submit_answer().
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- select_questions()
--
-- Traduce las `rules` de una plantilla a un conjunto de preguntas. Es lo que
-- permite tener 50+ modalidades de test con un único motor.
--
-- rules soportadas:
--   strategy      random | exam | weakest | failed | unseen | srs | adaptive |
--                 hardest | flagged | signals | never_failed
--   topics        text[]  códigos de tema
--   tags          text[]
--   licenses      text[]
--   difficulty    [min, max]
--   signals_only  boolean
-- ---------------------------------------------------------------------------
create or replace function select_questions(
  p_student  uuid,
  p_count    int,
  p_rules    jsonb default '{}'::jsonb
)
returns uuid[]
language plpgsql
-- VOLATILE a propósito (no STABLE): usa random() para barajar, y marcarla
-- estable permitiría al planificador reutilizar un resultado ya calculado.
volatile
security definer
set search_path = public
as $$
declare
  v_school     uuid;
  v_strategy   text := coalesce(p_rules ->> 'strategy', 'random');
  v_topics     text[];
  v_tags       text[];
  v_licenses   text[];
  v_diff_min   int  := coalesce((p_rules -> 'difficulty' ->> 0)::int, 1);
  v_diff_max   int  := coalesce((p_rules -> 'difficulty' ->> 1)::int, 5);
  v_signals    boolean := coalesce((p_rules ->> 'signals_only')::boolean, false);
  v_result     uuid[];
  v_filler     uuid[];
begin
  select school_id into v_school from profiles where id = p_student;

  select array(select jsonb_array_elements_text(p_rules -> 'topics'))   into v_topics;
  select array(select jsonb_array_elements_text(p_rules -> 'tags'))     into v_tags;
  select array(select jsonb_array_elements_text(p_rules -> 'licenses')) into v_licenses;

  -- Universo de preguntas elegibles para este alumno
  with pool as (
    select q.*
      from questions q
      left join topics t on t.id = q.topic_id
     where q.status = 'published'
       and (q.school_id is null or q.school_id = v_school)
       and q.difficulty between v_diff_min and v_diff_max
       and (v_topics   is null or cardinality(v_topics)   = 0 or t.code = any(v_topics))
       and (v_tags     is null or cardinality(v_tags)     = 0 or q.tags && v_tags)
       and (v_licenses is null or cardinality(v_licenses) = 0
            or q.licenses && (select array_agg(x::license_class) from unnest(v_licenses) x))
       and (not v_signals or q.image_url is not null or 'senales' = any(q.tags))
  ),
  -- Historial del alumno sobre cada pregunta del universo
  history as (
    select a.question_id,
           count(*)                                as seen,
           count(*) filter (where not a.is_correct) as fails,
           bool_or(a.flagged)                       as flagged,
           max(a.answered_at)                       as last_seen
      from test_answers a
     where a.student_id = p_student
     group by a.question_id
  ),
  scored as (
    select p.id,
           p.topic_id,
           coalesce(h.seen, 0)  as seen,
           coalesce(h.fails, 0) as fails,
           coalesce(h.flagged, false) as flagged,
           h.last_seen,
           s.due_at,
           case when p.times_answered >= 5
                then p.times_correct::numeric / p.times_answered
                else null end as global_rate
      from pool p
      left join history h  on h.question_id = p.id
      left join srs_cards s on s.question_id = p.id and s.student_id = p_student
  )
  select array_agg(id) into v_result
  from (
    select id from scored
     where case v_strategy
             when 'failed'       then fails > 0
             when 'unseen'       then seen = 0
             when 'flagged'      then flagged
             when 'srs'          then due_at is not null and due_at <= now()
             when 'never_failed' then seen > 0 and fails = 0
             else true
           end
     order by
       case v_strategy
         -- Más fallada primero, y dentro de eso lo más antiguo
         when 'failed'   then fails * 1000 - extract(epoch from coalesce(last_seen, now())) / 86400
         -- Menor tasa de acierto global = pregunta más difícil
         when 'hardest'  then -coalesce(global_rate, 0.5) * 1000
         -- Vencidas hace más tiempo primero
         when 'srs'      then -extract(epoch from (now() - coalesce(due_at, now()))) / 3600
         -- Prioriza lo poco visto y lo fallado
         when 'weakest'  then fails * 100 - seen
         when 'adaptive' then fails * 50 + (case when seen = 0 then 25 else 0 end)
         else 0
       end desc,
       random()
     limit p_count
  ) picked;

  v_result := coalesce(v_result, '{}'::uuid[]);

  -- Si la estrategia no llenó el test (p. ej. el alumno aún no ha fallado
  -- suficientes preguntas), se completa con preguntas aleatorias del universo.
  if array_length(v_result, 1) is null or array_length(v_result, 1) < p_count then
    select array_agg(id) into v_filler
    from (
      select q.id
        from questions q
        left join topics t on t.id = q.topic_id
       where q.status = 'published'
         and (q.school_id is null or q.school_id = v_school)
         and q.difficulty between v_diff_min and v_diff_max
         and (v_topics is null or cardinality(v_topics) = 0 or t.code = any(v_topics))
         and not (q.id = any(v_result))
       order by random()
       limit p_count - coalesce(array_length(v_result, 1), 0)
    ) f;

    v_result := v_result || coalesce(v_filler, '{}'::uuid[]);
  end if;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- start_test_session() — crea la sesión y devuelve su id
-- ---------------------------------------------------------------------------
create or replace function start_test_session(
  p_template_code text default 'random_30',
  p_assignment_id uuid default null,
  p_overrides     jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student   uuid := auth.uid();
  v_school    uuid;
  v_tpl       test_templates%rowtype;
  v_asg       assignments%rowtype;
  v_rules     jsonb;
  v_count     int;
  v_qids      uuid[];
  v_session   uuid;
  v_title     text;
begin
  if v_student is null then
    raise exception 'No autenticado';
  end if;

  select school_id into v_school from profiles where id = v_student;

  -- La asignación manda sobre la plantilla
  if p_assignment_id is not null then
    select * into v_asg
      from assignments
     where id = p_assignment_id and student_id = v_student;

    if not found then
      raise exception 'Asignación no encontrada';
    end if;
    if v_asg.attempts_used >= v_asg.attempts_allowed then
      raise exception 'Has agotado los intentos de esta tarea';
    end if;
  end if;

  select * into v_tpl
    from test_templates
   where code = p_template_code
     and (school_id is null or school_id = v_school)
     and is_active
   order by school_id nulls last
   limit 1;

  if not found then
    raise exception 'Plantilla de test "%" no encontrada', p_template_code;
  end if;

  v_rules := v_tpl.rules
             || coalesce(v_asg.rules, '{}'::jsonb)
             || coalesce(p_overrides -> 'rules', '{}'::jsonb);
  v_count := coalesce((p_overrides ->> 'question_count')::int, v_tpl.question_count);
  v_title := coalesce(v_asg.title, v_tpl.name);

  -- Preguntas fijadas por el profesor, si las hay
  if v_asg.question_ids is not null and array_length(v_asg.question_ids, 1) > 0 then
    v_qids := v_asg.question_ids;
  else
    v_qids := select_questions(v_student, v_count, v_rules);
  end if;

  if array_length(v_qids, 1) is null then
    raise exception 'No hay preguntas disponibles con esos criterios';
  end if;

  if v_tpl.shuffle_questions then
    select array_agg(x order by random()) into v_qids from unnest(v_qids) x;
  end if;

  insert into test_sessions (
    school_id, student_id, template_id, assignment_id, template_code, title,
    question_ids, total_questions, time_limit_sec, max_failures, pass_threshold,
    config
  )
  values (
    v_school, v_student, v_tpl.id, p_assignment_id, v_tpl.code, v_title,
    v_qids, array_length(v_qids, 1),
    coalesce((p_overrides ->> 'time_limit_sec')::int, v_tpl.time_limit_sec),
    v_tpl.max_failures,
    v_tpl.pass_threshold,
    jsonb_build_object(
      'instant_feedback', v_tpl.instant_feedback,
      'shuffle_options',  v_tpl.shuffle_options,
      'allow_review',     v_tpl.allow_review,
      'sudden_death',     v_tpl.sudden_death,
      'rules',            v_rules
    )
  )
  returning id into v_session;

  if p_assignment_id is not null then
    update assignments
       set status = 'in_progress', attempts_used = attempts_used + 1
     where id = p_assignment_id;
  end if;

  return v_session;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_answer() — corrige en el servidor y devuelve el resultado
--
-- Es el único camino por el que el cliente descubre la respuesta correcta,
-- así que no se puede hacer trampa leyendo la tabla `questions`.
-- ---------------------------------------------------------------------------
create or replace function submit_answer(
  p_session      uuid,
  p_question     uuid,
  p_selected     int,
  p_time_spent_ms int default null,
  p_flagged      boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student  uuid := auth.uid();
  v_session  test_sessions%rowtype;
  v_question questions%rowtype;
  v_correct  boolean;
  v_position int;
begin
  select * into v_session
    from test_sessions
   where id = p_session and student_id = v_student;

  if not found then
    raise exception 'Sesión no encontrada';
  end if;
  if v_session.status <> 'in_progress' then
    raise exception 'Esta sesión ya está cerrada';
  end if;
  if not (p_question = any(v_session.question_ids)) then
    raise exception 'La pregunta no pertenece a esta sesión';
  end if;

  select * into v_question from questions where id = p_question;

  v_correct := (p_selected is not null and p_selected = v_question.correct_index);
  v_position := array_position(v_session.question_ids, p_question);

  insert into test_answers (
    session_id, question_id, student_id, position,
    selected_index, is_correct, time_spent_ms, flagged, answered_at
  )
  values (
    p_session, p_question, v_student, v_position,
    p_selected, v_correct, p_time_spent_ms, p_flagged, now()
  )
  on conflict (session_id, question_id) do update
    set selected_index = excluded.selected_index,
        is_correct     = excluded.is_correct,
        time_spent_ms  = excluded.time_spent_ms,
        flagged        = excluded.flagged,
        answered_at    = now();

  -- Recuento en vivo de la sesión
  update test_sessions s
     set answered  = sub.answered,
         correct   = sub.correct,
         incorrect = sub.incorrect
    from (
      select count(*) filter (where selected_index is not null) as answered,
             count(*) filter (where is_correct)                 as correct,
             count(*) filter (where is_correct = false)         as incorrect
        from test_answers where session_id = p_session
    ) sub
   where s.id = p_session;

  return jsonb_build_object(
    'is_correct',    v_correct,
    'correct_index', v_question.correct_index,
    'explanation',   v_question.explanation,
    'legal_ref',     v_question.legal_ref,
    'legal_url',     v_question.legal_url
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- finish_test_session() — cierra, puntúa y devuelve el resumen
-- ---------------------------------------------------------------------------
create or replace function finish_test_session(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_s       test_sessions%rowtype;
  v_correct int;
  v_answered int;
  v_score   numeric(5,2);
  v_passed  boolean;
  v_blank   int;
begin
  select * into v_s from test_sessions
   where id = p_session and student_id = v_student;

  if not found then
    raise exception 'Sesión no encontrada';
  end if;
  if v_s.status <> 'in_progress' then
    return jsonb_build_object('already_finished', true, 'score', v_s.score, 'passed', v_s.passed);
  end if;

  select count(*) filter (where is_correct),
         count(*) filter (where selected_index is not null)
    into v_correct, v_answered
    from test_answers where session_id = p_session;

  v_blank := v_s.total_questions - v_answered;
  v_score := round((v_correct::numeric / nullif(v_s.total_questions, 0)) * 100, 2);

  -- Aprueba por porcentaje o, si la plantilla define tope de fallos
  -- (examen oficial del permiso B: máximo 3), por número de errores.
  v_passed := case
    when v_s.max_failures is not null
      then (v_s.total_questions - v_correct) <= v_s.max_failures
    else v_score >= v_s.pass_threshold
  end;

  update test_sessions
     set status       = 'completed',
         correct      = v_correct,
         incorrect    = v_answered - v_correct,
         answered     = v_answered,
         blank        = v_blank,
         score        = v_score,
         passed       = v_passed,
         finished_at  = now(),
         duration_sec = greatest(1, extract(epoch from (now() - started_at))::int)
   where id = p_session;

  if v_s.assignment_id is not null then
    update assignments
       set status = 'completed',
           best_score = greatest(coalesce(best_score, 0), v_score)
     where id = v_s.assignment_id;
  end if;

  return jsonb_build_object(
    'score', v_score, 'passed', v_passed, 'correct', v_correct,
    'incorrect', v_answered - v_correct, 'blank', v_blank,
    'total', v_s.total_questions
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Analítica del alumno — alimenta el dashboard y el tutor IA
-- ---------------------------------------------------------------------------
create or replace function student_topic_breakdown(p_student uuid default null)
returns table (
  topic_id   uuid,
  topic_code text,
  topic_name text,
  answered   bigint,
  correct    bigint,
  accuracy   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select coalesce(p_student, auth.uid()) as sid
  )
  select t.id, t.code, t.name,
         count(a.id)                        as answered,
         count(a.id) filter (where a.is_correct) as correct,
         round(
           coalesce(count(a.id) filter (where a.is_correct)::numeric
                    / nullif(count(a.id), 0) * 100, 0), 1
         ) as accuracy
    from topics t
    left join questions q   on q.topic_id = t.id
    left join test_answers a on a.question_id = q.id
                            and a.student_id = (select sid from target)
                            and a.selected_index is not null
   where t.parent_id is null
     and (
       (select sid from target) = auth.uid()
       or is_staff()
     )
   group by t.id, t.code, t.name, t.position
   order by t.position;
$$;

create or replace function student_readiness(p_student uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sid       uuid := coalesce(p_student, auth.uid());
  v_recent    numeric;
  v_sessions  int;
  v_coverage  numeric;
  v_weak      text[];
  v_score     numeric;
begin
  if v_sid <> auth.uid() and not is_staff() then
    raise exception 'Sin permiso';
  end if;

  -- Media de los 10 últimos tests completados
  select round(avg(score), 1), count(*)
    into v_recent, v_sessions
    from (
      select score from test_sessions
       where student_id = v_sid and status = 'completed' and score is not null
       order by finished_at desc limit 10
    ) r;

  -- Porcentaje del banco que el alumno ha visto al menos una vez
  select round(
           count(distinct a.question_id)::numeric
           / nullif((select count(*) from questions where status = 'published'), 0) * 100, 1)
    into v_coverage
    from test_answers a where a.student_id = v_sid;

  select array_agg(topic_name order by accuracy)
    into v_weak
    from student_topic_breakdown(v_sid)
   where answered >= 5 and accuracy < 80;

  -- Índice de preparación: peso 65 % nota reciente, 25 % cobertura, 10 % constancia
  v_score := round(
    coalesce(v_recent, 0) * 0.65
    + least(coalesce(v_coverage, 0), 100) * 0.25
    + least(coalesce(v_sessions, 0) * 10, 100) * 0.10
  , 1);

  return jsonb_build_object(
    'readiness',      v_score,
    'recent_average', coalesce(v_recent, 0),
    'sessions',       coalesce(v_sessions, 0),
    'coverage',       coalesce(v_coverage, 0),
    'weak_topics',    coalesce(v_weak, '{}'::text[]),
    'verdict', case
      when v_score >= 85 then 'listo'
      when v_score >= 70 then 'casi'
      when v_score >= 45 then 'en_progreso'
      else 'inicial'
    end
  );
end;
$$;

-- Panel del admin: una fila por alumno con todo lo que necesita ver
create or replace function school_student_overview()
returns table (
  student_id     uuid,
  full_name      text,
  email          text,
  status         student_status,
  target_license license_class,
  sessions       bigint,
  avg_score      numeric,
  last_activity  timestamptz,
  current_streak int,
  pending_tasks  bigint,
  unread_messages int
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.full_name,
         p.email,
         p.status,
         p.target_license,
         count(distinct s.id)                       as sessions,
         round(avg(s.score) filter (where s.status = 'completed'), 1) as avg_score,
         max(s.finished_at)                          as last_activity,
         coalesce(max(st.current_streak), 0)         as current_streak,
         count(distinct a.id) filter (where a.status in ('pending', 'in_progress')) as pending_tasks,
         coalesce(max(c.unread_for_staff), 0)        as unread_messages
    from profiles p
    left join test_sessions s  on s.student_id = p.id
    left join student_stats st on st.student_id = p.id
    left join assignments a    on a.student_id = p.id
    left join conversations c  on c.student_id = p.id and c.kind = 'support'
   where p.school_id = auth_school_id()
     and p.role = 'student'
     and is_staff()
   group by p.id, p.full_name, p.email, p.status, p.target_license
   order by max(s.finished_at) desc nulls last;
$$;
