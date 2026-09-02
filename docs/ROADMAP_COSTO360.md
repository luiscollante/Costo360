# ROADMAP_COSTO360.md — Ruta de desarrollo completo

*Creado el 2026-08-26. Convierte los 5 objetivos que el fundador definió en esa fecha en un plan
por fases, con dependencias explícitas. Cuando estos 5 objetivos se completen, este documento se
actualiza con la siguiente ronda de objetivos — no se reemplaza, se extiende.*

---

## Los 5 objetivos (tal como los definió el fundador, 2026-08-26)

1. Rediseño de la interfaz del producto de Costo360 (la que usan los talleres clientes) — **sin
   cambiar los cálculos ni la lógica del motor ya establecidos.**
2. Landing page de gran impacto — animaciones e interfaz entretenida y atrapante.
3. Creación de los agentes de IA que operan casi el 100% de Costo360 S.A.S. (empresa todavía no
   constituida legalmente).
4. Infraestructura **gratuita** para esos agentes de IA, lista para migrar a infraestructura de
   pago (Microsoft/Azure/Railway) cuando haya presupuesto real.
5. Agente de IA integrado en el producto — asistente personal por usuario, navega la interfaz de
   forma autónoma para maximizar la eficiencia al cotizar.

## Objetivos añadidos después del 2026-08-26

6. **Módulo de gestión de proyectos** (añadido 2026-09-01) — integrar en Costo360 un sistema
   integral para llevar cada trabajo *después* de cotizarlo: proyectos (tablero Kanban por
   estado), tareas, hitos con dependencias, registro de horas, comentarios, notificaciones
   automáticas, un asistente de IA que opera y analiza los datos, y automatizaciones diarias.
   El fundador lo construyó como prototipo en **Base44** (`gestion-inventario-nuevo-modulo.zip`
   en la raíz) — hay que **reimplementarlo nativo** en el stack de Costo360 (React 19 +
   FastAPI + Supabase), no se puede "pegar" tal cual. Análisis completo abajo, en la Fase 2.D.

---

## Por qué no se atacan los 5 al mismo tiempo

Costo360 se construye con una sola persona (el fundador, no programador) + Claude Code — no hay
equipo. Atacar 5 frentes simultáneos diluye el trabajo sin avanzar ninguno de verdad. En cambio, se
agrupan por **dependencia técnica real**, no por orden de preferencia:

- El **Objetivo 1** tiene una regla no negociable — "ningún cliente ve datos de otro" — que hoy es
  **imposible de cumplir** porque la base de datos no tiene el concepto de "empresa" en ninguna
  tabla (hallazgo documentado en `ARQUITECTURA_MAESTRA.md`, sección 4). Rediseñar la interfaz sobre
  esa base sería maquillar el problema, no resolverlo.
- El **Objetivo 5** (agente dentro del producto) necesita que la interfaz nueva del Objetivo 1 ya
  exista, para que el agente tenga algo sobre lo cual navegar.
- Los **Objetivos 3 y 4** (agentes de operación de la empresa) viven en una carpeta aparte
  (`agentes-operacion/`), no tocan `web/` ni `backend/` — pueden avanzar en paralelo sin chocar con
  el resto.
- El **Objetivo 2** (landing page) es independiente de todo lo anterior — es su propio sitio.

---

## Fase 0 — Fundamento del proyecto (completada 2026-08-26)

- ✅ Harness completado (`HARNESS_INICIO.md`, `ARQUITECTURA_MAESTRA.md`, `PATRONES_DE_ERROR.md`).
- ✅ Este documento de ruta.

---

## Fase 1 — Resolver el bloqueo técnico del Objetivo 1 ✅ esquema creado 2026-08-26/27

**Qué es:** darle a la base de datos el concepto de "empresa" (aislamiento multi-tenant) para que
la Regla 1 ("ningún cliente ve datos de otro") sea real y no solo una intención. Esto incluye,
como mínimo:
- Agregar `empresa_id` a las tablas que hoy no lo tienen (`usuarios`, `cotizaciones`, `app_config`,
  inventario, retales, catálogo).
- Definir cómo nace una "empresa" en el sistema (alta de una cuenta nueva = alta de una empresa).
- Convertir `usuarios.rol` (hoy texto libre) en un catálogo cerrado de permisos, con nombre visible
  editable por el Admin (Regla 3).
- Sentar las bases para la sesión única con control real (Regla 5) — no necesariamente
  implementarla completa en esta fase, pero sí dejar la estructura de datos lista.

**Por qué va primero:** todo lo demás del Objetivo 1 (pantallas, navegación, componentes) se
construye sobre esto. Hacerlo después obligaría a rehacer trabajo.

**Cómo se abordó:** ciclo `/goal` completo (Planear → Validar → Ejecutar → Validar → Guardar, ver
`HARNESS_INICIO.md`) — planeado, auditado en dos pasadas independientes (Security Engineer sobre el
plan, Database Optimizer sobre el SQL concreto), corregido tras ambas rondas, y aplicado al proyecto
Supabase real (organización "Costo360", antes vacía). Ver `ARQUITECTURA_MAESTRA.md` sección 4 para
el detalle completo y `backend/migrations/0001_esquema_multitenant.sql` +
`0002_revocar_anon_empresa_actual.sql` para el SQL exacto que se aplicó.

**✅ Completado 2026-08-27 (rama `goal/fase-2a-multitenant-auth`, ciclo `/goal` completo):**
la migración a Supabase Auth, `backend/db/client.py` con `db_rls` (RLS real en el backend) +
`db_service`, el trigger de aprovisionamiento (`handle_new_user` gateado por la tabla
`invitaciones`), el trigger de cupo por plan, la sesión única con aviso real (Regla 5), y el
frontend sobre Supabase Auth. Migraciones `0003`/`0004` aplicadas. Auditado en Fase 2 (plan) y
Fase 5 (código) por 4 agentes; aislamiento verificado por SQL. **Falta solo la prueba en vivo
por HTTP (B8), que necesita el `.env` del fundador**, y fusionar la rama a `master`. Detalle:
`docs/PLAN_FASE_2A.md`.

---

## Fase 2 — Frentes en paralelo

Una vez resuelto el fundamento de la Fase 1, estos frentes no se pisan entre sí y pueden
avanzar en el orden que el fundador prefiera sesión a sesión. (2.A ✅ completado; 2.D añadido
2026-09-01.)

### 2.A — Objetivo 1: Rediseño de la interfaz del producto  ✅ **COMPLETADO (2026-09-01, fusionado a `master`)**

> **Insumos:** `docs/REVISION_UX_2026-08-29.md` (revisión por 3 agentes) + `docs/PLAN_REDISENO_VISUAL.md`
> (plan de ejecución, auditado en Fase 2 y Fase 5, partido en 2 ciclos).

Sobre la base de datos ya multi-tenant **y el backend ya aislado + con Supabase Auth**: nuevas
pantallas/componentes para los módulos existentes, aplicando las 8 reglas de arquitectura y la
identidad de marca real (`ARQUITECTURA_MAESTRA.md`, secciones 6-7). **No se tocaron
`motor/calculos.py` ni `motor/parametros.py`**.

- **✅ Ciclo 1 (2026-08-30):** fundamento — capa de tokens con contraste AA, eliminación del
  modo oscuro, barra lateral esmeralda, shell (skip-link, foco/título por ruta, nombre de
  empresa), logo real del fundador, reconstrucción del flujo de carga inicial + `RoleRoute`,
  limpieza del piloto. Backend aditivo: `empresa_nombre` en `/api/auth/me` + `require_dashboard`
  en 3 GET.
- **✅ Ciclo 2 (2026-08-31):** `R3` 14 primitivos accesibles en `web/src/components/ui/`; `R6`
  las 13 pantallas a `<PageHeader>` + barrido de color de marca + `formatPct`; `R10` selector
  de material como diálogo + **catálogo de materiales editable por taller** (migración `0005`
  + `0006` copy-on-write); `R9` verificación. Fase 5: Code Reviewer + Accessibility Auditor.
- **✅ Ronda de revisión en vivo del fundador (2026-09-01):** bug de scroll del sidebar, CORS
  por puerto, dashboard por zona horaria, glassmorphism, catálogo por modal, Express, Historial
  optimista, dorado más oscuro, menú reorganizado "por área del negocio". Detalle en `SESSION.md`.
- **✅ Fusionado a `master`** (merge `f5fb7f4`); ramas `goal/rediseno-visual` y
  `goal/fase-2a-multitenant-auth` borradas; grafo `codebase-memory` reindexado contra `master`.

### 2.B — Objetivo 4: Infraestructura gratuita para los agentes de operación
Montar la versión gratuita del diseño ya definido en `docs/ARQUITECTURA_AGENTES_OPERACION.md`:
Postgres/pgvector (puede compartir el proyecto Supabase existente en su capa gratuita, con
`schema` separado), hosting gratuito para el proceso de los agentes (alternativa gratuita a Azure
Container Apps mientras no haya presupuesto — a decidir en el ciclo de esta fase), Langfuse
autoalojado (ya es gratis por diseño). Dejar documentado en `ARQUITECTURA_MAESTRA.md` cuál pieza
migra a cuál servicio de pago cuando llegue la inversión.

### 2.C — Objetivo 3: Primer agente de operación real
Con la infraestructura de 2.B lista, construir el primer agente (Atención al Cliente, ya elegido
como el primero en `docs/ARQUITECTURA_AGENTES_OPERACION.md` sección 0) en `agentes-operacion/`. Los
otros 6 agentes se construyen uno a la vez después, reutilizando la misma base.

### 2.D — Objetivo 6: Módulo de gestión de proyectos  (añadido 2026-09-01, prototipo en Base44)

**Qué es.** Un sistema completo para gestionar cada trabajo *después* de cotizarlo. El fundador
lo construyó con otra IA como app **Base44** — `gestion-inventario-nuevo-modulo.zip` en la raíz
(≈135 archivos, ≈8.500 líneas; el nombre del zip dice "inventario" pero el contenido es
**gestión de proyectos**, no el módulo de Inventario/láminas que ya existe).

**Funcionalidades del prototipo:**
- **Proyectos** — tablero Kanban por estado (planificación → activo → en revisión → completado
  → pausado/cancelado/archivado). Campos `client` y `material` (enlazan con el dominio de
  Costo360). % de avance, marca de riesgo, 3 vistas (Operativa / Cierre / Archivo), filtros,
  paginación en el backend.
- **Tareas** — Kanban por proyecto (bloqueada / por hacer / en progreso / revisión /
  completada), prioridad, responsable, fecha límite, horas estimadas, dependencia de un hito,
  orden por arrastre.
- **Hitos** — línea de tiempo por proyecto; al completar un hito se desbloquean sus tareas.
- **Registro de horas** — por tarea (horas, fecha, nota); vista de parte de horas; análisis
  estimado vs. registrado.
- **Comentarios** — por tarea.
- **Notificaciones automáticas** — tarea desbloqueada, plazo próximo/vencido, hito en riesgo,
  proyecto en riesgo.
- **Asistente de IA** ("asistente_costo360") — conversacional: **opera** los datos (crear/
  editar/borrar proyectos, tareas, hitos, comentarios, horas por lenguaje natural, con
  confirmación antes de borrar) y **asesora** (resúmenes ejecutivos, análisis de avance,
  cuellos de botella, riesgos, recomendaciones priorizadas). Con memoria. Página propia +
  widget flotante en toda la app.
- **Automatizaciones** — barrido diario 7:00 (America/Bogotá): desbloqueos, alertas de plazo/
  riesgo, archivado de completados > 30 días; y recálculo del % del proyecto al cambiar tareas.
- **Tour de bienvenida** guiado.

**Por qué NO se puede "pegar" tal cual.** Es una app Base44: entidades (= tablas), auth, el
agente de IA, las funciones de servidor y los workflows programados **corren en la plataforma
Base44**, no son código portable. La carpeta `base44/` es una especificación declarativa que
Base44 interpreta; el frontend habla con ella vía `@base44/sdk`. Integrarlo en Costo360 =
**reimplementarlo nativo**:
- **Datos** → 6 tablas nuevas en Supabase (`projects`, `tasks`, `milestones`, `time_entries`,
  `comments`, `notifications`) con `empresa_id` + RLS en todas (Regla 1) → migración `0007`.
- **CRUD** → routers FastAPI nuevos bajo `db_rls` (patrón `materiales.py` / `cotizacion.py`).
  Las consultas `$regex`/`$or` de Base44 se reescriben como SQL parametrizado.
- **3 funciones de servidor** → endpoints FastAPI + un planificador (el backend es
  long-lived, no serverless: `apscheduler` o un `/cron/*` disparado desde fuera).
  `recalcProjectProgress` puede vivir dentro del propio endpoint de tareas.
- **Realtime** (suscripciones de Base44) → Costo360 no tiene realtime; empezar con
  refetch/polling de react-query (las actualizaciones optimistas del tablero ya funcionan sin
  realtime), y evaluar Supabase Realtime más adelante.
- **Asistente de IA** → es la pieza mayor y **se solapa con el Objetivo 5** (agente en el
  producto). Costo360 ya tiene un agente (`api/agente.ts`, chat de Parámetros, Gemini). Este
  asistente ("operar entidades + consultoría") es justo hacia donde iba el Objetivo 5 — puede
  **ser su base** o construirse primero acotado a proyectos. **Decisión de la Fase 0 del
  ciclo `/goal`.**
- **Auth** → se descarta toda la del módulo (Login/Register/OAuth/AuthContext); Costo360 ya
  tiene Supabase Auth + roles + RLS.
- **UI** → las pantallas (Panel, tablero de Proyectos, detalle, línea de tiempo, parte de
  horas, chat, notificaciones) se **reconstruyen con los primitivos `ui/` y los tokens de
  marca de Costo360** (el prototipo usa otro verde `#1F6F54`/`#C9A45C` y otro set shadcn).
- **Menú** → sección nueva en la barra lateral (encaja con la estructura "por área del
  negocio": un grupo "Proyectos", o dentro de uno existente).
- **Seguridad del prototipo:** escaneado — sin secretos ni patrones maliciosos. Solo se quita
  el plugin de Vite de Base44 (`visualEditAgent`, `analyticsTracker`) y el acoplamiento al SDK.

**Tamaño.** Es un objetivo **grande** — dominio funcional nuevo + su propio agente +
automatizaciones + 6 tablas con RLS. Ciclo `/goal` **multi-ciclo**, como el rediseño.

**Insumo vivo:** el zip extraído sirve de **prototipo/especificación detallada** — funciona,
está bien pensado, y define el comportamiento exacto a replicar.

---

## Fase 3 — Objetivo 5: Agente de IA dentro del producto

Una vez la interfaz nueva del Objetivo 1 exista (Fase 2.A completada), evolucionar el agente actual
de Parámetros hacia el asistente personal por usuario que navega la interfaz de forma autónoma
(CopilotKit/AG-UI, decisión de la Ruta A) — sin reemplazar nunca la navegación manual (Regla 7).

---

## En paralelo, en cualquier momento — Objetivo 2: Landing page

No depende de ninguna otra fase. El scaffold ya existe
(`web/src/pages/LandingPage.tsx` + `web/src/components/landing/` +
`web/src/components/ui/*` para efectos). Se puede trabajar cuando el fundador quiera ver algo
visualmente vistoso pronto, sin esperar a que avancen las otras fases.

---

## Cómo se actualiza este documento

Cada vez que una fase avanza o se completa, se marca aquí (✅) y se actualiza `PROGRESS.md`/
`SESSION.md` con el detalle día a día. Cuando los 5 objetivos originales estén completos, se agrega
una nueva sección "Ronda 2" con los siguientes objetivos que el fundador defina — este documento no
se reemplaza, se extiende.
