-- ============================================================================
-- Costo360 — Objetivo 6 / Fase 2.D: Módulo de gestión de proyectos (Ciclo A)
--
-- Creado: 2026-09-02, dentro del ciclo /goal de la Fase 2.D del roadmap.
-- Plan vivo: docs/PLAN_MODULO_GESTION_PROYECTOS.md (Partes III/IV = fuente de
-- verdad tras la auditoría de la Fase 2 por Security Engineer + UX Architect +
-- Minimal Change Engineer, los tres "aprueba con cambios", cambios incorporados).
--
-- Depende de: 0001..0006 (ya aplicadas en el proyecto `hrmpyhixhbnkkpvxtuit`).
--
-- Reimplementa nativo el prototipo Base44 `gestion-proyectos-nuevo-modulo.zip`
-- (6 entidades → 6 tablas). NO toca motor/cálculos/cotización/legado.
--
-- Qué hace este archivo:
--   1. `pm_touch_updated_at()` — trigger BEFORE UPDATE para mantener `updated_at`.
--   2. 6 tablas `pm_*` (projects, milestones, tasks, time_entries, comments,
--      notifications), todas con `empresa_id NOT NULL` → aislamiento por taller.
--   3. Aislamiento estructural padre-hijo: cada tabla padre lleva un UNIQUE
--      (id, empresa_id) y cada FK hija es COMPUESTA (id_padre, empresa_id) — así
--      es imposible por diseño que una tarea/hito/hora/comentario/notificación
--      cuelgue de un proyecto de OTRA empresa, incluso desde una conexión
--      BYPASSRLS (el barrido diario del Ciclo A-G2). Refuerza el hallazgo S4/S13.
--   4. RLS `enable` + `force` + policy `FOR ALL TO authenticated` sobre
--      `(select public.empresa_actual())` en las 6 (patrón idéntico a 0001/0005),
--      con GRANT de DML a `authenticated` (hallazgo S6 — 0001 no los llevaba).
--   5. `pm_notifications`: índice único parcial (empresa_id, dedupe_key) para la
--      idempotencia del barrido (ON CONFLICT ... WHERE dedupe_key IS NOT NULL).
--   6. `revoke execute` de `pm_touch_updated_at()` (patrón de 0004).
--
-- Decisiones del fundador incorporadas:
--   - D6: rol operativo "ve todo, edita solo lo suyo" → el enforcement jerárquico
--     va en el backend (Ciclo A-G1), no en RLS. RLS solo separa talleres.
--   - D8: `pm_tasks` NO lleva `responsable` de texto libre — solo `responsable_id`
--     (FK a `usuarios`). El nombre visible se deriva por join.
--   - `pm_projects` NO lleva `creado_por` (hallazgo M2: no gatea nada).
--   - `pm_time_entries.user_name` / `pm_comments.autor_nombre` son SNAPSHOT del
--     nombre al momento de crear (para conservar el historial si el usuario se
--     elimina), fijados server-side desde el perfil (hallazgo S3), nunca del body.
--
-- Se aplica de forma transaccional por apply_migration.
-- ============================================================================

-- ============================================================
-- 1. Helper de updated_at
-- ============================================================
create or replace function public.pm_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

revoke execute on function public.pm_touch_updated_at() from public, anon, authenticated;

-- ============================================================
-- 2. pm_projects — un trabajo del taller, después de cotizarlo
-- ============================================================
create table public.pm_projects (
    id             bigint generated always as identity primary key,
    empresa_id     uuid not null references public.empresas(id) on delete cascade,
    nombre         text not null,
    descripcion    text not null default '',
    cliente        text not null default '',
    material       text not null default '',
    estado         text not null default 'activo'
                   check (estado in ('planificacion','activo','en_revision',
                                     'completado','en_pausa','cancelado','archivado')),
    fecha_inicio   date,
    fecha_fin      date,
    progreso_pct   integer not null default 0 check (progreso_pct between 0 and 100),
    tareas_total   integer not null default 0 check (tareas_total >= 0),
    tareas_hechas  integer not null default 0 check (tareas_hechas >= 0),
    archivado      boolean not null default false,
    en_riesgo      boolean not null default false,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    unique (id, empresa_id)   -- destino de las FK compuestas de las tablas hijas
);
create index idx_pm_projects_empresa_estado    on public.pm_projects (empresa_id, estado);
create index idx_pm_projects_empresa_archivado on public.pm_projects (empresa_id, archivado);

create trigger trg_pm_projects_touch
    before update on public.pm_projects
    for each row execute function public.pm_touch_updated_at();

-- ============================================================
-- 3. pm_milestones — hitos (fechas clave) de un proyecto
--    Va antes de pm_tasks por la FK milestone_id.
-- ============================================================
create table public.pm_milestones (
    id           bigint generated always as identity primary key,
    empresa_id   uuid not null references public.empresas(id) on delete cascade,
    project_id   bigint not null,
    titulo       text not null,
    descripcion  text not null default '',
    fecha_inicio date,
    fecha_limite date,
    estado       text not null default 'pendiente'
                 check (estado in ('pendiente','en_progreso','completado')),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    unique (id, empresa_id),
    foreign key (project_id, empresa_id)
        references public.pm_projects(id, empresa_id) on delete cascade
);
create index idx_pm_milestones_empresa_project on public.pm_milestones (empresa_id, project_id);

create trigger trg_pm_milestones_touch
    before update on public.pm_milestones
    for each row execute function public.pm_touch_updated_at();

-- ============================================================
-- 4. pm_tasks — tareas de un proyecto (tablero Kanban)
-- ============================================================
create table public.pm_tasks (
    id              bigint generated always as identity primary key,
    empresa_id      uuid not null references public.empresas(id) on delete cascade,
    project_id      bigint not null,
    titulo          text not null,
    descripcion     text not null default '',
    estado          text not null default 'por_hacer'
                    check (estado in ('bloqueada','por_hacer','en_progreso','revision','completada')),
    prioridad       text not null default 'media'
                    check (prioridad in ('baja','media','alta','urgente')),
    responsable_id  uuid references public.usuarios(id) on delete set null,  -- D8
    fecha_limite    date,
    horas_estimadas numeric check (horas_estimadas is null or horas_estimadas >= 0),
    -- milestone_id: FK simple con ON DELETE SET NULL. NO se hace compuesta con
    -- empresa_id porque un SET NULL multi-columna anularía también empresa_id
    -- (NOT NULL) y bloquearía el borrado del hito. La pertenencia del hito al
    -- mismo proyecto/empresa la valida el backend con un 400 claro (hallazgo S13).
    milestone_id    bigint references public.pm_milestones(id) on delete set null,
    orden           integer not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (id, empresa_id),
    foreign key (project_id, empresa_id)
        references public.pm_projects(id, empresa_id) on delete cascade
);
create index idx_pm_tasks_empresa_project     on public.pm_tasks (empresa_id, project_id);
create index idx_pm_tasks_empresa_milestone   on public.pm_tasks (empresa_id, milestone_id) where milestone_id is not null;
create index idx_pm_tasks_empresa_responsable on public.pm_tasks (empresa_id, responsable_id) where responsable_id is not null;

create trigger trg_pm_tasks_touch
    before update on public.pm_tasks
    for each row execute function public.pm_touch_updated_at();

-- ============================================================
-- 5. pm_time_entries — registro de horas por tarea
-- ============================================================
create table public.pm_time_entries (
    id         bigint generated always as identity primary key,
    empresa_id uuid not null references public.empresas(id) on delete cascade,
    task_id    bigint not null,
    project_id bigint not null,
    usuario_id uuid references public.usuarios(id) on delete set null,
    user_name  text not null default '',   -- snapshot server-side (S3)
    horas      numeric not null check (horas > 0),
    fecha      date not null default current_date,
    nota       text not null default '',
    created_at timestamptz not null default now(),
    foreign key (task_id, empresa_id)
        references public.pm_tasks(id, empresa_id) on delete cascade,
    foreign key (project_id, empresa_id)
        references public.pm_projects(id, empresa_id) on delete cascade
);
create index idx_pm_time_empresa_task    on public.pm_time_entries (empresa_id, task_id);
create index idx_pm_time_empresa_project on public.pm_time_entries (empresa_id, project_id);

-- ============================================================
-- 6. pm_comments — comentarios por tarea
-- ============================================================
create table public.pm_comments (
    id           bigint generated always as identity primary key,
    empresa_id   uuid not null references public.empresas(id) on delete cascade,
    task_id      bigint not null,
    autor_id     uuid references public.usuarios(id) on delete set null,
    autor_nombre text not null default '',   -- snapshot server-side (S3)
    contenido    text not null,
    created_at   timestamptz not null default now(),
    foreign key (task_id, empresa_id)
        references public.pm_tasks(id, empresa_id) on delete cascade
);
create index idx_pm_comments_empresa_task on public.pm_comments (empresa_id, task_id);

-- ============================================================
-- 7. pm_notifications — avisos generados por el barrido diario
-- ============================================================
create table public.pm_notifications (
    id         bigint generated always as identity primary key,
    empresa_id uuid not null references public.empresas(id) on delete cascade,
    titulo     text not null,
    mensaje    text not null default '',
    tipo       text not null default 'recordatorio'
               check (tipo in ('desbloqueo','recordatorio','riesgo')),
    project_id bigint,
    task_id    bigint,
    dedupe_key text,
    leida      boolean not null default false,
    created_at timestamptz not null default now(),
    -- FK compuestas nullable: MATCH SIMPLE omite el chequeo si algún campo es NULL.
    foreign key (project_id, empresa_id)
        references public.pm_projects(id, empresa_id) on delete cascade,
    foreign key (task_id, empresa_id)
        references public.pm_tasks(id, empresa_id) on delete cascade
);
-- Idempotencia del barrido (S5): el INSERT usa
--   ON CONFLICT (empresa_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
create unique index ux_pm_notif_dedupe
    on public.pm_notifications (empresa_id, dedupe_key)
    where dedupe_key is not null;
create index idx_pm_notif_empresa_leida
    on public.pm_notifications (empresa_id, leida, created_at desc);

-- ============================================================
-- 8. ROW LEVEL SECURITY — patrón idéntico a 0001/0005
-- ============================================================
-- El aislamiento POR EMPRESA lo garantiza RLS bajo `db_rls` (rol authenticated).
-- El barrido diario (Ciclo A-G2) corre con rol de servicio (BYPASSRLS) y filtra
-- por `empresa_id` de forma set-based explícita (hallazgo S4). El aislamiento
-- JERÁRQUICO interno (D6, "edita solo lo suyo") lo aplica el backend en Python.

alter table public.pm_projects enable row level security;
alter table public.pm_projects force  row level security;
create policy pm_projects_all on public.pm_projects for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));
grant select, insert, update, delete on public.pm_projects to authenticated;

alter table public.pm_milestones enable row level security;
alter table public.pm_milestones force  row level security;
create policy pm_milestones_all on public.pm_milestones for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));
grant select, insert, update, delete on public.pm_milestones to authenticated;

alter table public.pm_tasks enable row level security;
alter table public.pm_tasks force  row level security;
create policy pm_tasks_all on public.pm_tasks for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));
grant select, insert, update, delete on public.pm_tasks to authenticated;

alter table public.pm_time_entries enable row level security;
alter table public.pm_time_entries force  row level security;
create policy pm_time_entries_all on public.pm_time_entries for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));
grant select, insert, update, delete on public.pm_time_entries to authenticated;

alter table public.pm_comments enable row level security;
alter table public.pm_comments force  row level security;
create policy pm_comments_all on public.pm_comments for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));
grant select, insert, update, delete on public.pm_comments to authenticated;

alter table public.pm_notifications enable row level security;
alter table public.pm_notifications force  row level security;
create policy pm_notifications_all on public.pm_notifications for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));
grant select, insert, update, delete on public.pm_notifications to authenticated;
