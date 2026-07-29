-- ===========================================================================
-- 0005_academy.sql — Gestión de autoescuela: vehículos, clases prácticas,
--                    exámenes, pagos y documentación del alumno
-- ===========================================================================

create type lesson_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('pending', 'paid', 'overdue', 'refunded', 'cancelled');
create type exam_kind as enum ('theory', 'practical', 'maneuvers');
create type exam_result as enum ('scheduled', 'passed', 'failed', 'absent', 'cancelled');

-- ---------------------------------------------------------------------------
-- Vehículos
-- ---------------------------------------------------------------------------
create table vehicles (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  plate         text not null,
  make          text,
  model         text,
  transmission  text not null default 'manual',   -- manual | automatic
  licenses      license_class[] not null default '{B}',
  itv_due       date,
  insurance_due date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),

  unique (school_id, plate)
);

-- ---------------------------------------------------------------------------
-- Clases prácticas
-- ---------------------------------------------------------------------------
create table lessons (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  student_id    uuid not null references profiles(id) on delete cascade,
  instructor_id uuid references profiles(id) on delete set null,
  vehicle_id    uuid references vehicles(id) on delete set null,

  starts_at     timestamptz not null,
  duration_min  int not null default 45,
  status        lesson_status not null default 'scheduled',
  pickup_point  text,

  -- Evaluación de la clase: alimenta la ficha de progreso del alumno
  rating        int check (rating between 1 and 5),
  skills        jsonb not null default '{}'::jsonb,  -- { "maniobras": 3, "rotondas": 4 }
  instructor_notes text,
  student_visible_notes text,

  price_cents   int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index lessons_student_idx    on lessons (student_id, starts_at desc);
create index lessons_school_day_idx on lessons (school_id, starts_at);
create index lessons_instructor_idx on lessons (instructor_id, starts_at);

create trigger lessons_touch before update on lessons
  for each row execute function touch_updated_at();

-- Evita reservar el mismo instructor o vehículo en horarios solapados
create or replace function check_lesson_overlap()
returns trigger
language plpgsql
as $$
declare
  conflict_count int;
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  select count(*) into conflict_count
    from lessons l
   where l.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
     and l.status in ('scheduled', 'completed')
     and (
       (new.instructor_id is not null and l.instructor_id = new.instructor_id) or
       (new.vehicle_id    is not null and l.vehicle_id    = new.vehicle_id)
     )
     and tstzrange(l.starts_at, l.starts_at + make_interval(mins => l.duration_min))
       && tstzrange(new.starts_at, new.starts_at + make_interval(mins => new.duration_min));

  if conflict_count > 0 then
    raise exception 'El instructor o el vehículo ya tienen una clase en ese horario'
      using errcode = 'exclusion_violation';
  end if;

  return new;
end;
$$;

create trigger lessons_no_overlap
  before insert or update on lessons
  for each row execute function check_lesson_overlap();

-- ---------------------------------------------------------------------------
-- Convocatorias de examen
-- ---------------------------------------------------------------------------
create table exams (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  kind        exam_kind not null,
  license     license_class not null default 'B',
  scheduled_at timestamptz,
  location    text,
  result      exam_result not null default 'scheduled',
  faults      int,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index exams_student_idx on exams (student_id, scheduled_at desc);
create index exams_school_idx  on exams (school_id, scheduled_at desc);

create trigger exams_touch before update on exams
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Cobros / recibos (contabilidad ligera, sin pasarela de pago)
-- ---------------------------------------------------------------------------
create table payments (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  student_id   uuid not null references profiles(id) on delete cascade,
  concept      text not null,
  amount_cents int not null,
  status       payment_status not null default 'pending',
  method       text,                                -- efectivo | transferencia | tarjeta | bizum
  due_date     date,
  paid_at      timestamptz,
  invoice_ref  text,
  notes        text,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index payments_student_idx on payments (student_id, created_at desc);
create index payments_school_idx  on payments (school_id, status, due_date);

create trigger payments_touch before update on payments
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Documentación del alumno (DNI, foto, psicotécnico, solicitud DGT)
-- ---------------------------------------------------------------------------
create table student_documents (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  student_id  uuid not null references profiles(id) on delete cascade,
  kind        text not null,                       -- dni | foto | psicotecnico | solicitud
  name        text not null,
  storage_path text not null,
  expires_at  date,
  verified_at timestamptz,
  verified_by uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index student_documents_student_idx on student_documents (student_id);

-- ---------------------------------------------------------------------------
-- Grupos / clases teóricas
-- ---------------------------------------------------------------------------
create table student_groups (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  name        text not null,
  description text,
  color       text,
  created_at  timestamptz not null default now()
);

create table group_members (
  group_id   uuid not null references student_groups(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, student_id)
);
