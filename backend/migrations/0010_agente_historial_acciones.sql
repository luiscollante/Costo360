-- ============================================================================
-- Costo360 — Objetivo 5, Ciclo 3: bitácora de acciones del Agente de IA +
-- "Centro del Agente" (deshacer, modo BI con exportación).
--
-- Plan validado por 2 rondas de Software Architect + Security Engineer;
-- decisiones del fundador (2026-09-06/09):
--   1. Bitácora aislada por usuario (nadie ve la de otro, ni admin/gerencia
--      por defecto — el "modo BI" del punto 4 accede agregado, nunca fila
--      por fila, vía `db_service` + `puede_pedir_datos_agregados_agente`).
--   4. El modo BI (agregados + exportación CSV) usa el MISMO permiso que ya
--      existía para esto en `roles_catalogo` (`puede_pedir_datos_agregados_agente`,
--      migración 0001) — nunca se creó un permiso nuevo.
--
-- Depende de: 0001..0009 (ya aplicadas).
--
-- Qué hace este archivo:
--   Tabla `agente_historial_acciones` — registro INMUTABLE (salvo el propio
--   deshacer) de cada acción que el Agente EJECUTÓ de verdad, sin importar
--   si llegó ahí vía `confirmations.py::confirmar_propuesta` (el camino
--   normal, dos fases) o vía uno de los 3 handlers de escritura directa que
--   ya existían antes de este ciclo (`proyectos_crear_tarea`,
--   `catalogo_crear_material` en su rama de material genuinamente nuevo,
--   `cotizacion_cambiar_estado` para Pendiente/Rechazada/Borrador). Ambos
--   caminos insertan aquí CON LA MISMA CONEXIÓN de la transacción que hizo
--   la escritura real — nunca en un `commit()` aparte — para que la fila de
--   bitácora y la escritura de negocio vivan o mueran juntas.
--
--   `es_deshacible` marca solo las acciones que son una EDICIÓN de un campo
--   ya existente (nunca un alta ni un borrado): la fila ya trae el valor
--   "antes" en `filas_afectadas`, así que deshacer es re-aplicar ese valor
--   con la misma función de servicio, nunca una reconstrucción a mano.
--
--   `deshecha_en`/`deshecha_por`: patrón idéntico al de
--   `agente_acciones_pendientes` (0009) — un `UPDATE ... WHERE deshecha_en
--   IS NULL RETURNING` atómico es la única forma de reclamar el deshacer,
--   así que un doble clic nunca deshace dos veces.
-- ============================================================================

create table public.agente_historial_acciones (
    id              uuid primary key default gen_random_uuid(),
    empresa_id      uuid not null references public.empresas(id) on delete cascade,
    usuario_id      uuid not null references public.usuarios(id) on delete cascade,
    herramienta     text not null,
    payload         jsonb not null default '{}'::jsonb,
    filas_afectadas jsonb not null default '[]'::jsonb,
    es_deshacible   boolean not null default false,
    creado_en       timestamptz not null default now(),
    deshecha_en     timestamptz,
    deshecha_por    uuid references public.usuarios(id),
    check ((deshecha_en is null) = (deshecha_por is null)),
    check (deshecha_en is null or es_deshacible)
);

-- Listado de "mi bitácora", más reciente primero — el patrón de acceso único
-- de la pantalla del Centro del Agente.
create index idx_agente_historial_usuario
    on public.agente_historial_acciones (usuario_id, creado_en desc);
-- Para el modo BI agregado (`db_service`, bypassa RLS a propósito): agrupa
-- por empresa sin necesitar un seq scan de toda la tabla.
create index idx_agente_historial_empresa
    on public.agente_historial_acciones (empresa_id, creado_en desc);

-- ============================================================
-- ROW LEVEL SECURITY — aísla por empresa Y por usuario, igual que 0009.
-- El modo BI agregado NUNCA lee esta tabla bajo RLS: usa `db_service`
-- (rol con BYPASSRLS) desde un endpoint que ya valida en Python
-- `puede_pedir_datos_agregados_agente` antes de tocarla, y solo devuelve
-- agregados con umbral mínimo de filas — nunca una fila individual.
-- ============================================================
alter table public.agente_historial_acciones enable row level security;
alter table public.agente_historial_acciones force  row level security;

create policy agente_historial_own on public.agente_historial_acciones for all to authenticated
    using      (empresa_id = (select public.empresa_actual()) and usuario_id = (select auth.uid()))
    with check (empresa_id = (select public.empresa_actual()) and usuario_id = (select auth.uid()));

grant select, insert, update, delete on public.agente_historial_acciones to authenticated;
