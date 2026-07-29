-- ===========================================================================
-- 0018_coverage_by_license.sql — La cobertura se mide contra el carnet
--
-- Antes, `coverage` comparaba las preguntas vistas por el alumno contra TODO
-- el banco publicado, incluidas las de permisos que no está preparando. Un
-- alumno de B nunca podía llegar al 100 %, y el dato no significaba nada.
--
-- Ahora el denominador son solo las preguntas de SU permiso (profiles.
-- target_license contra questions.licenses), y el numerador solo cuenta
-- respuestas a preguntas de ese mismo permiso.
-- ===========================================================================

create or replace function student_readiness(p_student uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sid       uuid := coalesce(p_student, auth.uid());
  v_license   license_class;
  v_recent    numeric;
  v_sessions  int;
  v_coverage  numeric;
  v_weak      text[];
  v_score     numeric;
begin
  if v_sid <> auth.uid() and not is_staff() then
    raise exception 'Sin permiso';
  end if;

  select target_license into v_license from profiles where id = v_sid;

  -- Media de los 10 últimos tests completados
  select round(avg(score), 1), count(*)
    into v_recent, v_sessions
    from (
      select score from test_sessions
       where student_id = v_sid and status = 'completed' and score is not null
       order by finished_at desc limit 10
    ) r;

  -- Porcentaje del banco de SU permiso que el alumno ha visto al menos una vez
  select round(
           count(distinct a.question_id)::numeric
           / nullif((
               select count(*) from questions
                where status = 'published'
                  and v_license = any (licenses)
             ), 0) * 100, 1)
    into v_coverage
    from test_answers a
    join questions q on q.id = a.question_id
   where a.student_id = v_sid
     and v_license = any (q.licenses);

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
    'coverage',       least(coalesce(v_coverage, 0), 100),
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
