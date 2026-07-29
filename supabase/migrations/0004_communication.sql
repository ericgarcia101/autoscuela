-- ===========================================================================
-- 0004_communication.sql — Chat alumno↔autoescuela, tutor IA, notificaciones
-- ===========================================================================

create type conversation_kind as enum ('support', 'ai_tutor', 'group');
create type message_author as enum ('student', 'staff', 'ai', 'system');

-- ---------------------------------------------------------------------------
-- Conversaciones
--   support  -> alumno con la autoescuela (Realtime, con acuse de lectura)
--   ai_tutor -> alumno con el tutor de IA
--   group    -> canal de grupo/clase
-- ---------------------------------------------------------------------------
create table conversations (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references schools(id) on delete cascade,
  kind           conversation_kind not null default 'support',
  student_id     uuid references profiles(id) on delete cascade,
  title          text,
  -- Contexto que el tutor IA arrastra (tema, test fallado, pregunta concreta)
  context        jsonb not null default '{}'::jsonb,

  last_message_at   timestamptz not null default now(),
  last_message_text text,
  unread_for_student int not null default 0,
  unread_for_staff   int not null default 0,

  is_archived    boolean not null default false,
  created_at     timestamptz not null default now()
);

create index conversations_student_idx on conversations (student_id, last_message_at desc);
create index conversations_school_idx  on conversations (school_id, kind, last_message_at desc);

-- Un alumno tiene como mucho una conversación de soporte y una de tutor IA
create unique index conversations_unique_support
  on conversations (student_id, kind)
  where kind in ('support', 'ai_tutor') and not is_archived;

-- ---------------------------------------------------------------------------
-- Mensajes
-- ---------------------------------------------------------------------------
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid references profiles(id) on delete set null,  -- NULL si es la IA
  author          message_author not null default 'student',
  body            text not null,
  attachments     jsonb not null default '[]'::jsonb,
  -- Fuentes citadas por el tutor IA (preguntas / artículos usados)
  citations       jsonb not null default '[]'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at desc);

-- Mantiene el resumen de la conversación y los contadores de no leídos
create or replace function bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
     set last_message_at   = new.created_at,
         last_message_text = left(new.body, 180),
         unread_for_student = case
           when new.author in ('staff', 'ai') then unread_for_student + 1
           else unread_for_student end,
         unread_for_staff = case
           when new.author = 'student' then unread_for_staff + 1
           else unread_for_staff end
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on messages
  for each row execute function bump_conversation();

-- ---------------------------------------------------------------------------
-- Uso de IA — control de cuota para que el coste nunca se dispare
-- ---------------------------------------------------------------------------
create table ai_usage (
  id           bigserial primary key,
  school_id    uuid references schools(id) on delete cascade,
  student_id   uuid references profiles(id) on delete cascade,
  provider     text not null,
  model        text,
  kind         text not null default 'chat',   -- chat | explain | generate | plan
  tokens_in    int not null default 0,
  tokens_out   int not null default 0,
  latency_ms   int,
  fallback_used boolean not null default false, -- true si respondió el motor local
  created_at   timestamptz not null default now()
);

create index ai_usage_school_idx  on ai_usage (school_id, created_at desc);
create index ai_usage_student_day on ai_usage (student_id, created_at desc);

-- Cuota diaria por alumno (la Edge Function la consulta antes de llamar al LLM)
create or replace function ai_quota_remaining(p_student uuid, p_daily_limit int default 40)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    p_daily_limit - (
      select count(*)::int
        from ai_usage
       where student_id = p_student
         and created_at >= date_trunc('day', now())
         and not fallback_used
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Notificaciones internas
-- ---------------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid references schools(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null default 'info',   -- info | assignment | message | lesson | achievement
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Tablón de anuncios de la autoescuela
-- ---------------------------------------------------------------------------
create table announcements (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  title       text not null,
  body        text not null,
  pinned      boolean not null default false,
  audience    text not null default 'all',    -- all | students | staff
  publish_at  timestamptz not null default now(),
  expires_at  timestamptz,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index announcements_school_idx on announcements (school_id, publish_at desc);

-- Publica el chat en Realtime para que el admin y el alumno se vean en vivo
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table notifications;
