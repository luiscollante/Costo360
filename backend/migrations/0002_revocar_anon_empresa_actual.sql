-- Costo360 — Ajuste post-aplicación, 2026-08-26/27
-- El linter de seguridad de Supabase (get_advisors), corrido inmediatamente después de
-- aplicar 0001_esquema_multitenant.sql, marcó que empresa_actual() era invocable
-- públicamente vía /rest/v1/rpc/empresa_actual, incluso sin sesión iniciada (anon).
-- No era una fuga de datos real (auth.uid() es NULL sin JWT, así que devuelve NULL),
-- pero se revoca por buena práctica: solo el rol `authenticated` necesita ejecutarla
-- (la usan las políticas RLS al resolver la empresa del usuario que ya inició sesión).
--
-- Queda una advertencia restante y esperada: "authenticated puede ejecutar la función" —
-- es intencional, no un hallazgo nuevo. Revocarla también rompería el mecanismo de RLS
-- para cualquier usuario con sesión iniciada, así que se deja así a propósito.

revoke execute on function public.empresa_actual() from anon;
revoke execute on function public.empresa_actual() from public;
grant execute on function public.empresa_actual() to authenticated;
