-- ===========================================================================
-- 0002_content.sql — Temario, banco de preguntas, señales y material de estudio
-- ===========================================================================

create type question_source as enum (
  'normativa',   -- redactada sobre el articulado vigente (banco base de la app)
  'school',      -- aportada por la autoescuela (su propio material con licencia)
  'ai',          -- variante generada por IA a partir de una pregunta madre
  'official'     -- material oficial, sólo si la autoescuela acredita licencia
);

create type question_status as enum ('draft', 'review', 'published', 'retired');

-- ---------------------------------------------------------------------------
-- Temario oficial DGT
-- ---------------------------------------------------------------------------
create table topics (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,          -- 'normas-circulacion'
  name        text not null,
  description text,
  icon        text,
  color       text,
  position    int not null default 0,
  parent_id   uuid references topics(id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table topics is 'Temario común a todas las autoescuelas (contenido global).';

-- ---------------------------------------------------------------------------
-- Banco de preguntas
--
-- school_id NULL  -> pregunta global del banco base, visible para todos.
-- school_id set   -> pregunta privada de esa autoescuela.
-- ---------------------------------------------------------------------------
create table questions (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid references schools(id) on delete cascade,
  topic_id        uuid not null references topics(id) on delete restrict,
  status          question_status not null default 'published',
  source          question_source not null default 'normativa',

  text            text not null,
  options         jsonb not null,            -- ["opción a", "opción b", "opción c"]
  correct_index   int  not null,
  explanation     text not null default '',
  -- Referencia legal: artículo exacto que fundamenta la respuesta.
  -- Es lo que separa un banco defendible de uno inventado.
  legal_ref       text,
  legal_url       text,

  image_url       text,
  image_alt       text,
  video_url       text,

  difficulty      int not null default 2 check (difficulty between 1 and 5),
  licenses        license_class[] not null default '{B}',
  tags            text[] not null default '{}',

  -- Estadística agregada, mantenida por trigger: alimenta el selector adaptativo
  times_answered  int not null default 0,
  times_correct   int not null default 0,

  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint options_is_array   check (jsonb_typeof(options) = 'array'),
  constraint options_min_two    check (jsonb_array_length(options) between 2 and 6),
  constraint correct_in_range   check (correct_index >= 0 and correct_index < jsonb_array_length(options))
);

create index questions_topic_idx    on questions (topic_id) where status = 'published';
create index questions_school_idx   on questions (school_id);
create index questions_licenses_idx on questions using gin (licenses);
create index questions_tags_idx     on questions using gin (tags);
create index questions_text_trgm    on questions using gin (text gin_trgm_ops);
create index questions_difficulty   on questions (difficulty, topic_id);

create trigger questions_touch before update on questions
  for each row execute function touch_updated_at();

-- Índice de dificultad real observada (0 = nadie acierta, 1 = todos aciertan)
create or replace function question_success_rate(q questions)
returns numeric
language sql
immutable
as $$
  select case when q.times_answered = 0 then null
              else round(q.times_correct::numeric / q.times_answered, 4)
         end;
$$;

-- ---------------------------------------------------------------------------
-- Señales de tráfico (catálogo consultable + generador de tests de señales)
-- ---------------------------------------------------------------------------
create type signal_group as enum (
  'advertencia_peligro',
  'reglamentacion_prioridad',
  'reglamentacion_prohibicion',
  'reglamentacion_obligacion',
  'indicacion',
  'orientacion',
  'marcas_viales',
  'senales_agentes',
  'senales_circunstanciales',
  'paneles_complementarios'
);

create table road_signals (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,          -- 'R-101', 'P-1', 'S-13'
  name         text not null,
  signal_group signal_group not null,
  meaning      text not null,
  detail       text,
  legal_ref    text,
  image_url    text,
  shape        text,                          -- triangular, circular, cuadrada...
  color        text,
  created_at   timestamptz not null default now()
);

create index road_signals_group_idx on road_signals (signal_group);

-- ---------------------------------------------------------------------------
-- Material de estudio (apuntes, vídeos, PDFs por tema)
-- ---------------------------------------------------------------------------
create table study_materials (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid references schools(id) on delete cascade,
  topic_id    uuid references topics(id) on delete set null,
  title       text not null,
  kind        text not null default 'article', -- article | pdf | video | link
  content     text,                            -- markdown si kind = article
  url         text,
  duration_min int,
  position    int not null default 0,
  is_published boolean not null default true,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index study_materials_topic_idx on study_materials (topic_id) where is_published;

create trigger study_materials_touch before update on study_materials
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Importaciones de banco propio (CSV / Excel / JSON)
-- ---------------------------------------------------------------------------
create table question_imports (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  filename      text not null,
  total_rows    int not null default 0,
  imported      int not null default 0,
  skipped       int not null default 0,
  errors        jsonb not null default '[]'::jsonb,
  -- Declaración de licencia: la autoescuela confirma que tiene derecho a usar
  -- el material que sube. Queda registrado con fecha y usuario.
  license_ack   boolean not null default false,
  license_note  text,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
