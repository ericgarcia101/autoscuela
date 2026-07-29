-- ===========================================================================
-- 0019_questions_follow_license.sql — El permiso del alumno filtra sus tests
--
-- `select_questions` sólo filtraba por permiso cuando la plantilla lo pedía
-- explícitamente (los "examen_oficial_*"). En el resto —tests por bloque,
-- repaso de fallos, reto diario…— entraban preguntas de camión o autobús a un
-- alumno de coche, y cambiar el permiso en su ficha no tenía ningún efecto.
--
-- A partir de aquí, cuando la plantilla no impone permiso se usa el del
-- alumno (profiles.target_license). Una plantilla que sí lo especifique sigue
-- mandando, para que los simulacros oficiales sigan siendo lo que son.
-- ===========================================================================

create or replace function select_questions(
  p_student  uuid,
  p_count    int,
  p_rules    jsonb default '{}'::jsonb
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_school     uuid;
  v_license    license_class;
  v_strategy   text := coalesce(p_rules ->> 'strategy', 'random');
  v_topics     text[];
  v_tags       text[];
  v_licenses   license_class[];
  v_diff_min   int  := coalesce((p_rules -> 'difficulty' ->> 0)::int, 1);
  v_diff_max   int  := coalesce((p_rules -> 'difficulty' ->> 1)::int, 5);
  v_signals    boolean := coalesce((p_rules ->> 'signals_only')::boolean, false);
  v_result     uuid[];
  v_filler     uuid[];
begin
  select school_id, target_license
    into v_school, v_license
    from profiles where id = p_student;

  select array(select jsonb_array_elements_text(p_rules -> 'topics')) into v_topics;
  select array(select jsonb_array_elements_text(p_rules -> 'tags'))   into v_tags;

  -- Permiso: manda la plantilla; si no dice nada, el del alumno.
  select array_agg(x::license_class)
    into v_licenses
    from jsonb_array_elements_text(coalesce(p_rules -> 'licenses', '[]'::jsonb)) x;

  if v_licenses is null or cardinality(v_licenses) = 0 then
    v_licenses := array[coalesce(v_license, 'B'::license_class)];
  end if;

  -- Universo de preguntas elegibles para este alumno
  with pool as (
    select q.*
      from questions q
      left join topics t on t.id = q.topic_id
     where q.status = 'published'
       and (q.school_id is null or q.school_id = v_school)
       and q.difficulty between v_diff_min and v_diff_max
       and (v_topics is null or cardinality(v_topics) = 0 or t.code = any(v_topics))
       and (v_tags   is null or cardinality(v_tags)   = 0 or q.tags && v_tags)
       and q.licenses && v_licenses
       and (not v_signals or q.image_url is not null or 'senales' = any(q.tags))
  ),
  history as (
    select a.question_id,
           count(*)                                 as seen,
           count(*) filter (where not a.is_correct)  as fails,
           bool_or(a.flagged)                        as flagged,
           max(a.answered_at)                        as last_seen
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
      left join history h   on h.question_id = p.id
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
         when 'failed'   then fails * 1000 - extract(epoch from coalesce(last_seen, now())) / 86400
         when 'hardest'  then -coalesce(global_rate, 0.5) * 1000
         when 'srs'      then -extract(epoch from (now() - coalesce(due_at, now()))) / 3600
         when 'weakest'  then fails * 100 - seen
         when 'adaptive' then fails * 50 + (case when seen = 0 then 25 else 0 end)
         else 0
       end desc,
       random()
     limit p_count
  ) picked;

  v_result := coalesce(v_result, '{}'::uuid[]);

  -- Relleno: respeta el permiso igual que el universo principal, si no un
  -- test de "mis fallos" acabaría colando preguntas de otro carnet.
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
         and q.licenses && v_licenses
         and not (q.id = any(v_result))
       order by random()
       limit p_count - coalesce(array_length(v_result, 1), 0)
    ) f;

    v_result := v_result || coalesce(v_filler, '{}'::uuid[]);
  end if;

  return v_result;
end;
$$;
