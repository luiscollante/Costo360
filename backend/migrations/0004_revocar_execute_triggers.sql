-- ============================================================================
-- Costo360 — Fase 2.A: cerrar EXECUTE de las funciones de disparador
--
-- Creado: 2026-08-27, ciclo /goal Fase 2.A, bloque B1.
--
-- El linter de seguridad de Supabase (get_advisors), corrido tras aplicar
-- 0003_aprovisionamiento_sesion.sql, marcó que `handle_new_user()` y
-- `usuarios_cupo_check()` quedaban invocables vía /rest/v1/rpc/... por `anon` y
-- `authenticated`. Son funciones de DISPARADOR puras: los triggers las ejecutan
-- con derechos de definidor sin importar el ACL, así que nadie necesita EXECUTE
-- directo sobre ellas. Se revoca de PUBLIC (cubre anon + authenticated) para que
-- no sean parte de la API expuesta.
--
-- `empresa_actual()` NO se toca aquí: las políticas RLS la invocan evaluadas como
-- el rol que consulta, así que `authenticated` SÍ necesita EXECUTE sobre ella
-- (ver comentario de 0002_revocar_anon_empresa_actual.sql — esa advertencia del
-- linter es intencional y ya documentada).
-- ============================================================================

revoke execute on function public.handle_new_user()   from public, anon, authenticated;
revoke execute on function public.usuarios_cupo_check() from public, anon, authenticated;
