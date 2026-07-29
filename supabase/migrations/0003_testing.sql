-- ===========================================================================
-- 0003_testing.sql — Motor de tests: plantillas, asignaciones, sesiones,
--                    respuestas y repaso espaciado
-- ===========================================================================

create type session_status as enum ('in_progress', 'completed', 'abandoned', 'expired');
create type assignment_status as enum ('pending', 'in_progress', 'completed', 'overdue', 'cancelled');

-- ---------------------------------------------------------------------------
-- Plantillas de test
--
-- El catálogo de 50+ modalidades vive en el código (src/lib/testCatalog.ts) y
-- se siembra aquí como filas `is_system = true`. El staff puede además crear
-- sus propias plantillas desde el panel.
-- ---------------------------------------------------------------------------
create table test_templates (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid references schools(id) on delete cascade,  -- NULL = plantilla del sistema
  code            text not null,
  name            text not null,
  description     text,
  category        text not null default 'general',
  icon            text,
  is_system       boolean not null default false,
  is_active       boolean not null default true,

  question_count  int not null default 30,
  time_limit_sec  int,                                -- NULL = sin límite
  max_failures    int,                                -- NULL = sin tope (examen oficial B: 3)
  pass_threshold  numeric(5,2) not null default 90.0, -- % de aciertos para aprobar

  -- Reglas de selección de preguntas, interpretadas por generate_test()
  --   { "topics": [...], "tags": [...], "difficulty": [1,5],
  --     "strategy": "random|weakest|failed|unseen|srs|adaptive|exam",
  --     "licenses": ["B"], "signals_only": true }
  rules           jsonb not null default '{}'::jsonb,

  -- Comportamiento del reproductor
  shuffle_questions boolean not null default true,
  shuffle_options   boolean not null default true,
  instant_feedback  boolean not null default false,  -- corrige al momento
  allow_review      boolean not null default true,   -- permite repasar antes de enviar
  sudden_death      boolean not null default false,  -- termina al primer fallo

  position        int not null default 0,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique nulls not distinct (school_id, code)
);

create index test_templates_school_idx on test_templates (school_id) where is_active;

create trigger test_templates_touch before update on test_templates
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Asignaciones: el admin/profesor manda un test concreto a un alumno o grupo
-- ---------------------------------------------------------------------------
create table assignments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  template_id   uuid references test_templates(id) on delete set null,
  student_id    uuid not null references profiles(id) on delete cascade,
  assigned_by   uuid references profiles(id) on delete set null,

  title         text not null,
  message       text,                                 -- nota del profesor al alumno
  -- Snapshot de las reglas en el momento de asignar: si luego se edita la
  -- plantilla, la asignación ya enviada no cambia.
  rules         jsonb not null default '{}'::jsonb,
  question_ids  uuid[],                               -- si se fijan preguntas concretas

  due_at        timestamptz,
  status        assignment_status not null default 'pending',
  attempts_allowed int not null default 1,
  attempts_used    int not null default 0,
  best_score    numeric(5,2),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index assignments_student_idx on assignments (student_id, status);
create index assignments_school_idx  on assignments (school_id, created_at desc);
create index assignments_due_idx     on assignments (due_at) where status in ('pending', 'in_progress');

create trigger assignments_touch before update on assignments
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Sesiones de test (un intento)
-- ---------------------------------------------------------------------------
create table test_sessions (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references schools(id) on delete cascade,
  student_id     uuid not null references profiles(id) on delete cascade,
  template_id    uuid references test_templates(id) on delete set null,
  assignment_id  uuid references assignments(id) on delete set null,

  template_code  text,                        -- copia legible del modo jugado
  title          text not null default 'Test',
  status         session_status not null default 'in_progress',

  question_ids   uuid[] not null,
  total_questions int not null,
  answered       int not null default 0,
  correct        int not null default 0,
  incorrect      int not null default 0,
  blank          int not null default 0,
  score          numeric(5,2),                -- % aciertos
  passed         boolean,

  time_limit_sec int,
  max_failures   int,
  pass_threshold numeric(5,2) not null default 90.0,
  duration_sec   int,

  config         jsonb not null default '{}'::jsonb,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index test_sessions_student_idx on test_sessions (student_id, created_at desc);
create index test_sessions_school_idx  on test_sessions (school_id, created_at desc);
create index test_sessions_open_idx    on test_sessions (student_id) where status = 'in_progress';

-- ---------------------------------------------------------------------------
-- Respuestas individuales
-- ---------------------------------------------------------------------------
create table test_answers (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references test_sessions(id) on delete cascade,
  question_id    uuid not null references questions(id) on delete cascade,
  student_id     uuid not null references profiles(id) on delete cascade,
  position       int not null,
  selected_index int,                          -- NULL = en blanco
  is_correct     boolean,
  time_spent_ms  int,
  flagged        boolean not null default false,
  answered_at    timestamptz,
  created_at     timestamptz not null default now(),

  unique (session_id, question_id)
);

create index test_answers_session_idx  on test_answers (session_id, position);
create index test_answers_student_idx  on test_answers (student_id, question_id);
create index test_answers_wrong_idx    on test_answers (student_id) where is_correct = false;

-- ---------------------------------------------------------------------------
-- Trigger: mantiene la estadística agregada de cada pregunta
-- ---------------------------------------------------------------------------
create or replace function bump_question_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_correct is null then
    return new;
  end if;

  -- Sólo cuenta la primera vez que se corrige esta respuesta
  if tg_op = 'UPDATE' and old.is_correct is not null then
    return new;
  end if;

  update questions
     set times_answered = times_answered + 1,
         times_correct  = times_correct + (case when new.is_correct then 1 else 0 end)
   where id = new.question_id;

  return new;
end;
$$;

create trigger test_answers_stats
  after insert or update of is_correct on test_answers
  for each row execute function bump_question_stats();

-- ---------------------------------------------------------------------------
-- Repaso espaciado (SM-2 simplificado)
-- Cada alumno tiene una tarjeta por pregunta fallada; el test "Repaso
-- inteligente" saca las que tocan hoy.
-- ---------------------------------------------------------------------------
create table srs_cards (
  student_id    uuid not null references profiles(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  ease          numeric(4,2) not null default 2.50,
  interval_days int not null default 0,
  repetitions   int not null default 0,
  lapses        int not null default 0,
  due_at        timestamptz not null default now(),
  last_result   boolean,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),

  primary key (student_id, question_id)
);

create index srs_due_idx on srs_cards (student_id, due_at);

-- Actualiza la tarjeta SRS tras cada respuesta corregida
create or replace function update_srs_card()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  card      srs_cards%rowtype;
  new_ease  numeric(4,2);
  new_int   int;
  new_reps  int;
begin
  if new.is_correct is null then
    return new;
  end if;

  select * into card
    from srs_cards
   where student_id = new.student_id and question_id = new.question_id;

  if not found then
    card.ease := 2.50;
    card.interval_days := 0;
    card.repetitions := 0;
    card.lapses := 0;
  end if;

  if new.is_correct then
    new_reps := card.repetitions + 1;
    new_ease := least(card.ease + 0.10, 3.00);
    new_int  := case
                  when new_reps = 1 then 1
                  when new_reps = 2 then 3
                  else greatest(1, round(card.interval_days * new_ease)::int)
                end;
  else
    new_reps := 0;
    new_ease := greatest(card.ease - 0.20, 1.30);
    new_int  := 0;   -- vuelve a entrar hoy mismo
  end if;

  insert into srs_cards (
    student_id, question_id, ease, interval_days, repetitions, lapses,
    due_at, last_result, last_seen_at
  )
  values (
    new.student_id, new.question_id, new_ease, new_int, new_reps,
    card.lapses + (case when new.is_correct then 0 else 1 end),
    now() + make_interval(days => new_int),
    new.is_correct, now()
  )
  on conflict (student_id, question_id) do update
    set ease          = excluded.ease,
        interval_days = excluded.interval_days,
        repetitions   = excluded.repetitions,
        lapses        = excluded.lapses,
        due_at        = excluded.due_at,
        last_result   = excluded.last_result,
        last_seen_at  = excluded.last_seen_at;

  return new;
end;
$$;

create trigger test_answers_srs
  after insert or update of is_correct on test_answers
  for each row execute function update_srs_card();
