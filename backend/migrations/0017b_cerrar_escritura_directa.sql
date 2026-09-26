-- 0017b — Cierra la escritura directa por PostgREST (paso 2 de 2)
--
-- REQUISITO: 0017a aplicada Y backend desplegado con `set local role
-- cost_servidor` (db/client.py). Si se aplica antes, todas las escrituras de la
-- app fallan. Ver cabecera de 0017a.
--
-- Después de esta migración, `authenticated` y `anon` solo pueden LEER (según
-- RLS); cualquier cambio de datos pasa por FastAPI, que es donde viven las
-- reglas de rol y las validaciones.

begin;

-- 1. Snapshots de "deshacer" previos: pudieron fabricarse mientras la tabla era
--    escribible por PostgREST. Se invalidan (no se borran: quedan como registro).
update public.agente_historial_acciones
   set es_deshacible = false
 where es_deshacible;

-- 2. Propuestas pendientes previas: mismo motivo — no se confirma nada creado
--    antes del cierre.
update public.agente_acciones_pendientes
   set estado = 'expirada'
 where estado = 'pendiente';

-- 3. Sin escritura directa en ninguna tabla de public.
revoke insert, update, delete, truncate on all tables in schema public
    from authenticated, anon, public;
revoke usage, update on all sequences in schema public
    from authenticated, anon, public;

-- 4. Tablas futuras creadas por postgres nacen cerradas.
alter default privileges for role postgres in schema public
    revoke insert, update, delete, truncate on tables from authenticated, anon;
alter default privileges for role postgres in schema public
    revoke usage, update on sequences from authenticated, anon;

-- 5. Storage: el backend usa service_role (services/storage_service.py), así que
--    las policies de usuario de 0011 sobran y permitían subir/borrar archivos
--    directamente.
drop policy if exists render_material_referencias_rls on storage.objects;
drop policy if exists render_cliente_fotos_rls on storage.objects;
drop policy if exists render_generados_rls on storage.objects;

commit;
