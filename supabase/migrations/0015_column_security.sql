-- ===========================================================================
-- 0015_column_security.sql — Cerrar la fuga de respuestas
--
-- RLS filtra filas, no columnas. Sin esto, un alumno con la clave anónima
-- puede pedir `select correct_index from questions` y aprobar todos los tests
-- sin estudiar. Se revoca el acceso directo a las columnas sensibles y se
-- expone el contenido por funciones controladas.
--
-- NOTA SOBRE LOS NOMBRES DE SALIDA: las columnas de un `returns table` son
-- parámetros OUT y entran en el ámbito del cuerpo de la función. Llamar a una
-- `text` o `position` choca con el tipo `text` y con la función `position()`
-- del estándar SQL, y Postgres rechaza la definición. De ahí el prefijo `q_`.
-- ===========================================================================

-- PostgreSQL no permite recortar un GRANT de tabla revocando columnas sueltas:
-- un `grant select on questions` cubre todas las columnas y un
-- `revoke select (correct_index) ...` sobre él no tiene efecto. Hay que
-- revocar el SELECT de la tabla y volver a concederlo columna a columna.
revoke select on questions from authenticated, anon;

grant select (
  id, school_id, topic_id, status, source,
  text, options, image_url, image_alt, video_url,
  difficulty, licenses, tags,
  times_answered, times_correct,
  created_by, created_at, updated_at
) on questions to authenticated;

-- ---------------------------------------------------------------------------
-- Preguntas jugables de una sesión: todo menos la respuesta
-- ---------------------------------------------------------------------------
create or replace function get_session_questions(p_session uuid)
returns table (
  id          uuid,
  q_order     int,
  q_text      text,
  options     jsonb,
  image_url   text,
  image_alt   text,
  difficulty  int,
  tags        text[],
  topic_name  text,
  topic_color text
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id,
         array_position(s.question_ids, q.id),
         q.text,
         q.options,
         q.image_url,
         q.image_alt,
         q.difficulty,
         q.tags,
         t.name,
         t.color
    from test_sessions s
    join questions q on q.id = any(s.question_ids)
    left join topics t on t.id = q.topic_id
   where s.id = p_session
     and s.student_id = auth.uid()
   order by array_position(s.question_ids, q.id);
$$;

-- ---------------------------------------------------------------------------
-- Revisión posterior: se abre sólo cuando la sesión ya está cerrada
-- ---------------------------------------------------------------------------
create or replace function session_review(p_session uuid)
returns table (
  question_id    uuid,
  q_order        int,
  q_text         text,
  options        jsonb,
  correct_index  int,
  selected_index int,
  is_correct     boolean,
  explanation    text,
  legal_ref      text,
  legal_url      text,
  image_url      text,
  topic_name     text,
  flagged        boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists (
    select 1 from test_sessions s
     where s.id = p_session
       and s.status <> 'in_progress'
       and (s.student_id = auth.uid()
            or (s.school_id = auth_school_id() and is_staff()))
  ) into v_ok;

  if not v_ok then
    raise exception 'La revisión no está disponible hasta terminar el test';
  end if;

  return query
    select q.id,
           a.position,
           q.text,
           q.options,
           q.correct_index,
           a.selected_index,
           a.is_correct,
           q.explanation,
           q.legal_ref,
           q.legal_url,
           q.image_url,
           t.name,
           a.flagged
      from test_answers a
      join questions q on q.id = a.question_id
      left join topics t on t.id = q.topic_id
     where a.session_id = p_session
     order by a.position;
end;
$$;

-- ---------------------------------------------------------------------------
-- Banco completo para el staff (gestión del contenido)
-- ---------------------------------------------------------------------------
create or replace function staff_questions(
  p_search   text default null,
  p_topic    text default null,
  p_limit    int  default 50,
  p_offset   int  default 0
)
returns table (
  id            uuid,
  q_text        text,
  options       jsonb,
  correct_index int,
  explanation   text,
  legal_ref     text,
  difficulty    int,
  tags          text[],
  licenses      license_class[],
  topic_code    text,
  topic_name    text,
  source        question_source,
  status        question_status,
  school_id     uuid,
  times_answered int,
  success_rate  numeric,
  total_count   bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select q.*, t.code as t_code, t.name as t_name
      from questions q
      left join topics t on t.id = q.topic_id
     where is_staff()
       and (q.school_id is null or q.school_id = auth_school_id())
       and (p_topic is null or t.code = p_topic)
       and (p_search is null or p_search = ''
            or q.text ilike '%' || p_search || '%'
            or q.legal_ref ilike '%' || p_search || '%')
  )
  select f.id, f.text, f.options, f.correct_index, f.explanation, f.legal_ref,
         f.difficulty, f.tags, f.licenses, f.t_code, f.t_name,
         f.source, f.status, f.school_id, f.times_answered,
         case when f.times_answered = 0 then null
              else round(f.times_correct::numeric / f.times_answered * 100, 1) end,
         count(*) over ()
    from filtered f
   order by f.updated_at desc
   limit p_limit offset p_offset;
$$;

-- ---------------------------------------------------------------------------
-- Preguntas que más falla el conjunto de alumnos de la autoescuela.
-- Es el dato que un jefe de estudios quiere ver para reforzar clase teórica.
-- ---------------------------------------------------------------------------
create or replace function school_hardest_questions(p_limit int default 20)
returns table (
  question_id uuid,
  q_text      text,
  topic_name  text,
  legal_ref   text,
  attempts    bigint,
  accuracy    numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.text, t.name, q.legal_ref,
         count(a.id),
         round(count(a.id) filter (where a.is_correct)::numeric
               / nullif(count(a.id), 0) * 100, 1)
    from test_answers a
    join test_sessions s on s.id = a.session_id
    join questions q     on q.id = a.question_id
    left join topics t   on t.id = q.topic_id
   where s.school_id = auth_school_id()
     and is_staff()
     and a.selected_index is not null
   group by q.id, q.text, t.name, q.legal_ref
  having count(a.id) >= 5
   order by 6 asc
   limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Actividad diaria de la autoescuela para las gráficas del panel
-- ---------------------------------------------------------------------------
create or replace function school_activity(p_days int default 30)
returns table (
  day            date,
  sessions       bigint,
  active_students bigint,
  avg_score      numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d::date,
         count(s.id),
         count(distinct s.student_id),
         round(avg(s.score), 1)
    from generate_series(
           (now() - make_interval(days => p_days))::date, now()::date, '1 day'
         ) d
    left join test_sessions s
      on s.finished_at::date = d::date
     and s.school_id = auth_school_id()
     and s.status = 'completed'
   where is_staff()
   group by d
   order by d;
$$;
