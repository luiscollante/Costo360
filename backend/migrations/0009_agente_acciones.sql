-- ============================================================================
-- Costo360 — Objetivo 5, Ciclo 1: motor del Agente de IA (piloto en Proyectos)
--
-- Creado: 2026-09-04, dentro del ciclo /goal del Objetivo 5. Plan validado por
-- 3 planificadores (AI Engineer, Software Architect, Product Manager) y
-- auditado en 2 rondas por Security Engineer + Database Optimizer + UX
-- Architect — la primera ronda de Security Engineer devolvió NO APRUEBA por
-- 3 bloqueantes; esta tabla ya incorpora esa corrección, reverificada y
-- aprobada por una segunda pasada del mismo especialista.
--
-- Depende de: 0001..0008 (ya aplicadas).
--
-- Qué hace este archivo:
--   Tabla `agente_acciones_pendientes` — el mecanismo de "proponer → confirmar"
--   antes de cualquier acción destructiva del agente. El modelo de IA SOLO
--   puede insertar filas aquí (vía la variante `_preparar` de un tool); nunca
--   puede confirmarlas ni ejecutarlas — eso es un endpoint HTTP separado,
--   invocado directamente por el frontend cuando el usuario pulsa "Confirmar",
--   fuera del loop de function-calling del modelo por completo.
--
-- Decisiones de seguridad incorporadas (auditoría Fase 2):
--   - RLS aísla por `usuario_id` ADEMÁS de `empresa_id` (NO el patrón `pm_*`,
--     que solo aísla por empresa) — ningún usuario, ni siquiera admin/gerencia,
--     puede ver/confirmar/descartar la propuesta de otro. Una futura capacidad
--     de "supervisión" se resolvería con `db_service` + chequeo de permiso en
--     Python, nunca ensanchando esta policy.
--   - `estado` con CHECK explícito (patrón `pm_projects`/`pm_tasks`), no texto
--     libre validado solo en la aplicación.
--   - `filas_afectadas` en columna propia, separada de `payload`: `payload` es
--     entrada NO confiable (argumentos del tool-call del LLM); `filas_afectadas`
--     es el snapshot que el backend leyó y verificó al proponer la acción.
--     Al confirmar, el backend vuelve a leer y comparar contra este snapshot
--     (mitiga condición de carrera "TOCTOU" entre proponer y confirmar).
--   - Índice parcial por `expira_en` para que la resolución perezosa de
--     propuestas vencidas (al listar/confirmar, mismo patrón que
--     `sesion_activa`/heartbeat) no requiera un seq scan.
-- ============================================================================

create table public.agente_acciones_pendientes (
    id              uuid primary key default gen_random_uuid(),
    empresa_id      uuid not null references public.empresas(id) on delete cascade,
    usuario_id      uuid not null references public.usuarios(id) on delete cascade,
    herramienta     text not null,
    payload         jsonb not null,
    filas_afectadas jsonb not null default '[]'::jsonb,
    es_destructiva  boolean not null,
    estado          text not null default 'pendiente'
                    check (estado in ('pendiente','confirmada','descartada','expirada')),
    creado_en       timestamptz not null default now(),
    expira_en       timestamptz not null,
    unique (id, empresa_id)
);

create index idx_agente_acciones_empresa_estado
    on public.agente_acciones_pendientes (empresa_id, estado);
create index idx_agente_acciones_usuario
    on public.agente_acciones_pendientes (usuario_id, estado);
-- El más importante para la resolución perezosa de expiración: sin este
-- índice parcial, cualquier chequeo de "¿hay algo vencido?" hace seq scan
-- sobre toda la tabla a medida que crece.
create index idx_agente_acciones_expira
    on public.agente_acciones_pendientes (expira_en)
    where estado = 'pendiente';

-- ============================================================
-- ROW LEVEL SECURITY — aísla por empresa Y por usuario (no el patrón pm_*)
-- ============================================================
alter table public.agente_acciones_pendientes enable row level security;
alter table public.agente_acciones_pendientes force  row level security;

create policy agente_acciones_own on public.agente_acciones_pendientes for all to authenticated
    using      (empresa_id = (select public.empresa_actual()) and usuario_id = (select auth.uid()))
    with check (empresa_id = (select public.empresa_actual()) and usuario_id = (select auth.uid()));

grant select, insert, update, delete on public.agente_acciones_pendientes to authenticated;
