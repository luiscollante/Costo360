# PLAN_MODULO_GESTION_PROYECTOS.md — Objetivo 6 (Fase 2.D del roadmap)

*Documento vivo del ciclo `/goal` para el módulo de gestión de proyectos. Creado el
2026-09-01 en la Fase 1. Se actualiza con los hallazgos de la Fase 2 (auditoría del plan) y
de la Fase 5 (auditoría de la ejecución). Detalle del objetivo: `docs/ROADMAP_COSTO360.md`,
Fase 2.D.*

---

## 1. Objetivo

Reimplementar **nativo** en el stack de Costo360 (React 19 + FastAPI + Supabase) el módulo de
gestión de proyectos que el fundador prototipó en Base44
(`gestion-proyectos-nuevo-modulo.zip`, ≈135 archivos). Sirve para gestionar cada trabajo
*después* de cotizarlo: proyectos en tablero Kanban, tareas, hitos con dependencias, registro
de horas, comentarios, notificaciones automáticas y un barrido diario de automatizaciones.

El prototipo Base44 es la **especificación funcional detallada** — define el comportamiento
exacto a replicar. No es código portable (entidades, auth, agente, funciones de servidor y
workflows corren en la plataforma Base44).

---

## 2. Decisiones tomadas (fundador, 2026-09-01)

| # | Decisión | Efecto |
|---|---|---|
| D1 | **Todo el módulo en un solo ciclo, salvo el asistente de IA.** | Este ciclo = datos + CRUD + toda la UI + horas + comentarios + notificaciones + automatizaciones. |
| D2 | **El asistente de IA se funde con el Objetivo 5.** | Se construye en un ciclo posterior, ya como el agente del Objetivo 5 (opera entidades + consultoría BI + navega la UI vía CopilotKit/AG-UI), estrenándose acotado a gestión de proyectos. **Este ciclo NO lo toca.** |
| D3 | **Automatizaciones = endpoint idempotente + disparo externo después.** | `POST /api/proyectos/cron/barrido-diario` protegido por secreto. Sin dependencia de planificador. El disparo real se cablea cuando el backend tenga hosting. |
| D4 | **`costo360-prototypes/` (carpeta en el repo) se ignora.** | No se toca en este ciclo. |
| D5 | **Kanban con arrastre → se aprueba `@hello-pangea/dnd`.** | Fork mantenido de react-beautiful-dnd, con soporte de teclado y lector de pantalla. Se añade a `web/package.json` y se documenta en `ARQUITECTURA_MAESTRA.md` §3 como dependencia nueva aprobada. |
| D6 | **Rol operativo: "ve todo, edita solo lo suyo".** | El operativo ve el tablero completo del taller; solo cambia tareas / registra horas / comenta donde es `responsable`. Crear/editar/borrar proyectos, mover en el Kanban de proyectos, crear/completar hitos → solo `admin`/`gerencia` (capacidad `puede_ver_dashboard`). El aislamiento entre talleres lo sigue dando RLS. |
| D7 | **El ciclo se parte en dos** (fundador, 2026-09-02, tras la Fase 2). **Reemplaza a D1.** | **Ciclo A** = G0–G3 (migración `0007` + todos los endpoints backend + barrido) + verificación de aislamiento / D6 / idempotencia, con auditoría de seguridad propia (Fase 5) **antes** de tocar UI. **Ciclo B** = G4–G7 (toda la interfaz) + prueba en vivo con navegador, con su propia Fase 5. |
| D8 | **`responsable` de tarea = solo vínculo con usuario** (fundador, 2026-09-02). Confirma el ajuste M1. | `pm_tasks` NO lleva columna `responsable` de texto libre; solo `responsable_id uuid references usuarios(id) on delete set null`. El nombre visible se deriva por join con `usuarios`. El selector de responsable en la UI lista usuarios del taller. Riesgo R4 eliminado. |

---

## 3. Guardarraíles (sin excepción)

- **No se toca** `backend/motor/`, `calculos.py`, `parametros.py`, el flujo de cotización,
  `backend/routers/agente.py`, `web/src/components/AgenteChat.tsx`, ni la app Streamlit legada
  (raíz del repo).
- **Regla 1 (aislamiento por taller):** las 6 tablas nuevas llevan `empresa_id uuid NOT NULL
  REFERENCES empresas(id) ON DELETE CASCADE`, con `enable` + `force ROW LEVEL SECURITY` y una
  policy `FOR ALL USING (empresa_id = (select public.empresa_actual())) WITH CHECK (...)`.
  Mismo patrón exacto que `0001` / `0005` / `0006`.
- **Regla 2 (jerarquía interna):** ver D6. El backend aplica el filtro con un helper análogo
  a `scope_propio` (`backend/db/deps.py`).
- Todos los routers de datos bajo `db_rls` + `get_current_user`, con
  `dependencies=[Depends(verificar_dispositivo)]` a nivel de router. **Ningún `conn.commit()`
  intermedio** (el commit final lo hace la dependencia — ver `PATRONES_DE_ERROR.md` #1).
- Lecturas de columnas `jsonb`: comprobar tipo antes de `json.loads` (`PATRONES_DE_ERROR.md`
  #2). Helpers que escriben dentro de la transacción del request no tocan `commit`/`rollback`
  (usar `SAVEPOINT`, como `log_accion` — `PATRONES_DE_ERROR.md` #3).
- Frontend: **solo** los 14 primitivos de `web/src/components/ui/` y los tokens de marca de
  `web/src/index.css`. Nada del verde `#1F6F54`/`#C9A45C` del prototipo ni de su set shadcn.
  Porcentajes con `formatPct`. Diálogos con `<Dialog>` (portal + trampa de foco). Kicker de
  `<PageHeader>` en `text-secondary`.
- Migración nueva = `backend/migrations/0007_gestion_proyectos.sql`, aplicada al proyecto
  Supabase `hrmpyhixhbnkkpvxtuit` vía MCP `apply_migration`.
- Micro-commit `wip(goal): <bloque> — <qué>` por cada bloque G0–G9; `tsc -b` + `vite build`
  limpios antes de cada commit de frontend.

---

## 4. Esquema de datos — migración `0007`

Prefijo `pm_` (project management) para agrupar y no colisionar. Estados como `text` +
`CHECK` (consistente con `cotizaciones.estado`). `created_at` / `updated_at timestamptz not
null default now()` + trigger de `updated_at` en las tablas que lo usan. Todos los índices
liderados por `empresa_id`.

### 4.1 `pm_projects`
| Columna | Tipo | Nota |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | |
| `empresa_id` | `uuid not null references empresas(id) on delete cascade` | Regla 1 |
| `nombre` | `text not null` | |
| `descripcion` | `text not null default ''` | |
| `cliente` | `text not null default ''` | texto libre (autocompletar con clientes de cotizaciones = mejora futura) |
| `material` | `text not null default ''` | categoría del catálogo (`/api/materiales/categorias`) |
| `estado` | `text not null default 'activo'` | `CHECK (estado in ('planificacion','activo','en_revision','completado','en_pausa','cancelado','archivado'))` |
| `fecha_inicio` | `date` | |
| `fecha_fin` | `date` | |
| `progreso_pct` | `integer not null default 0` | desnormalizado; lo recalcula el backend |
| `tareas_total` | `integer not null default 0` | idem |
| `tareas_hechas` | `integer not null default 0` | idem |
| `archivado` | `boolean not null default false` | |
| `en_riesgo` | `boolean not null default false` | lo marca el barrido |
| `creado_por` | `uuid references usuarios(id) on delete set null` | para D6 |
| `created_at` / `updated_at` | `timestamptz not null default now()` | |

Índice: `(empresa_id, estado)`, `(empresa_id, archivado)`.

### 4.2 `pm_tasks`
| Columna | Tipo | Nota |
|---|---|---|
| `id` | `bigint … identity pk` | |
| `empresa_id` | `uuid not null references empresas(id) on delete cascade` | Regla 1 |
| `project_id` | `bigint not null references pm_projects(id) on delete cascade` | |
| `titulo` | `text not null` | |
| `descripcion` | `text not null default ''` | |
| `estado` | `text not null default 'por_hacer'` | `CHECK (… in ('bloqueada','por_hacer','en_progreso','revision','completada'))` |
| `prioridad` | `text not null default 'media'` | `CHECK (… in ('baja','media','alta','urgente'))` |
| `responsable` | `text not null default ''` | texto libre (copiado del prototipo; ligar a `usuarios` = mejora futura) |
| `responsable_id` | `uuid references usuarios(id) on delete set null` | **añadido** — para D6 (editar solo lo suyo); se setea al asignarse a sí mismo o desde un selector de usuarios del taller |
| `fecha_limite` | `date` | |
| `horas_estimadas` | `numeric` | |
| `milestone_id` | `bigint references pm_milestones(id) on delete set null` | |
| `orden` | `integer not null default 0` | (`order` es palabra reservada) |
| `created_at` / `updated_at` | `timestamptz …` | |

Índice: `(empresa_id, project_id)`, `(empresa_id, milestone_id)`.

### 4.3 `pm_milestones`
`id`, `empresa_id` (Regla 1), `project_id bigint not null references pm_projects(id) on
delete cascade`, `titulo text not null`, `descripcion text not null default ''`,
`fecha_inicio date`, `fecha_limite date`, `estado text not null default 'pendiente' CHECK (…
in ('pendiente','en_progreso','completado'))`, `created_at`/`updated_at`.
Índice: `(empresa_id, project_id)`.

### 4.4 `pm_time_entries`
`id`, `empresa_id` (Regla 1), `task_id bigint not null references pm_tasks(id) on delete
cascade`, `project_id bigint not null references pm_projects(id) on delete cascade`,
`usuario_id uuid references usuarios(id) on delete set null`, `user_name text not null
default ''`, `horas numeric not null check (horas > 0)`, `fecha date not null default
current_date`, `nota text not null default ''`, `created_at`.
Índice: `(empresa_id, task_id)`, `(empresa_id, project_id)`.

### 4.5 `pm_comments`
`id`, `empresa_id` (Regla 1), `task_id bigint not null references pm_tasks(id) on delete
cascade`, `autor_id uuid references usuarios(id) on delete set null`, `autor_nombre text not
null default ''`, `contenido text not null`, `created_at`.
Índice: `(empresa_id, task_id)`.

### 4.6 `pm_notifications`
`id`, `empresa_id` (Regla 1), `titulo text not null`, `mensaje text not null default ''`,
`tipo text not null default 'recordatorio' CHECK (… in ('desbloqueo','recordatorio',
'riesgo'))`, `project_id bigint references pm_projects(id) on delete cascade`, `task_id bigint
references pm_tasks(id) on delete cascade`, `dedupe_key text`, `leida boolean not null default
false`, `created_at`.
Índice único **parcial**: `create unique index pm_notif_dedupe on pm_notifications
(empresa_id, dedupe_key) where dedupe_key is not null`.
Índice: `(empresa_id, leida, created_at desc)`.

### 4.7 RLS — las 6 tablas
Para cada tabla: `alter table … enable row level security;` + `… force row level security;` +
```
create policy <tabla>_all on <tabla> for all
  using (empresa_id = (select public.empresa_actual()))
  with check (empresa_id = (select public.empresa_actual()));
```
La jerarquía interna (D6) **no** va en RLS — la aplica el backend en Python (como
`scope_propio` para el Historial). RLS solo separa talleres.

---

## 5. Bloques de ejecución (Fase 4)

### G0 — Migración `0007` (datos)
Escribir y aplicar `0007_gestion_proyectos.sql` (sección 4). Verificar con el linter de
seguridad de Supabase (`get_advisors`) tras aplicar. Probar por SQL con rollback: insertar
como empresa A, confirmar que empresa B no lo ve.

### G1 — CRUD backend (`backend/routers/proyectos.py` + `backend/models/proyectos.py`)
Router `prefix="/api/proyectos"`, `dependencies=[Depends(verificar_dispositivo)]`, todo bajo
`db_rls` + `get_current_user`. Helper local `_puede_gestionar(usuario)` = `usuario
["puede_ver_dashboard"]` (admin/gerencia) para D6, y `_scope_tarea(usuario, task_row)` para
"editar solo lo suyo".

- **Proyectos:** `GET /` (lista paginada por columna: `estado`, `q` sobre
  `nombre/cliente/material` con `ILIKE`, `orden`, `limit`, `offset` — reescribe
  `boardConfig.buildQuery`); `GET /{id}`; `POST /` (solo gestor); `PUT /{id}` (solo gestor);
  `PATCH /{id}/estado` (mover en el Kanban de proyectos — solo gestor); `DELETE /{id}` (solo
  gestor) + `log_accion`.
- **Tareas:** `GET /{project_id}/tareas`; `POST /{project_id}/tareas` (regla: si
  `milestone_id` apunta a un hito no `completado` → nace `bloqueada`); `PUT /tareas/{id}`
  (gestor, o responsable si es suya); `PATCH /tareas/{id}` (estado/orden — mover; gestor o
  responsable); `DELETE /tareas/{id}` (gestor). Cada mutación → `_recalc_progreso(conn,
  project_id)` (cuenta tareas, setea `progreso_pct`/`tareas_total`/`tareas_hechas` en
  `pm_projects` — equivale a `recalcProjectProgress` + su workflow Base44).
- **Hitos:** `GET /{project_id}/hitos`; `POST /{project_id}/hitos` (gestor); `PUT
  /hitos/{id}` (gestor); `PATCH /hitos/{id}/estado` (gestor) — al pasar a `completado`,
  `UPDATE pm_tasks SET estado='por_hacer' WHERE milestone_id=%s AND estado='bloqueada'` y
  devolver el conteo desbloqueado.
- **Registro de horas:** `GET /tareas/{task_id}/horas` y `GET /{project_id}/horas`; `POST
  /tareas/{task_id}/horas` (gestor o responsable de la tarea); `DELETE /horas/{id}` (gestor o
  autor).
- **Comentarios:** `GET /tareas/{task_id}/comentarios`; `POST …` (cualquier usuario del
  taller); `DELETE /comentarios/{id}` (gestor o autor).
- **Notificaciones:** `GET /notificaciones` (no leídas primero, `limit`); `PATCH
  /notificaciones/{id}/leida`; `PATCH /notificaciones/leer-todas`.
- Registrar el router en `backend/main.py`.

### G2 — Automatizaciones
- **`POST /api/proyectos/cron/barrido-diario`** — cabecera `X-Cron-Secret` comparada contra
  `os.environ["CRON_SECRET"]` (constante-time). **No** usa `get_current_user` ni `db_rls`:
  usa una conexión de servicio (`db_service`, BYPASSRLS) e **itera empresa por empresa**
  (`SELECT id FROM empresas WHERE activa`), ejecutando por cada una, con `WHERE empresa_id =
  %s` **explícito en cada sentencia**:
  1. Desbloquear tareas cuyo hito está `completado` (`estado bloqueada → por_hacer`) + 1
     notificación `desbloqueo` por tarea.
  2. Recordatorios de tareas no completadas con `fecha_limite <= hoy+2d` en proyectos
     activos (`vencida` si `< hoy`).
  3. Hitos en riesgo (`fecha_limite <= hoy+2d`, no completado, proyecto activo).
  4. Proyectos en riesgo (`fecha_fin <= hoy+7d` y `progreso_pct < 60`) → set `en_riesgo` +
     notificación.
  5. Archivar proyectos `completado` con `updated_at < hoy-30d` → `estado='archivado',
     archivado=true`.
  Idempotencia: cada notificación con `dedupe_key` + `INSERT … ON CONFLICT (empresa_id,
  dedupe_key) DO NOTHING`. Devuelve `{empresas, desbloqueadas, notificaciones, archivadas}`.
- **`POST /api/proyectos/automatizacion/ejecutar`** — gateado por `require_dashboard`, corre
  el mismo barrido **solo para `usuario["empresa_id"]`** bajo `db_rls`. Es el botón "ejecutar
  barrido ahora" del Panel Admin, para no depender del cron mientras no haya hosting.
- Documentar en `ARQUITECTURA_MAESTRA.md`: el disparo real (cron del hosting / GitHub Action
  / cron-job.org apuntando al endpoint con el secreto) se cablea cuando el backend se
  despliegue. `CRON_SECRET` a `backend/ENV_SETUP.md`.

### G3 — Cliente API frontend (`web/src/api/proyectos.ts`)
Tipos TS + funciones por sub-recurso sobre `api` de `client.ts`. Espejo de
`web/src/api/materiales.ts`.

### G4 — Navegación + rutas
- `web/src/components/Sidebar.tsx`: grupo nuevo **"Proyectos"** entre "Cotizaciones" y
  "Taller": `Tablero` (`/proyectos`, icono `FolderKanban`). (Notificaciones = campana en la
  barra superior, no ítem de menú.) Visible para todos los roles (sin `requiereDashboard`).
- `web/src/App.tsx`: `<Route path="/proyectos">` y `<Route path="/proyectos/:id">`, ambas
  `<Private>` sin `RoleRoute`.
- `web/src/components/CommandPalette.tsx`: entradas "Proyectos" y "Nuevo proyecto".

### G5 — Pantalla: Tablero de Proyectos (`web/src/pages/ProyectosPage.tsx`)
`<PageHeader kicker="Proyectos">`. `<SegmentedControl>` con vistas Operativa / Cierre /
Archivo (columnas por vista, la de Archivo es de solo lectura). Toolbar: búsqueda con debounce
(`<Field>`), filtros cliente/material (`<SelectField>`), orden (`<SelectField>`). Hook
`useTableroProyectos` (reescritura de `useBoardData` del prototipo contra `/api/proyectos`,
paginación por columna, `PAGE_SIZE`/`MAX_LOADED`). Columnas Kanban con `<DragDropContext>` de
`@hello-pangea/dnd`; tarjeta `<Card>` con `nombre`, `cliente · material`, `formatPct
(progreso_pct)`, `<StatusBadge>`, marca `en_riesgo`. Mover columna → optimista + `PATCH
/{id}/estado`, revierte si falla (patrón `HistorialPage`). Crear proyecto = `<Dialog>` +
`<FormSection>`/`<Field>` (solo gestor; para el operativo el botón no aparece). Franja de
resumen del módulo (proyectos activos, tareas en progreso, horas registradas del taller) en
la cabecera — **no** se duplica el Dashboard global.

### G6 — Pantalla: Detalle de Proyecto (`web/src/pages/ProyectoDetallePage.tsx`)
Cabecera: nombre + `<StatusBadge>` + `formatPct`. `<SegmentedControl>` de 3 paneles:
- **Tablero:** Kanban de tareas (5 columnas) con `@hello-pangea/dnd`. `<TaskCard>` con
  prioridad/responsable/fecha. `<Dialog>` de tarea: descripción, prioridad, responsable
  (selector de usuarios del taller — set `responsable_id`), fecha límite, horas estimadas,
  hito; **pestañas internas Comentarios y Registro de horas**. Botones deshabilitados/ocultos
  según D6.
- **Cronograma:** lista/línea de hitos ordenada por `fecha_limite`. Completar hito → `PATCH
  /hitos/{id}/estado` + toast "N tareas desbloqueadas" (solo gestor).
- **Tiempos:** `<DataTable>` de `pm_time_entries` del proyecto + resumen horas estimadas vs
  registradas por tarea.
Todo optimista + `queryClient.invalidateQueries` de `['proyecto', id]` y `['tablero-proyectos']`.

### G7 — Notificaciones (campana)
`web/src/components/AppLayout.tsx`: `<IconButton aria-label="Notificaciones">` con contador
de no leídas en la barra superior → `<Dialog>` con la lista (`tipo`, `titulo`, `mensaje`,
enlace al proyecto/tarea) + "marcar todas". `useQuery(['notificaciones'])` con
`refetchInterval` de 2–3 min. Componente `web/src/components/proyectos/Notificaciones.tsx`.

### G8 — Enlace con el dominio de Costo360
`material` del proyecto = `<SelectField>` poblado con `/api/materiales/categorias`. `cliente`
= texto libre. "Crear proyecto desde cotización aprobada" queda anotado como **mejora futura,
fuera de este ciclo**.

### G9 — Verificación
`tsc -b` + `vite build` limpios. eslint sin regresiones nuevas. Pruebas de aislamiento por
SQL con rollback: (a) empresa A no ve ni escribe `pm_*` de empresa B; (b) `dedupe_key` no
colisiona entre empresas; (c) barrido idempotente (2ª corrida no crea notificaciones); (d)
D6: operativo no puede `POST` proyecto ni `PATCH` tarea ajena (403). Prueba en vivo con
navegador (cuenta admin Ana + operativo Beto): crear proyecto, tareas, hito, completar hito y
ver el desbloqueo, registrar horas, comentar, mover tarjetas, campana de notificaciones.

---

## 6. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Ciclo grande (D1) — difícil de auditar y de retomar si se corta. | Micro-commit por bloque G0–G9; `tsc`/`build` verde en cada uno; retomar desde el último commit. |
| R2 | `@hello-pangea/dnd` es dependencia nueva (D5). | Aprobada explícitamente; se documenta en `ARQUITECTURA_MAESTRA.md` §3. Es la lib con mejor a11y de teclado — reduce riesgo en la Fase 5 (Accessibility Auditor). |
| R3 | El barrido corre con BYPASSRLS → fuga entre talleres si el SQL no filtra bien. | Todas las sentencias del barrido llevan `WHERE empresa_id = %s` explícito; se itera empresa por empresa; Security Engineer lo audita en Fase 2; prueba con 2 empresas en G9. |
| R4 | `responsable` como texto libre (copiado del prototipo) + `responsable_id` nuevo → dos fuentes de verdad. | `responsable_id` es la que manda para permisos (D6); `responsable` es solo etiqueta visible. Unificar del todo = mejora futura. |
| R5 | Solape con el Objetivo 5 (asistente IA). | Fuera de este ciclo (D2). Este ciclo no toca `routers/agente.py` ni `AgenteChat.tsx`. |
| R6 | `%` de avance desnormalizado puede desincronizarse. | Se recalcula en el backend en cada mutación de tarea; el barrido no lo toca (solo `en_riesgo`). Nunca se calcula en el navegador. |
| R7 | Reserva de palabra SQL `order`. | Columna `orden`. |

---

## 7. Archivos que se tocan

**Backend — nuevos:** `backend/migrations/0007_gestion_proyectos.sql`,
`backend/routers/proyectos.py`, `backend/models/proyectos.py`.
**Backend — modificados:** `backend/main.py` (registrar router), `backend/ENV_SETUP.md`
(`CRON_SECRET`).
**Frontend — nuevos:** `web/src/api/proyectos.ts`, `web/src/pages/ProyectosPage.tsx`,
`web/src/pages/ProyectoDetallePage.tsx`, `web/src/hooks/useTableroProyectos.ts`,
`web/src/components/proyectos/*` (tarjetas, toolbar, vistas, formularios, Kanban de tareas,
diálogo de tarea, cronograma, parte de horas, notificaciones).
**Frontend — modificados:** `web/src/App.tsx`, `web/src/components/Sidebar.tsx`,
`web/src/components/AppLayout.tsx` (campana), `web/src/components/CommandPalette.tsx`,
`web/package.json` + `web/package-lock.json` (`@hello-pangea/dnd`).
**Docs:** este archivo (vivo), y en Fase 6: `PROGRESS.md`, `SESSION.md`,
`ARQUITECTURA_MAESTRA.md` (§3 dependencia, §4 tablas, §11 historial, §12), `docs/ROADMAP_
COSTO360.md` (Fase 2.D), memoria persistente.

---

## 8. Agentes del ciclo

- **Fase 1 (planear):** Software Architect, Database Optimizer, Frontend Developer, Product
  Manager — plan redactado.
- **Fase 2 (auditar el plan — distintos):** **Security Engineer** (RLS de las 6 tablas +
  barrido con BYPASSRLS + D6), **UX Architect** (encaje con los primitivos `ui/` y los
  tokens; coherencia con el rediseño visual ya fusionado), **Minimal Change Engineer** (que
  no se desborde el alcance; que no se toque motor/cotización/agente/legado).
- **Fase 5 (auditar la ejecución — distintos de 1 y 2):** Code Reviewer, Accessibility
  Auditor, API Tester.

---

## PARTE II — Auditoría de la Fase 2

*(Se llena con los hallazgos de Security Engineer, UX Architect y Minimal Change Engineer.
Si algo no se aprueba, el ciclo vuelve a la Fase 1 a ajustar esa parte y se repite la Fase
2.)*

### Security Engineer — APRUEBA CON CAMBIOS (2026-09-02)

La arquitectura de fondo es correcta: el patrón RLS de §4.7 replica bien `cotizaciones_all`
de `0001`; D6 en Python es defendible; `dedupe_key` con índice único parcial no colisiona
entre empresas. Huecos a cerrar en el plan antes de ejecutar:

1. **[ALTA] D6 — autoasignación de `responsable_id` para editar tarea ajena.** `_scope_tarea`
   debe evaluar **siempre contra la fila actual en BD** (`SELECT … FOR UPDATE` antes de
   mutar), nunca contra el payload. Un no-gestor solo puede fijar `responsable_id` a su
   propio id y solo si la tarea está sin asignar (`responsable_id IS NULL`); reasignar/
   limpiar = gestor. Para no-gestor responsable, `PUT`/`PATCH` aplican **lista blanca de
   columnas** (`estado`, `orden`, `descripcion`, `horas_estimadas`) y rechazan
   `responsable_id`, `project_id`, `milestone_id`, `empresa_id`.
2. **[ALTA] `POST /{project_id}/tareas` sin permiso especificado.** Marcarlo **solo gestor**
   explícitamente (o decidir lo contrario por escrito, con la mitigación de #1 aplicada).
3. **[ALTA] Autoría spoofeable.** `pm_projects.creado_por`, `pm_comments.autor_id/nombre`,
   `pm_time_entries.usuario_id/user_name` se setean **server-side desde `usuario["id"]`/
   perfil**, nunca del body. `POST …/horas` carga la tarea y valida `responsable_id` contra
   BD.
4. **[ALTA] Barrido bajo BYPASSRLS depende de `WHERE empresa_id = %s` a mano en cada
   sentencia (todas: desbloqueo+subconsulta, INSERT notif, SELECT por vencer+JOIN, hitos en
   riesgo+INSERT, UPDATE en_riesgo+INSERT, UPDATE archivar).** Elegir uno: (a) barrido
   **set-based sin bucle** — cada sentencia filtra `empresa_id IN (SELECT id FROM empresas
   WHERE activa)` y las notificaciones toman `empresa_id` de la FK NOT NULL de
   `pm_tasks`/`pm_projects`; desglose con `GROUP BY`. (b) con bucle: `SET LOCAL
   costo360.empresa_barrido = %s` por iteración y **toda** sentencia añade `AND empresa_id =
   current_setting('costo360.empresa_barrido')::uuid`; encapsular los 5 pasos en funciones
   SQL `f(p_empresa uuid)` testeables.
5. **[MEDIA] `ON CONFLICT` no matchea el índice parcial.** Usar `ON CONFLICT (empresa_id,
   dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING` (como `materiales.py`).
6. **[MEDIA] Faltan `GRANT` de DML a `authenticated` en las 6 tablas.** `0003`/`0005` sí los
   llevan; `0001` no (por eso el plan no puede decir "replica EXACTAMENTE `0005`"). Añadir a
   `0007`: `grant select, insert, update, delete on pm_projects, pm_tasks, pm_milestones,
   pm_time_entries, pm_comments, pm_notifications to authenticated;`. Opcional: cláusula `to
   authenticated` en cada policy (consistencia con `0005` + rendimiento).
7. **[MEDIA] El endpoint del cron heredaría `dependencies=[Depends(verificar_dispositivo)]`
   del router.** `POST /api/proyectos/cron/barrido-diario` va en un `APIRouter` **separado
   sin dependencias de router**, o montado directo en `main.py`.
8. **[MEDIA] `X-Cron-Secret`: endurecer.** `hmac.compare_digest(header.encode(),
   os.environ["CRON_SECRET"].encode())`; `CRON_SECRET` vacío/ausente → 500 al arrancar o
   rechazar (nunca `"" == ""`); header ausente → 401 antes de comparar; añadir a scrub de
   logging y no ecoar en errores; `ENV_SETUP.md`: ≥32 bytes aleatorios. Rate-limit
   (`slowapi`) al cron (≈6/h por IP) y a `/automatizacion/ejecutar` (≈2/min por usuario).
9. **[MEDIA] Lista de proyectos = superficie de inyección** (reescribe `buildQuery` que arma
   strings). `q` con `ILIKE %s` parametrizado; `ORDER BY` columna+dirección desde **lista
   blanca**; `limit`/`offset` a int con tope; `PATCH …/estado` valida `estado` contra la
   lista del `CHECK` en Python (400) antes de armar SQL.
10. **[MEDIA] `_recalc_progreso` NO debe imitar el "que nunca lanza" de `log_accion`.** Es
    lógica central: propaga excepciones, sin `commit`/`rollback` ni `except` amplio. Solo
    `log_accion` (en `DELETE`) sigue aislado con SAVEPOINT.
11. **[MEDIA] Extender `_self_test_rls()` de `main.py`** con aserción fail-closed sobre al
    menos `pm_projects` y `pm_notifications` (0 filas como `authenticated` sin claims).
    Mantener gate duro de `get_advisors` tras `apply_migration` en G0.
12. **[MEDIA] Cadencia de `commit` de la función de barrido compartida.** La función recibe
    un `cursor` y **nunca hace `commit`**; el wrapper del cron (`db_service`, no `db_rls`)
    decide la cadencia. Envolver cada empresa del cron en `SAVEPOINT` + `except` para que un
    fallo en la empresa N no tire el trabajo de las anteriores.
13. **[BAJA] `milestone_id` no se valida contra el proyecto.** En `POST /{project_id}/tareas`
    y `PATCH /tareas/{id}`, validar que `milestone_id` pertenece al mismo `project_id`/
    empresa o 400.
14. **[BAJA] Estado de lectura de notificaciones es a nivel taller** (`leida` boolean único;
    `leer-todas` afecta a todo el taller). Aceptarlo por escrito en R4/§4.6 como herencia del
    prototipo, o mover a `pm_notification_reads` por usuario.
15. **[BAJA] Errores genéricos en cron/barrido** — loguear detalle, devolver 500 genérico (no
    `error.message` como el `entry.ts` original).

**Cobertura `PATRONES_DE_ERROR.md`:** #1 prohibido en §3 (riesgo residual solo en hallazgo
12); #2 no aplica (sin columnas `jsonb` que se lean); #3 cubierto por diseño (vigilar
hallazgo 10); #4 no aplica (sin APIs externas; solo la lección de errores genéricos, #15).

### Minimal Change Engineer — APRUEBA CON CAMBIOS (2026-09-02)

El plan es disciplinado en lo grande: no reescribe el Dashboard global, no toca `motor/`,
cotización, `agente.py`, `AgenteChat.tsx` ni el legado; asistente de IA y realtime fuera; no
migra formularios existentes; cambios en `main.py`/`App.tsx`/`Sidebar.tsx` aditivos; lo nuevo
aislado en `components/proyectos/`; `costo360-prototypes/` intacto.

1. **[MEDIA] `pm_tasks.responsable` (texto) + `responsable_id` = doble fuente de verdad**
   (§4.2, es el R4 del plan). No hay datos que migrar y G6 ya trae selector de usuarios.
   **Ajuste:** eliminar `responsable` de `pm_tasks`; derivar el nombre por join con
   `usuarios` vía `responsable_id`. Borra R4. **Excepción:** solo si el fundador quiere
   asignar tareas a un operario **sin cuenta** — decisión explícita ahora, no heredada del
   zip.
2. **[MEDIA] `pm_projects.creado_por` no gatea nada** (§4.1). G1 controla permisos por
   capacidad, no por autoría; el borrado ya va a `log_accion`. **Ajuste:** quitarla, o
   mostrar en G1 la consulta que la consume.
3. **[MEDIA] G2 — el segundo endpoint `/automatizacion/ejecutar` + botón** es comodidad, no
   lo pide D3, y su botón no tiene archivo en §7. **Ajuste:** diferirlo hasta cablear el
   disparo real (G9 prueba idempotencia llamando directo a `/cron/barrido-diario` con el
   secreto). Si se mantiene: botón en la cabecera del Tablero de Proyectos (no en Admin) y
   añadir el archivo a §7.
4. **[MEDIA] `@hello-pangea/dnd` sin versión fijada** (D5/§7). El prototipo trae `^17`
   (React 18); Costo360 está en React 19.2.6. **Ajuste:** fijar `@hello-pangea/dnd@^18`
   (peer `react@19` verificado); `npm ls react` sin duplicados antes del commit de G5.
5. **[BAJA-MEDIA] G7 — polling global de notificaciones en `AppLayout.tsx`**. `refetchInterval`
   2–3 min es tráfico de fondo nuevo para todos en todas las rutas. **Ajuste:** sin
   `refetchInterval`; refetch en `mount` + `refetchOnWindowFocus` + invalidación al navegar
   dentro de `/proyectos`.
6. **[BAJA] Blindar contra librería de fechas** (§3). **Ajuste:** una línea — "sin librería
   de fechas; los plazos se calculan en el backend (barrido), el frontend muestra ISO /
   `Intl`".
7. **[BAJA] Tour de bienvenida no marcado fuera de alcance** (§3/§5). `src/components/tour/`
   + `canvas-confetti` del prototipo. **Ajuste:** añadirlo a la lista explícita de "fuera de
   este ciclo".
8. **[BAJA] G8 es casi vacío** — plegarlo en G5; el camino queda G0–G7 + verificación.
9. **[ADVISORY — decide el fundador] R1: partir el ciclo.** Es materialmente más grande que
   el rediseño visual (que se partió en 2) y estrena la ruta BYPASSRLS, que merece su propia
   auditoría de seguridad **antes** de montarle UI. **Recomendación:** Ciclo A = G0–G3 +
   pruebas SQL/HTTP de aislamiento / D6 / idempotencia; Ciclo B = G4–G8 + prueba en vivo.
   D1 dijo "un ciclo" — la decisión es del fundador.

### UX Architect — APRUEBA CON CAMBIOS (2026-09-02)

La arquitectura de información (tablero primario en `/proyectos`, detalle en `/proyectos/:id`,
notificaciones fuera del menú) es correcta y encaja con el shell y el menú "por área". Huecos
de encaje fino con los 14 primitivos:

1. **[ALTA] `<StatusBadge>` no sirve para estados de proyecto/tarea** (G5/G6) — está cableado
   a estados de cotización. **Ajuste:** crear `ProjectStatusBadge` y `TaskStatusBadge` como
   envoltorios delgados de `<Badge>` en `components/proyectos/`, con su mapa `estado →
   {tono, icon}`.
2. **[ALTA] Falta la tabla estado/prioridad/tipo → token + icono** (G5/G6/G7). El prototipo
   usa `#1F6F54`/`#C9A45C`/`bg-amber-*`/`bg-stone-*`; `<Badge>` solo tiene 5 tonos para 7
   estados de proyecto. **Ajuste:** añadir al plan la tabla explícita (proyecto: planificacion→
   neutral+CircleDashed · activo→success+Play · en_revision→warning+Search · completado→gold+
   Check · en_pausa→neutral+Pause · cancelado→danger+X · archivado→neutral+Archive; tarea:
   bloqueada→neutral+Lock · por_hacer→neutral+Circle · en_progreso→success+Play · revision→
   warning+Search · completada→gold+Check; prioridad: baja→neutral · media→neutral+Equal ·
   alta→warning · urgente→danger+AlertTriangle; notificación: desbloqueo→success+Unlock ·
   recordatorio→gold+Clock · riesgo→danger+AlertTriangle; dots de columna: patrón
   `estadoConfig.dot` de `HistorialPage` con `bg-brand-*`, nunca `bg-amber-*`).
3. **[ALTA] `<SegmentedControl>` sin `mode` fijado** (G5/G6). G5 = `mode="buttons"`. G6 =
   `mode="tabs"` + `panelIdFor` + `<div role="tabpanel" tabIndex={0} hidden={…}>`. El
   primitivo no expone `id` en el botón de tab → añadir `id={panelIdFor?.(o.value)}` (1
   línea).
4. **[ALTA] `<Dialog>` de tarea: tamaño y borrado anidado** (G6). Es `max-w-md` sin
   `max-height`/scroll y **no soporta apilado**. **Ajuste:** `className="max-w-2xl"` + cuerpo
   `max-h-[75vh] overflow-y-auto`; borrado **inline** (swap a botones check/x, patrón
   `HistorialRow`), no un 2º Dialog. Anidar `SegmentedControl mode="tabs"` dentro del Dialog
   sí es sólido en a11y.
5. **[ALTA] Alternativa de teclado/lector al arrastre sin especificar** (G5/G6/D5).
   **Ajuste:** cambio de estado por teclado/AT con un `<SelectField>` de estado (en el
   `<Dialog>` de tarea y en la tarjeta seleccionada); el arrastre es un extra. Textos
   `announce` es-CO para `onDragStart/Update/End`; `:focus-visible` en la tarjeta.
6. **[MEDIA] No se nombra `<AsyncBoundary>` ni `<EmptyState>`** (G5/G6). **Ajuste:** exigir
   `<AsyncBoundary isPending isError onRetry>` en la carga inicial de ambas pantallas y
   `<EmptyState>` en toda columna/lista vacía; skeleton ligero por columna.
7. **[MEDIA] Formato de fechas es-CO sin definir; riesgo de meter `date-fns`** (G5/G6).
   **Ajuste:** extraer `formatFecha`/`formatFechaHora` a `web/src/lib/utils.ts` (patrón
   `HistorialPage`, `MESES_CORTOS`); horas → `formatNum(h,1)+' h'`. Prohibir `date-fns` en §3.
8. **[MEDIA] No hay primitivo de barra de progreso** (3 usos). **Ajuste:** (a) solo
   `formatPct` texto, o (b) componente local mínimo en `components/proyectos/` (`h-1.5
   rounded-full bg-brand-border/40` + relleno `bg-brand-primary`; hito completado →
   `bg-brand-gold`, permitido por §6).
9. **[MEDIA] Campana: falta header móvil y popover vs Dialog** (G7). La barra de acciones de
   `AppLayout` **solo existe en desktop** (`hidden lg:flex h-12`). **Ajuste:** añadir la
   campana a **ambos** headers (móvil → `justify-between` + `<IconButton>` a la derecha).
   Contenedor `<Dialog>` (modal centrado) es aceptable; el plan reconoce que no es un
   dropdown anclado.
10. **[MEDIA] Grupo de menú "Proyectos" con un solo ítem** (G4). **Ajuste:** `NavRow` suelto
    (como `DASHBOARD_ITEM`), icono `FolderKanban`, `to="/proyectos"`, sin `requiereDashboard`,
    entre "Cotizaciones" y "Taller".
11. **[MEDIA] La "franja de resumen" (G5) no tiene endpoint.** **Ajuste:** `GET
    /api/proyectos/resumen` → `{proyectos_activos, tareas_en_progreso, horas_registradas}`
    agregado en backend (R6).
12. **[BAJA] Colapsar el Dashboard pierde el "mis tareas" del operativo.** **Ajuste:** toggle
    "Todas / Mías" en `ProyectosPage` (`responsable_id === usuario.id`). Sin ruta nueva.
13. **[BAJA] `<PageHeader>` en el detalle** (G6). **Ajuste:** `<PageHeader kicker="Proyecto"
    title={proyecto.nombre} actions={<ProjectStatusBadge/> + formatPct}>`.

---

## PARTE III — Plan corregido tras la Fase 2 (ajustes incorporados)

Los 3 auditores **APRUEBAN CON CAMBIOS**; ninguno rechaza → no se vuelve a Fase 1 completa;
se incorporan los ajustes aquí y el plan queda validado. `S#` = Security, `M#` = Minimal
Change, `U#` = UX.

### A. Esquema `0007` (§4)
- **Quitar `pm_tasks.responsable` (texto)** → solo `responsable_id uuid references
  usuarios(id) on delete set null`; el nombre por join. Borra R4. `(M1)` — **salvo decisión
  del fundador** (Parte IV #2).
- **Quitar `pm_projects.creado_por`** salvo que G1 muestre la consulta que la usa. `(M2)`
- **Añadir:** `grant select, insert, update, delete on pm_projects, pm_tasks, pm_milestones,
  pm_time_entries, pm_comments, pm_notifications to authenticated;` `(S6)`
- `ON CONFLICT (empresa_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`. `(S5)`
- Validar en backend que `milestone_id` pertenece al mismo `project_id`/empresa (400). `(S13)`
- Cláusula `to authenticated` en cada policy. `(S6)`
- `pm_notifications.leida` a nivel taller — aceptado, no se construye `pm_notification_reads`.
  `(S14)`

### B. Backend routers (§5-G1)
- **`POST /{project_id}/tareas` = solo gestor.** `(S2)`
- **`_scope_tarea` evalúa contra la fila en BD** (`SELECT … FOR UPDATE`), nunca el payload.
  No-gestor responsable: lista blanca `estado/orden/descripcion/horas_estimadas`; rechaza
  `responsable_id/project_id/milestone_id/empresa_id`. No-gestor solo fija `responsable_id` =
  su id y solo si la tarea está sin asignar. `(S1)`
- **Autoría server-side** desde `usuario["id"]`/perfil (`pm_comments`, `pm_time_entries`).
  `POST …/horas` carga la tarea y valida `responsable_id` contra BD. `(S3)`
- **Lista de proyectos:** `q` con `ILIKE %s` parametrizado; `ORDER BY` desde lista blanca;
  `limit/offset` a int con tope; `PATCH …/estado` valida contra el `CHECK` (400). `(S9)`
- **`_recalc_progreso` propaga excepciones** — sin `commit`/`rollback`/`except` amplio. `(S10)`
- **Nuevo `GET /api/proyectos/resumen`** agregado en backend. `(U11)`

### C. Barrido / automatizaciones (§5-G2)
- **Enfoque: set-based sin bucle.** Cada sentencia filtra `empresa_id IN (SELECT id FROM
  empresas WHERE activa)`; las notificaciones toman `empresa_id` de la FK NOT NULL;
  desglose con `GROUP BY`. `(S4)`
- **Endpoint del cron en `APIRouter` separado sin `dependencies` de router.** `(S7)`
- **`X-Cron-Secret`:** `hmac.compare_digest`; `CRON_SECRET` ausente → falla al arrancar;
  header ausente → 401; a scrub de logs; nunca ecoado; `ENV_SETUP.md` ≥32 bytes; rate-limit
  ≈6/h por IP. `(S8)`
- **La función de barrido recibe un `cursor` y nunca hace `commit`.** `(S12)`
- **Errores del cron:** loguear detalle, 500 genérico. `(S15)`
- **Se DIFIERE `POST /api/proyectos/automatizacion/ejecutar` y su botón.** G9 prueba
  idempotencia llamando directo a `/cron/barrido-diario` con el secreto. `(M3)`

### D. `main.py` (§3, §5-G0)
- **Extender `_self_test_rls()`** con aserción fail-closed sobre `pm_projects` y
  `pm_notifications`. `(S11)`

### E. Frontend — sistema de diseño (§3, §5-G3..G8)
- **Crear `ProjectStatusBadge`/`TaskStatusBadge`** (envoltorios de `<Badge>`) con el mapa de
  U2; prioridad y tipos de notificación con el mismo mapa; dots de columna con
  `estadoConfig.dot` de `HistorialPage`. `(U1, U2)`
- **`<SegmentedControl>`:** G5 → `mode="buttons"`; G6 → `mode="tabs"` + `panelIdFor` +
  `role="tabpanel"`; añadir `id` al botón de tab del primitivo (1 línea). `(U3)`
- **`<Dialog>` de tarea:** `max-w-2xl` + cuerpo `max-h-[75vh] overflow-y-auto`; borrado
  inline. `(U4)`
- **Arrastre:** `<SelectField>` de estado como vía teclado/AT; `announce` es-CO;
  `:focus-visible`. `(U5)`
- **`<AsyncBoundary>`** en carga inicial; **`<EmptyState>`** en vacíos; skeleton por columna.
  `(U6)`
- **Fechas:** `formatFecha`/`formatFechaHora` nuevas en `web/src/lib/utils.ts`. Prohibir
  `date-fns`/`moment` en §3. `(U7, M6)`
- **Barra de progreso:** componente local mínimo en `components/proyectos/` (decisión (b)).
  `(U8)`
- **Campana (G7):** en ambos headers de `AppLayout`; contenedor `<Dialog>` centrado. Sin
  `refetchInterval`: refetch en `mount` + `refetchOnWindowFocus` + invalidación al navegar en
  `/proyectos`. `(U9, M5)`
- **Menú (G4):** "Proyectos" como `NavRow` suelto. `(U10)`
- **Detalle (G6):** `<PageHeader kicker="Proyecto">`. `(U13)`
- **`ProyectosPage`:** toggle "Todas / Mías". `(U12)`
- **`@hello-pangea/dnd@^18`** (peer `react@19`); `npm ls react` sin duplicados. `(M4)`
- **§3 — fuera de este ciclo (explícito):** tour de bienvenida (`components/tour/`,
  `canvas-confetti`), realtime, `date-fns`/`moment`, migrar formularios existentes. `(M7)`

### F. Estructura de bloques
- **G8 se pliega en G5.** Camino: **G0–G7 + verificación (G9)**. `(M8)`

### G. Archivos — correcciones a §7
- **Fuera:** `AdminPage.tsx` (se difiere el botón de barrido).
- **Dentro (añadir):** `web/src/lib/utils.ts`, `web/src/components/ui/SegmentedControl.tsx`
  (1 línea), `web/src/components/proyectos/{ProjectStatusBadge,TaskStatusBadge,BarraProgreso}.tsx`.

---

## PARTE IV — Decisiones que quedan para el fundador (Fase 3)

1. **¿Partir el ciclo en dos?** Minimal Change (M9) y Security coinciden: es más grande que
   el rediseño visual (que se partió en 2) y estrena la ruta con BYPASSRLS. Propuesta de los
   auditores: **Ciclo A = G0–G3 + verificación de aislamiento / D6 / idempotencia**;
   **Ciclo B = G4–G7 + prueba en vivo con navegador**. El fundador eligió "un ciclo" (D1).
2. **¿Se quita `pm_tasks.responsable` (texto libre)?** Recomendación: sí, dejar solo
   `responsable_id`. Se mantiene **solo si** el fundador quiere asignar tareas a operarios
   **sin cuenta** en Costo360.

---

## PARTE V — Ejecución del Ciclo A (2026-09-02)

Rama `goal/modulo-proyectos` (sobre `master`). Micro-commits por bloque.

### G0 — Migración `0007` ✅ (commit `aab3b55`)
`backend/migrations/0007_gestion_proyectos.sql` aplicada a Supabase
`hrmpyhixhbnkkpvxtuit` vía `apply_migration`. 6 tablas `pm_*` + RLS `enable`/`force` +
policy `FOR ALL TO authenticated` + `GRANT` de DML. Aislamiento estructural padre-hijo
con `UNIQUE (id, empresa_id)` + FK compuestas. `pm_notifications` con índice único
parcial `(empresa_id, dedupe_key)`. `pm_touch_updated_at()` + `revoke execute`.
`get_advisors` (security): **sin hallazgos nuevos** (los 2 WARN son pre-existentes y
ajenos: `empresa_actual` SECURITY DEFINER intencional; leaked-password de Auth).
Ajuste durante la ejecución: `milestone_id` queda FK simple (un `SET NULL`
multi-columna anularía también `empresa_id NOT NULL`); la pertenencia hito↔proyecto la
valida el backend (S13).

### G1 — Routers backend ✅ (commit `2f82567`)
`backend/routers/proyectos.py` (+ `backend/models/proyectos.py`) — 29 rutas bajo
`db_rls` + `get_current_user` + `verificar_dispositivo` de router. Todos los hallazgos
de la Fase 2 incorporados (S1 lock+lista blanca, S2 crear = gestor, S3 autoría
server-side, S9 ILIKE/ORDER BY lista blanca/Literal, S10 `_recalc_progreso` propaga,
S13 milestone↔proyecto, U11 `/resumen`, `/usuarios` para el selector). Registrado en
`main.py`; `_self_test_rls` extendido (S11).

### G2 — Barrido diario ✅ (commit `2f82567`)
`backend/routers/proyectos_cron.py` — router aparte sin deps de sesión (S7). Secreto
`X-Cron-Secret` con `hmac.compare_digest`, fail-closed (S8), rate-limit 6/h. Barrido
**set-based sin bucle**, `empresa_id IN (SELECT id FROM empresas WHERE activa)` en cada
sentencia (S4), idempotente por `dedupe_key` (S5), corre bajo `db_service` y no hace
`commit` (S12), 500 genérico (S15). `hoy` = `America/Bogota`. `CRON_SECRET` documentado
en `ENV_SETUP.md`.

### G3 — Cliente API frontend ✅ (commit `280c61e`)
`web/src/api/proyectos.ts` — cliente tipado, una función por endpoint. `tsc -b` +
`eslint` limpios.

### Verificación (SQL con rollback contra el proyecto real)
1. Empresa A ve su proyecto. **OK**
2. Empresa A **no** ve el de la empresa B (RLS). **OK**
3. `WITH CHECK` rechaza INSERT con `empresa_id` ajeno. **OK**
4. Empresa A no puede `UPDATE` un proyecto de B (0 filas). **OK**
5. FK compuesta bloquea una tarea de A colgada de un proyecto de B. **OK**
6. Usuario sin perfil (claims inválidos) ve 0 proyectos (fail-closed). **OK**
7. `ON CONFLICT (empresa_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING` →
   idempotencia (valida la sintaxis de S5). **OK**
8. Varias notificaciones con `dedupe_key NULL` coexisten. **OK**
- Las 6 sentencias del barrido ejecutan sin error contra el esquema real (rollback).
- `py_compile` + import de la app + build de OpenAPI + `tsc -b` + `eslint`: limpios.

**Pendiente del Ciclo A:** prueba en vivo por HTTP de D6 (403 del operativo al crear
proyecto / editar tarea ajena) — necesita `backend/.env` + `web/.env` del fundador
(igual que el B8 de la Fase 2.A). Se cubre en la prueba en vivo del Ciclo B.

### Fase 5 del Ciclo A — auditoría (2026-09-02)

3 agentes distintos a los de Fase 1 y 2: **Code Reviewer**, **Backend Architect**,
**Database Optimizer**. Los tres: **APRUEBA CON CAMBIOS**. **Ningún bloqueante para
arrancar el Ciclo B.** Todos los arreglos aplicados en el commit `ca5798c` + migración
`0008` (`0008_gestion_proyectos_endurecimiento.sql`, aplicada).

**Cerrados antes del Ciclo B (convergentes CR#1/#2 + BA#1/#2):**
- `editar_tarea`: `responsable_id` **fuera** de `TareaUpdate` — el cambio de responsable
  va SIEMPRE por `PATCH /tareas/{id}/responsable` (valida el usuario contra `usuarios`
  bajo RLS; antes el PUT lo aplicaba sin validar → riesgo cross-taller por la FK simple).
- `_NO_GESTOR_WHITELIST` recortada a las **4** columnas que aprobó Security en S1:
  `{estado, orden, descripcion, horas_estimadas}` (antes tenía 7).
- Listados con `LIMIT 500` (`tareas`, `hitos`, `horas` ×2, `comentarios`) — contrato
  fijado antes de cablear los hooks del Ciclo B.

**Otros arreglos aplicados:**
- CR#3 — un no-gestor no puede sacar una tarea de `bloqueada` saltándose el hito (403 en
  `editar_tarea` y `mover_tarea`).
- CR#4 — `responsable_id` tipado `Optional[UUID]` → 422 en vez de 500 con un valor no-UUID.
- CR#5 — `estado`/`orden` de `listar_proyectos` tipados con `Literal`.
- BA#3 — el chequeo del `X-Cron-Secret` es una dependencia resuelta **antes** de
  `db_service` → un secreto inválido no consume conexión del pool.
- BA#4 — `SET LOCAL statement_timeout='60s'` + `lock_timeout='5s'` al inicio del barrido.
  La respuesta del barrido añade `empresas`.
- DBO-H2 / CR#7 — `pm_projects.completado_en` (migración `0008`): el archivado usa esa
  marca, no `updated_at` (que `_recalc_progreso` / el paso "en_riesgo" mueven).
  `mover_proyecto`/`crear_proyecto` la fijan al pasar a `completado`.

**Migración `0008` (no bloqueante, aplicada):**
- `completado_en` + backfill.
- `horas` / `horas_estimadas` → `numeric(7,2)` (DBO-H1).
- `pm_tasks.milestone_id` → FK **compuesta** `(id, empresa_id)` con `on delete set null
  (milestone_id)` (PG17) — aislamiento estructural también en el enlace al hito (DBO-H3).
- Índices: `(empresa_id, updated_at desc)`, `(empresa_id, fecha_fin)`, `pm_tasks
  (empresa_id, estado)`, `(empresa_id, fecha_limite)`, `milestone_id`-líder, `pm_milestones
  (empresa_id, fecha_limite)`. Se quita `(empresa_id, archivado)` redundante
  (DBO-H4/H5/H6/H7, BA#5).

**Diferidos a producción / no accionables ahora (registrados):**
- CR#6 — el `503` del cron cuando `CRON_SECRET` está vacío es por-request, no un fallo al
  arrancar; se acepta como fail-closed mientras el disparo real no esté cableado.
- CR#8 / índices con `pg_trgm` para el `ILIKE %q%` de `listar_proyectos` — a evaluar si
  crece el volumen.
- BA (escalabilidad ~1000 empresas) — troceo por lotes del barrido; a revisar cuando
  aplique.
- CR#9/#10/#11 — nits cosméticos (`round` bancario, `_recalc_progreso` no-op al
  desbloquear/reordenar). Sin acción.

**Verificado (SQL con rollback contra el proyecto real):** FK compuesta de hito bloquea
cross-tenant; `completado_en` archiva a los 30 días y **no** antes; `SET NULL` toca solo
`milestone_id`; las 6 sentencias del barrido v2 OK. `get_advisors` (security): sin
hallazgos nuevos. `py_compile` + import de la app + OpenAPI + `tsc -b` + `eslint`:
limpios.

**Ciclo A CERRADO.** Listo para el Ciclo B (G4–G7 + prueba en vivo).

---

## PARTE VI — Ejecución del Ciclo B (2026-09-02)

Rama `goal/modulo-proyectos`, commits `663e642` + `0ea46b8`. `@hello-pangea/dnd@18.0.1`
instalado (react@19 deduped, sin duplicados).

### G4 — Navegación ✅
- `Sidebar.tsx`: "Proyectos" como `NavRow` suelto entre "Cotizaciones" y "Taller" (U10),
  icono `FolderKanban`, visible para todos los roles.
- `App.tsx`: rutas `/proyectos` y `/proyectos/:id` (`<Private>`, sin `RoleRoute`).
- `CommandPalette.tsx`: entrada "Proyectos".

### G5 — Tablero de proyectos ✅ (`pages/ProyectosPage.tsx`)
- `<PageHeader kicker="Proyectos">` + franja de resumen (`GET /api/proyectos/resumen`).
- `<SegmentedControl mode="buttons">` vistas Operativa / Cierre / Archivo (U3).
- Kanban con `@hello-pangea/dnd` + `dragHandleUsageInstructions` en español + `<select>`
  "Mover a" por tarjeta como vía accesible (U5). Arrastre deshabilitado en Archivo y para
  no-gestores. Búsqueda con debounce + orden. Paginación por columna
  (`hooks/useTableroProyectos.ts`, reescritura de `useBoardData`). Movimiento optimista.
- "Nuevo proyecto" (`<Dialog>`, solo gestor) con `<Field>`/`<SelectField>`/`<DateField>`;
  material = `<SelectField>` poblado con `/api/materiales/categorias` (G8, `api/materiales.ts`
  gana `getCategoriasMaterial`).

### G6 — Detalle de proyecto ✅ (`pages/ProyectoDetallePage.tsx`)
- `<PageHeader kicker="Proyecto">` + `<ProjectStatusBadge>` + `formatPct` (U13). Enlace
  "← Proyectos" encima.
- `<SegmentedControl mode="tabs">` + `<div role="tabpanel">`: Tablero / Cronograma / Tiempos
  (U3).
- Tablero: `TareaKanban` (5 columnas) + `<TareaDialog>` (`max-w-2xl`, cuerpo `max-h-[75vh]
  overflow-y-auto`, borrado **inline** con swap check/x — sin diálogo anidado, U4) con
  `<SegmentedControl mode="tabs">` interno Comentarios / Registro de horas. Mover tarea =
  optimista (`onMutate`/`onError`/`onSettled`); no-gestor solo mueve lo suyo y no saca de
  `bloqueada`. Estado del formulario del diálogo con `useState(() => …)` + `key={tareaSel.id}`
  (sin `useEffect` de sincronización).
- Cronograma: `CronogramaHitos` (línea de hitos, "Completar" → `showToast` de desbloqueo).
- Tiempos: `ParteHoras` (`<DataTable>` + estimado / registrado / desvío).

### G7 — Notificaciones ✅ (`components/proyectos/CampanaNotificaciones.tsx`)
- `<IconButton>` + contador de no leídas + `<Dialog>` con la lista + "marcar todas".
- En **ambos** headers de `AppLayout` (móvil → `justify-between`). Sin `refetchInterval`:
  `refetchOnWindowFocus` + `staleTime` 1 min + invalidación desde `/proyectos` (M5).

### Componentes de apoyo
- `components/proyectos/badges.tsx` (solo componentes) + `badgeMeta.ts` (mapas
  `estado → {tono, icon, dot}`, U1/U2 — split por `react-refresh`).
- `BarraProgreso.tsx` (U8, local, NO en `ui/`; relleno `bg-brand-primary`, 100 % / hito
  `bg-brand-gold`).
- `lib/utils.ts`: `formatFecha` / `formatFechaHora` / `diasHasta` (U7, sin `date-fns`).

### Verificación
`tsc -b` + `eslint` + `vite build` limpios. `npm ls react` sin duplicados.

**Pendiente del Ciclo B:** prueba en vivo con navegador (cuenta admin + operativo) —
necesita `backend/.env` + `web/.env` del fundador. Cubre el 403 del operativo (D6), el
arrastre real, el desbloqueo de tareas al completar un hito, la campana, y el barrido manual.

### Fase 5 del Ciclo B — auditoría (2026-09-02)

**Frontend Developer**, **Accessibility Auditor**, **Code Reviewer** — los tres **APRUEBA
CON CAMBIOS**. La Accessibility Auditor marcó **2 bloqueantes de nivel A**; el resto son
serios/medios/menores. Todo aplicado en el commit `9fc7414`.

**Bloqueantes (a11y) — cerrados:**
- **Asa de arrastre dedicada** — `dragHandleProps` va SOLO en un botón "agarre"
  (`GripVertical` + `aria-label`), no en un `div role="button"` con `<Link>`/`<select>`
  anidados (WCAG 4.1.2). `ProyectoCard`/`TareaCard` + `ProyectosPage`/`TareaKanban`.
- **`aria-label` de "Mover a"** empieza por el texto visible: `"Mover a otra columna:
  <nombre>"` (WCAG 2.5.3 Label in Name).

**Serios — cerrados:**
- **`Dialog`: contador de referencias del `inert`** de `#root` → soporta diálogos apilados
  (la campana sobre otro diálogo ya no rompe la trampa de foco).
- **Anuncios de arrastre en español** — `onDragStart/Update/End` con `provided.announce()`
  (nuevo `components/proyectos/dndAnuncios.ts`), ambos tableros (U5).

**Medios / convergentes (FD/CR/A11Y) — cerrados:**
- Estado de error del tablero: `try/catch` en `useTableroProyectos.fetchPage` + `error`
  por columna + "Reintentar"; `mover` revierte por **snapshot** y reconcilia la columna
  destino al éxito; objetos de columna frescos (no compartir `COL_VACIA`).
- `ProyectoDetallePage`: `:id` no numérico → `<Navigate to="/proyectos">` (antes skeleton
  infinito). `esGestor` a `<TareaKanban>` para el gate correcto de `bloqueada` (CR#1).
  Mover tarea envía el `orden` de destino (CR#8).
- Pestañas: `SegmentedControl` expone `tabIdPrefix`; los `role="tabpanel"` con
  `aria-labelledby` (detalle → `pd-*`, diálogo de tarea → `td-*`, sin colisión).
- `onError` + toast en todas las mutaciones que faltaban (responsable, asignarme,
  comentar/borrar, registrar/borrar horas, completar hito, notificaciones, mover proyecto).
- Invalidación de `['proyectos-resumen']` (registrar horas, completar hito) y
  `['notificaciones']` (completar hito — M5).
- `ParteHoras` no consulta con la pestaña oculta; `TareaKanban.porColumna` con `useMemo`;
  diálogos "Nuevo*" montados condicionalmente (no conservan lo tecleado).

**Menores de a11y — cerrados:** `EmptyState "Sin tareas"`, `sr-only` en skeletons,
`aria-label` en `BarraProgreso` y "Ordenar proyectos", tipo de notificación con `sr-only`,
marca "Sin leer" (no solo color), foco a la confirmación de borrado, focus-ring en los
inputs nuevos, `text-tertiary`→`text-secondary` en textos <18px, punto de columna
`en_pausa` distinto, fecha de horas con `formatFecha`. Lint nit de `SegmentedControl`
(`no-useless-assignment`) arreglado de paso.

**Diferido / documentado (no accionado):**
- **Toggle "Todas / Mías" (U12) + filtros cliente/material (G5):** necesitan una consulta
  de backend nueva (proyectos donde el usuario tiene tareas asignadas / facetas). El
  operativo ya ve el tablero completo (D6). El código muerto de filtro en cliente se quitó.
  **→ Decisión del fundador si se quiere en un ciclo posterior.**
- **Toolbar con `<input>`/`<select>` crudos** (FD#6): se acepta — llevan `aria-label` +
  tokens + focus-ring; un `<label>` visible por control recargaría la barra de filtros.
- **Responsable desactivado se muestra "Sin responsable"** (CR#7): borde raro; los usuarios
  se desactivan, no se borran, y los permisos siguen bien por id. Sin acción.
- **`AppLayout` enfoca `<main>` y no el `<h1>` de `PageHeader`** (A11Y-15) y **contraste
  del toast de éxito** (A11Y-16): defectos **pre-existentes** de `AppLayout`/`Toast.tsx`,
  fuera del alcance de este módulo.
- **`outline-none` en los primitivos `SelectField`/`DateField`** (A11Y-10): los inputs
  nuevos del módulo llevan focus-ring; cambiar los primitivos compartidos es un cambio
  transversal fuera de alcance.

`tsc -b` + `eslint` + `vite build`: limpios.

**Ciclo B CERRADO.**

### Prueba en vivo (2026-09-02, cuenta admin "Ana")

Servidores locales (`uvicorn` :8000 contra Supabase real `hrmpyhixhbnkkpvxtuit`, `vite`
:5174). Recorrido con la extensión de Chrome:
- ✅ Crear proyecto → tablero + resumen.
- ✅ Hito + tarea dependiente → nace `bloqueada`.
- ✅ Completar hito → toast "1 tarea desbloqueada" + la tarea salta a `por_hacer`.
- ✅ Mover tarjeta ("Mover a"), diálogo de tarea, registrar horas (total, autor, fecha),
  comentar.
- ✅ Barrido diario → marca "en riesgo" + notificación + **2ª corrida idempotente**.
- ✅ Campana muestra el contador y la notificación.

**Bug encontrado y corregido** (`b1825a5`): el barrido reventaba con `TypeError: dict is
not a sequence` — el `%` literal de *"% de avance"* en el SQL colisiona con el parseo de
parámetros de psycopg2. Fix: `%%`. No lo cazó la prueba SQL previa (el MCP `execute_sql` no
interpola). Verificado en vivo.

### Ronda de pulido de UI (2026-09-02, feedback en vivo del fundador) — commit `23f7b8a`

- **Cursor de "mano"** en las tarjetas de tarea y proyecto (faltaba `cursor-pointer` — en
  Tailwind v4 el `<button>` ya no lo trae) + tinte de título en hover.
- **Modal de tarea recortado / doble scroll** en pantallas bajas: el primitivo `Dialog`
  ahora acota el panel a `max-h-[calc(100dvh-2rem)]` con su propio scroll (uno solo, sin
  recorte); `TareaDialog` deja de anidar su `max-h-[75vh]`; el overlay pasa a
  `items-start` + `overflow-y-auto`. Cambio en el primitivo → aplica a todos los diálogos
  (defensivo, los cortos no se ven afectados).
- **Recuadro "Título" desbordado**: el `:focus-visible` global (outline 2px + offset)
  sobresalía del modal → los inputs de los diálogos del módulo pasan a
  `focus-visible:outline-none` + anillo `ring-inset` contenido.
- **Cronograma**: ancho acotado y centrado (`max-w-2xl`), cabecera "N de M hitos cumplidos"
  + botón, fila de hito con estilo de "completado", "Vencía …" en pasado, conteo de tareas
  dependientes, hito atrasado en rojo.
- **Tiempos**: ancho acotado (`max-w-3xl`), tarjetas de resumen con sub-etiqueta ("38% del
  estimado", "bajo/sobre lo estimado"), tabla en `<Card>` con hover de fila.

**Pendiente:** prueba en vivo con la cuenta **operativo (Beto)** — verificar Regla 6 (ve
todo, sin botones de gestión, 403 al forzar) — y luego fusionar a `master`.
