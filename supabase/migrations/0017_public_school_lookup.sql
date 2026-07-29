-- ===========================================================================
-- 0017_public_school_lookup.sql — Permite validar el código de autoescuela
-- en el alta de un alumno, antes de que exista sesión (rol anon).
--
-- Sin esta política, el formulario de registro (Login.tsx) nunca encuentra
-- ninguna autoescuela: la única política de "schools" exigía `to authenticated`,
-- pero en el alta el usuario todavía no lo está.
-- ===========================================================================

create policy "codigo publico para alta" on schools
  for select to anon
  using (is_active is true);
