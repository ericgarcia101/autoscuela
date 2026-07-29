-- ===========================================================================
-- 0006_gamification.sql — Rachas, logros y ranking
-- Mantiene al alumno estudiando a diario: es el argumento de venta que más
-- pesa frente a los tests en papel.
-- ===========================================================================

create table achievements (
  code        text primary key,
  name        text not null,
  description text not null,
  icon        text not null default 'trophy',
  tier        text not null default 'bronze',   -- bronze | silver | gold | platinum
  points      int not null default 10,
  -- Cómo se desbloquea, evaluado por check_achievements()
  --   { "metric": "sessions_completed", "gte": 10 }
  criteria    jsonb not null default '{}'::jsonb,
  position    int not null default 0
);

create table student_achievements (
  student_id  uuid not null references profiles(id) on delete cascade,
  code        text not null references achievements(code) on delete cascade,
  earned_at   timestamptz not null default now(),
  primary key (student_id, code)
);

create table student_stats (
  student_id       uuid primary key references profiles(id) on delete cascade,
  points           int not null default 0,
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  last_activity_on date,
  sessions_completed int not null default 0,
  questions_answered int not null default 0,
  questions_correct  int not null default 0,
  exams_passed     int not null default 0,
  study_minutes    int not null default 0,
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recalcula racha y contadores al cerrar una sesión de test
-- ---------------------------------------------------------------------------
create or replace function refresh_student_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  st        student_stats%rowtype;
  today     date := (now() at time zone 'Europe/Madrid')::date;
  new_streak int;
begin
  -- Sólo cuenta la transición a 'completed', y sólo una vez.
  -- (No se puede comparar `old.status` con '' porque es un enum: en un
  --  INSERT `old` es NULL y el cast de '' a session_status falla.)
  if new.status <> 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  select * into st from student_stats where student_id = new.student_id;

  if not found then
    new_streak := 1;
    st.longest_streak := 0;
    st.points := 0;
    st.sessions_completed := 0;
    st.questions_answered := 0;
    st.questions_correct := 0;
    st.study_minutes := 0;
  elsif st.last_activity_on = today then
    new_streak := st.current_streak;                 -- ya contaba hoy
  elsif st.last_activity_on = today - 1 then
    new_streak := st.current_streak + 1;             -- día consecutivo
  else
    new_streak := 1;                                 -- racha rota
  end if;

  insert into student_stats (
    student_id, points, current_streak, longest_streak, last_activity_on,
    sessions_completed, questions_answered, questions_correct, study_minutes, updated_at
  )
  values (
    new.student_id,
    coalesce(st.points, 0) + 10 + (case when new.passed then 25 else 0 end),
    new_streak,
    greatest(coalesce(st.longest_streak, 0), new_streak),
    today,
    coalesce(st.sessions_completed, 0) + 1,
    coalesce(st.questions_answered, 0) + new.answered,
    coalesce(st.questions_correct, 0) + new.correct,
    coalesce(st.study_minutes, 0) + coalesce(new.duration_sec, 0) / 60,
    now()
  )
  on conflict (student_id) do update
    set points             = excluded.points,
        current_streak     = excluded.current_streak,
        longest_streak     = excluded.longest_streak,
        last_activity_on   = excluded.last_activity_on,
        sessions_completed = excluded.sessions_completed,
        questions_answered = excluded.questions_answered,
        questions_correct  = excluded.questions_correct,
        study_minutes      = excluded.study_minutes,
        updated_at         = now();

  -- Desbloquea los logros cuyo criterio ya se cumple
  insert into student_achievements (student_id, code)
  select new.student_id, a.code
    from achievements a, student_stats s
   where s.student_id = new.student_id
     and (
       (a.criteria ->> 'metric' = 'sessions_completed'
         and s.sessions_completed >= (a.criteria ->> 'gte')::int) or
       (a.criteria ->> 'metric' = 'current_streak'
         and s.current_streak >= (a.criteria ->> 'gte')::int) or
       (a.criteria ->> 'metric' = 'questions_correct'
         and s.questions_correct >= (a.criteria ->> 'gte')::int) or
       (a.criteria ->> 'metric' = 'points'
         and s.points >= (a.criteria ->> 'gte')::int)
     )
  on conflict do nothing;

  return new;
end;
$$;

create trigger sessions_refresh_stats
  after insert or update of status on test_sessions
  for each row execute function refresh_student_stats();

-- ---------------------------------------------------------------------------
-- Catálogo de logros
-- ---------------------------------------------------------------------------
insert into achievements (code, name, description, icon, tier, points, criteria, position) values
  ('first_test',    'Primer contacto',   'Completa tu primer test',                    'flag',       'bronze',   10, '{"metric":"sessions_completed","gte":1}',    1),
  ('tests_10',      'Cogiendo ritmo',    'Completa 10 tests',                          'activity',   'bronze',   20, '{"metric":"sessions_completed","gte":10}',   2),
  ('tests_50',      'Veterano',          'Completa 50 tests',                          'award',      'silver',   50, '{"metric":"sessions_completed","gte":50}',   3),
  ('tests_200',     'Máquina de tests',  'Completa 200 tests',                         'zap',        'gold',    150, '{"metric":"sessions_completed","gte":200}',  4),
  ('streak_3',      'Tres al hilo',      'Estudia 3 días seguidos',                    'flame',      'bronze',   15, '{"metric":"current_streak","gte":3}',        5),
  ('streak_7',      'Semana perfecta',   'Estudia 7 días seguidos',                    'flame',      'silver',   40, '{"metric":"current_streak","gte":7}',        6),
  ('streak_30',     'Constancia total',  'Estudia 30 días seguidos',                   'flame',      'gold',    200, '{"metric":"current_streak","gte":30}',       7),
  ('correct_500',   'Medio millar',      'Acierta 500 preguntas',                      'target',     'silver',   60, '{"metric":"questions_correct","gte":500}',   8),
  ('correct_2000',  'Dominio del temario','Acierta 2000 preguntas',                    'crosshair',  'gold',    250, '{"metric":"questions_correct","gte":2000}',  9),
  ('points_1000',   'Mil puntos',        'Alcanza 1000 puntos',                        'star',       'gold',    100, '{"metric":"points","gte":1000}',           10),
  ('points_5000',   'Leyenda',           'Alcanza 5000 puntos',                        'crown',      'platinum',500, '{"metric":"points","gte":5000}',           11)
on conflict (code) do nothing;
