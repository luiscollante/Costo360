-- ============================================================================
-- Costo360 — Objetivo 6 / Fase 2.D: endurecimiento del módulo de gestión de
-- proyectos tras la auditoría de la Fase 5 del Ciclo A.
--
-- Creado: 2026-09-02. Todos los hallazgos de la Fase 5 son de severidad baja/
-- media y NO bloqueantes; se agrupan aquí. Referencias: DBO-Hn = Database
-- Optimizer, CR#n = Code Reviewer, BA#n = Backend Architect.
--
-- Depende de: 0007_gestion_proyectos.sql.
--
--   1. `pm_projects.completado_en` — reloj del archivado automático (DBO-H2 /
--      CR#7). El backend lo fija al pasar a 'completado'; el barrido lo usa en
--      vez de `updated_at`, que `_recalc_progreso` o el paso "en_riesgo" mueven.
--   2. Escala fija en las columnas de horas (DBO-H1) — consistencia con 0001.
--   3. `pm_tasks.milestone_id` → FK COMPUESTA con `on delete set null
--      (milestone_id)` (PG15+, aquí PG17): recupera el aislamiento estructural
--      de tenant en el enlace al hito sin bloquear el borrado del hito (DBO-H3).
--   4. Índices para los `ORDER BY`/`WHERE` reales de los listados y del barrido
--      (DBO-H4/H5/H7, BA#5); se quita `idx_pm_projects_empresa_archivado`
--      (booleano de baja cardinalidad ya cubierto por el de `estado`, DBO-H6).
--
-- Se aplica de forma transaccional por apply_migration.
-- ============================================================================

-- 1. completado_en
alter table public.pm_projects add column if not exists completado_en timestamptz;
-- Backfill best-effort para proyectos ya completados (no hay ninguno hoy).
update public.pm_projects set completado_en = updated_at
    where estado = 'completado' and completado_en is null;

-- 2. Escala de horas (numeric(7,2): hasta 99999.99 h)
alter table public.pm_time_entries alter column horas type numeric(7,2);
alter table public.pm_tasks        alter column horas_estimadas type numeric(7,2);

-- 3. milestone_id → FK compuesta (id, empresa_id) con SET NULL solo de milestone_id
alter table public.pm_tasks drop constraint if exists pm_tasks_milestone_id_fkey;
alter table public.pm_tasks
    add constraint pm_tasks_milestone_fk
    foreign key (milestone_id, empresa_id)
    references public.pm_milestones (id, empresa_id)
    on delete set null (milestone_id);

-- 4. Índices
drop index if exists public.idx_pm_projects_empresa_archivado;

create index if not exists idx_pm_projects_empresa_updated
    on public.pm_projects (empresa_id, updated_at desc);
create index if not exists idx_pm_projects_empresa_fechafin
    on public.pm_projects (empresa_id, fecha_fin) where fecha_fin is not null;

create index if not exists idx_pm_tasks_empresa_estado
    on public.pm_tasks (empresa_id, estado);
create index if not exists idx_pm_tasks_empresa_fechalimite
    on public.pm_tasks (empresa_id, fecha_limite) where fecha_limite is not null;

-- Reemplaza idx_pm_tasks_empresa_milestone: el lookup real (SET NULL al borrar un
-- hito, y el join de la sentencia 1 del barrido) va por milestone_id como líder.
drop index if exists public.idx_pm_tasks_empresa_milestone;
create index if not exists idx_pm_tasks_milestone_empresa
    on public.pm_tasks (milestone_id, empresa_id) where milestone_id is not null;

create index if not exists idx_pm_milestones_empresa_fechalimite
    on public.pm_milestones (empresa_id, fecha_limite) where fecha_limite is not null;
