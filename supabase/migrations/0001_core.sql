-- ===========================================================================
-- 0001_core.sql — Extensiones, multi-tenancy, perfiles y helpers de seguridad
-- ===========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enumerados
-- ---------------------------------------------------------------------------
create type user_role as enum ('student', 'instructor', 'admin', 'owner');

create type license_class as enum (
  'AM', 'A1', 'A2', 'A', 'B', 'B96', 'BE', 'C1', 'C1E', 'C', 'CE',
  'D1', 'D1E', 'D', 'DE', 'BTP', 'LCC'
);

create type student_status as enum (
  'lead',        -- interesado, aún no matriculado
  'enrolled',    -- matriculado, estudiando teórico
  'theory_pass', -- teórico aprobado
  'practical',   -- en fase de prácticas
  'graduated',   -- permiso obtenido
  'paused',      -- inactivo temporalmente
  'dropped'      -- baja
);

create type subscription_plan as enum ('trial', 'basic', 'pro', 'enterprise');

-- ---------------------------------------------------------------------------
-- Autoescuelas (tenant raíz)
-- ---------------------------------------------------------------------------
create table schools (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  tax_id         text,                       -- CIF/NIF
  email          text,
  phone          text,
  address        text,
  city           text,
  postal_code    text,
  province       text,
  logo_url       text,
  brand_color    text default '#1c5cf5',
  plan           subscription_plan not null default 'trial',
  seat_limit     int not null default 25,    -- alumnos activos incluidos en el plan
  trial_ends_at  timestamptz default (now() + interval '30 days'),
  settings       jsonb not null default '{}'::jsonb,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table schools is 'Cada autoescuela es un tenant aislado por RLS.';

-- ---------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  school_id     uuid references schools(id) on delete set null,
  role          user_role not null default 'student',
  full_name     text not null default '',
  email         text,
  phone         text,
  avatar_url    text,
  dni           text,
  birth_date    date,
  locale        text not null default 'es',
  -- Datos específicos del alumno
  target_license license_class not null default 'B',
  status         student_status not null default 'enrolled',
  enrolled_at    timestamptz default now(),
  theory_exam_date date,
  notes          text,                       -- notas internas, sólo staff
  last_seen_at   timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index profiles_school_idx on profiles (school_id) where is_active;
create index profiles_role_idx   on profiles (school_id, role);
create index profiles_name_trgm  on profiles using gin (full_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Helpers de seguridad
-- SECURITY DEFINER para poder leer `profiles` desde dentro de las políticas
-- RLS de `profiles` sin provocar recursión infinita.
-- ---------------------------------------------------------------------------
create or replace function auth_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('instructor', 'admin', 'owner') from profiles where id = auth.uid()),
    false
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'owner') from profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Alta automática de perfil al registrarse
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_school uuid;
  invite_role   user_role;
begin
  -- El código de invitación viaja en raw_user_meta_data al hacer signUp
  invite_school := nullif(new.raw_user_meta_data ->> 'school_id', '')::uuid;
  invite_role   := coalesce(
    nullif(new.raw_user_meta_data ->> 'role', '')::user_role,
    'student'
  );

  -- Sólo se permite auto-asignarse el rol 'student'. Cualquier otro rol debe
  -- concederlo un admin desde el panel: evita escalada de privilegios enviando
  -- metadatos manipulados en el signUp.
  if invite_role <> 'student' then
    invite_role := 'student';
  end if;

  insert into profiles (id, school_id, role, full_name, email)
  values (
    new.id,
    invite_school,
    invite_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger schools_touch  before update on schools
  for each row execute function touch_updated_at();
create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Registro de auditoría (acciones sensibles del staff)
-- ---------------------------------------------------------------------------
create table audit_log (
  id          bigserial primary key,
  school_id   uuid references schools(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  entity      text,
  entity_id   uuid,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_school_idx on audit_log (school_id, created_at desc);
