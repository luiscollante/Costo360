-- 0017a — Rol exclusivo del servidor (paso 1 de 2, SOLO AGREGA permisos)
--
-- Hueco que cierra (2026-09-25): el frontend solo usa supabase.auth, pero la
-- anon key es pública; todo lo que `authenticated` puede escribir por grants+RLS
-- era escribible vía PostgREST saltándose las reglas de FastAPI (roles,
-- validaciones, confirmación de Cost). La solución: el backend deja de actuar
-- como `authenticated` y pasa a `cost_servidor`, un rol que PostgREST no puede
-- asumir (authenticated NO es miembro de él).
--
-- Orden de despliegue (obligatorio):
--   1. aplicar ESTA migración (aditiva: nada deja de funcionar);
--   2. desplegar el backend que hace `set local role cost_servidor`;
--   3. aplicar 0017b (revoca la escritura a authenticated/anon).
--
-- cost_servidor es miembro de authenticated → hereda SELECT/EXECUTE/USAGE y
-- las policies `TO authenticated` le aplican sin tocarlas (is_member_of_role).
-- NO usar NOINHERIT: el SELECT heredado depende de INHERIT.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'cost_servidor') then
        create role cost_servidor nologin;
    end if;
end $$;

grant authenticated to cost_servidor;
grant cost_servidor to postgres;

-- Copia a cost_servidor los privilegios de escritura que hoy tiene authenticated
-- en cada tabla de public (se revocarán a authenticated en 0017b).
do $$
declare r record;
begin
    for r in
        select table_name, string_agg(privilege_type, ', ') as privs
        from information_schema.role_table_grants
        where table_schema = 'public'
          and grantee = 'authenticated'
          and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
        group by table_name
    loop
        execute format('grant %s on public.%I to cost_servidor', r.privs, r.table_name);
    end loop;
end $$;

grant usage, select, update on all sequences in schema public to cost_servidor;

-- Tablas futuras creadas por postgres: escritura solo para cost_servidor.
alter default privileges for role postgres in schema public
    grant select, insert, update, delete on tables to cost_servidor;
alter default privileges for role postgres in schema public
    grant usage, select, update on sequences to cost_servidor;
