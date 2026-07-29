-- ===========================================================================
-- 0007_rls.sql — Row Level Security
--
-- Regla general del sistema:
--   · Un alumno sólo ve sus propios datos.
--   · El staff sólo ve datos de SU autoescuela (aislamiento multi-tenant).
--   · El contenido global (temario, banco base, señales) es de sólo lectura
--     para todo usuario autenticado.
--
-- Todas las tablas llevan RLS activo. Sin política que lo permita, no se pasa.
-- ===========================================================================

alter table schools             enable row level security;
alter table profiles            enable row level security;
alter table audit_log           enable row level security;
alter table topics              enable row level security;
alter table questions           enable row level security;
alter table road_signals        enable row level security;
alter table study_materials     enable row level security;
alter table question_imports    enable row level security;
alter table test_templates      enable row level security;
alter table assignments         enable row level security;
alter table test_sessions       enable row level security;
alter table test_answers        enable row level security;
alter table srs_cards           enable row level security;
alter table conversations       enable row level security;
alter table messages            enable row level security;
alter table ai_usage            enable row level security;
alter table notifications       enable row level security;
alter table announcements       enable row level security;
alter table vehicles            enable row level security;
alter table lessons             enable row level security;
alter table exams               enable row level security;
alter table payments            enable row level security;
alter table student_documents   enable row level security;
alter table student_groups      enable row level security;
alter table group_members       enable row level security;
alter table achievements        enable row level security;
alter table student_achievements enable row level security;
alter table student_stats       enable row level security;

-- ---------------------------------------------------------------------------
-- schools
-- ---------------------------------------------------------------------------
create policy "ver mi autoescuela" on schools
  for select to authenticated
  using (id = auth_school_id());

create policy "admin edita su autoescuela" on schools
  for update to authenticated
  using (id = auth_school_id() and is_admin())
  with check (id = auth_school_id() and is_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "ver mi perfil" on profiles
  for select to authenticated
  using (id = auth.uid());

create policy "staff ve los perfiles de su autoescuela" on profiles
  for select to authenticated
  using (school_id = auth_school_id() and is_staff());

create policy "editar mi perfil" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admin gestiona perfiles de su autoescuela" on profiles
  for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

-- Un usuario no puede cambiarse a sí mismo el rol ni saltar de autoescuela.
-- La política UPDATE no distingue columnas, así que lo cierra un trigger.
create or replace function guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;   -- un admin sí puede cambiar roles dentro de su autoescuela
  end if;

  if new.role is distinct from old.role then
    raise exception 'No puedes modificar tu propio rol';
  end if;

  -- Vincularse por primera vez a una autoescuela sí está permitido: es lo que
  -- hace la pantalla de alta cuando el alumno introduce el código. Lo que se
  -- bloquea es SALTAR de una autoescuela a otra.
  if old.school_id is not null and new.school_id is distinct from old.school_id then
    raise exception 'No puedes cambiar de autoescuela';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Sólo la autoescuela puede cambiar tu estado';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on profiles
  for each row execute function guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Contenido global de sólo lectura
-- ---------------------------------------------------------------------------
create policy "temario visible" on topics
  for select to authenticated using (true);

create policy "señales visibles" on road_signals
  for select to authenticated using (true);

create policy "logros visibles" on achievements
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- questions — banco global (school_id NULL) + banco propio de la autoescuela
-- ---------------------------------------------------------------------------
create policy "leer preguntas publicadas" on questions
  for select to authenticated
  using (
    status = 'published'
    and (school_id is null or school_id = auth_school_id())
  );

create policy "staff ve todo su banco" on questions
  for select to authenticated
  using (school_id = auth_school_id() and is_staff());

create policy "staff gestiona su banco" on questions
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------------------------------------------------------------------------
-- study_materials
-- ---------------------------------------------------------------------------
create policy "leer material" on study_materials
  for select to authenticated
  using (is_published and (school_id is null or school_id = auth_school_id()));

create policy "staff gestiona material" on study_materials
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------------------------------------------------------------------------
-- question_imports
-- ---------------------------------------------------------------------------
create policy "staff gestiona importaciones" on question_imports
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------------------------------------------------------------------------
-- test_templates — plantillas del sistema + las de la autoescuela
-- ---------------------------------------------------------------------------
create policy "leer plantillas" on test_templates
  for select to authenticated
  using (is_active and (school_id is null or school_id = auth_school_id()));

create policy "staff gestiona sus plantillas" on test_templates
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------------
create policy "alumno ve sus asignaciones" on assignments
  for select to authenticated
  using (student_id = auth.uid());

create policy "alumno avanza su asignación" on assignments
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "staff gestiona asignaciones" on assignments
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------------------------------------------------------------------------
-- test_sessions / test_answers / srs_cards
-- ---------------------------------------------------------------------------
create policy "alumno gestiona sus sesiones" on test_sessions
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "staff ve sesiones de su autoescuela" on test_sessions
  for select to authenticated
  using (school_id = auth_school_id() and is_staff());

create policy "alumno gestiona sus respuestas" on test_answers
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "staff ve respuestas de su autoescuela" on test_answers
  for select to authenticated
  using (
    exists (
      select 1 from test_sessions s
       where s.id = test_answers.session_id
         and s.school_id = auth_school_id()
    ) and is_staff()
  );

create policy "alumno gestiona su repaso" on srs_cards
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- conversations / messages
-- ---------------------------------------------------------------------------
create policy "alumno ve sus conversaciones" on conversations
  for select to authenticated
  using (student_id = auth.uid());

create policy "alumno abre conversación" on conversations
  for insert to authenticated
  with check (student_id = auth.uid() and school_id = auth_school_id());

create policy "alumno actualiza su conversación" on conversations
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "staff gestiona conversaciones" on conversations
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

create policy "leer mensajes de mis conversaciones" on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
       where c.id = messages.conversation_id
         and (c.student_id = auth.uid() or (c.school_id = auth_school_id() and is_staff()))
    )
  );

create policy "escribir en mis conversaciones" on messages
  for insert to authenticated
  with check (
    exists (
      select 1 from conversations c
       where c.id = messages.conversation_id
         and (c.student_id = auth.uid() or (c.school_id = auth_school_id() and is_staff()))
    )
    -- El remitente sólo puede firmar como él mismo; los mensajes de la IA los
    -- inserta la Edge Function con la service-role key, que salta RLS.
    and (sender_id = auth.uid() or sender_id is null)
    and author <> 'ai'
  );

create policy "marcar mensajes como leídos" on messages
  for update to authenticated
  using (
    exists (
      select 1 from conversations c
       where c.id = messages.conversation_id
         and (c.student_id = auth.uid() or (c.school_id = auth_school_id() and is_staff()))
    )
  );

-- ---------------------------------------------------------------------------
-- ai_usage — sólo lectura para el interesado; escribe la Edge Function
-- ---------------------------------------------------------------------------
create policy "ver mi consumo de IA" on ai_usage
  for select to authenticated
  using (student_id = auth.uid() or (school_id = auth_school_id() and is_admin()));

-- ---------------------------------------------------------------------------
-- notifications / announcements
-- ---------------------------------------------------------------------------
create policy "ver mis notificaciones" on notifications
  for select to authenticated using (user_id = auth.uid());

create policy "marcar mis notificaciones" on notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "staff crea notificaciones" on notifications
  for insert to authenticated
  with check (school_id = auth_school_id() and is_staff());

create policy "leer anuncios" on announcements
  for select to authenticated
  using (
    school_id = auth_school_id()
    and publish_at <= now()
    and (expires_at is null or expires_at > now())
    and (audience = 'all' or (audience = 'students' and not is_staff()) or (audience = 'staff' and is_staff()))
  );

create policy "staff gestiona anuncios" on announcements
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------------------------------------------------------------------------
-- Gestión de autoescuela
-- ---------------------------------------------------------------------------
create policy "ver vehículos de mi autoescuela" on vehicles
  for select to authenticated using (school_id = auth_school_id());

create policy "staff gestiona vehículos" on vehicles
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

create policy "alumno ve sus clases" on lessons
  for select to authenticated using (student_id = auth.uid());

create policy "instructor ve sus clases" on lessons
  for select to authenticated
  using (instructor_id = auth.uid());

create policy "staff gestiona clases" on lessons
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

create policy "alumno ve sus exámenes" on exams
  for select to authenticated using (student_id = auth.uid());

create policy "staff gestiona exámenes" on exams
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

create policy "alumno ve sus pagos" on payments
  for select to authenticated using (student_id = auth.uid());

create policy "admin gestiona pagos" on payments
  for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

create policy "alumno ve sus documentos" on student_documents
  for select to authenticated using (student_id = auth.uid());

create policy "staff gestiona documentos" on student_documents
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

create policy "ver grupos de mi autoescuela" on student_groups
  for select to authenticated using (school_id = auth_school_id());

create policy "staff gestiona grupos" on student_groups
  for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

create policy "ver mis grupos" on group_members
  for select to authenticated
  using (student_id = auth.uid() or is_staff());

create policy "staff gestiona miembros" on group_members
  for all to authenticated
  using (is_staff() and exists (
    select 1 from student_groups g
     where g.id = group_members.group_id and g.school_id = auth_school_id()
  ))
  with check (is_staff() and exists (
    select 1 from student_groups g
     where g.id = group_members.group_id and g.school_id = auth_school_id()
  ));

-- ---------------------------------------------------------------------------
-- Gamificación
-- ---------------------------------------------------------------------------
create policy "ver mis logros" on student_achievements
  for select to authenticated
  using (student_id = auth.uid() or is_staff());

create policy "ver mis estadísticas" on student_stats
  for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from profiles p
       where p.id = student_stats.student_id
         and p.school_id = auth_school_id()
    ) and is_staff()
  );

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create policy "admin lee auditoría" on audit_log
  for select to authenticated
  using (school_id = auth_school_id() and is_admin());

create policy "staff escribe auditoría" on audit_log
  for insert to authenticated
  with check (school_id = auth_school_id() and is_staff());
