# PROGRESS.md — Estado del Proyecto Costo360

---

## ✅ Hecho

- **Rediseño del modal de notificaciones del módulo de Proyectos (2026-09-04):**
  ciclo `/goal` completo (Fases 0-6), directo en `master` (cambio acotado, solo
  presentación, no ameritaba rama aparte). Fase 1 (plan) por un Frontend
  Developer; Fase 2 (auditoría del plan) por Accessibility Auditor + Code
  Reviewer, ambos "APRUEBA CON CAMBIOS" (ajustes menores ya incorporados al plan
  antes de ejecutar, sin necesidad de volver a Fase 1); Fase 5 (auditoría del
  resultado ejecutado) por UI Designer + Minimal Change Engineer, ambos
  "APRUEBA" sin bloqueantes. 3 micro-commits (`a80ef83`, `17eecfa`, `d550201`).
  - **Motivo:** el fundador probó la ronda de bugs del 2026-09-03 y, en el
    camino, pidió mejorar el diseño del modal de notificaciones (`CampanaNotificaciones.tsx`),
    que quedó funcional pero visualmente plano en esa ronda.
  - **5 puntos implementados** (el 5º se agregó a pedido del fundador después de
    la aprobación inicial de los primeros 4, incorporado al mismo ciclo antes de
    ejecutar): icono de cada notificación con chip circular de fondo por
    categoría (verde/dorado/rojo, reutilizando los mismos pares `-soft` que ya
    usa `Badge.tsx` — sin colores nuevos); línea divisoria bajo el encabezado
    para unir visualmente el título y el botón "Marcar todas como leídas";
    hover unificado en todas las filas (antes solo las que llevan a un
    proyecto reaccionaban al pasar el mouse); timestamp relativo en español
    ("Hace 2 horas", "Ayer", fallback a fecha absoluta desde los 7 días) con la
    fecha exacta disponible como tooltip nativo (`<time title=...>`); y ese
    texto relativo se refresca solo cada 30s mientras el modal permanece
    abierto (antes se congelaba, ya que el componente no tiene `refetchInterval`
    a propósito).
  - **Archivos tocados:** `web/src/components/proyectos/CampanaNotificaciones.tsx`,
    `web/src/components/proyectos/badges.tsx` (`NotifIcono`), y el helper nuevo
    `formatRelativo` en `web/src/lib/utils.ts`. No se tocó `Dialog.tsx` (genérico,
    compartido), `badgeMeta.ts`, ni la lógica de datos/queries del componente.
  - **Verificado en vivo** (navegador, cuenta Ana/admin): sin errores de
    consola, `tsc -b` limpio. Nota de pulido menor anotada por ambos
    auditores de Fase 5 (no bloqueante, preexistente): el tono `'gold'` de
    `NOTIF_META.recordatorio` no tiene rama propia en `NotifIcono` y cae en los
    estilos de `warning` — visualmente casi idéntico, queda como posible
    follow-up si se quiere un dorado propio para ese tono.
  - **Fuera de este ciclo, sin tocar (a pedido explícito del fundador):** el
    asa de arrastre pequeña del tablero Kanban de Proyectos (`ProyectoCard`/
    `TareaCard`) — es un arreglo deliberado de accesibilidad (WCAG 4.1.2,
    auditoría del 2026-09-02) y NO se debe revertir a "tarjeta completa
    arrastrable" sin rediseñar la interacción completa; ver la conversación de
    esta sesión para el detalle de por qué.

- **Ronda de bugs post-lanzamiento del módulo de Proyectos + wizard de Cotización
  (2026-09-03):** ciclo `/goal` completo (Fases 0-6) sobre 6 problemas reportados
  por el fundador tras explorar el módulo recién fusionado, agrupados en 4 causas
  de fondo reales. Todo directamente en `master` (no ameritaba rama aparte — son
  correcciones puntuales, no una feature nueva), un commit por frente + 2 commits
  de arreglos de las auditorías de Fase 5. Fase 2 auditada por Backend Architect +
  Frontend Developer + Minimal Change Engineer; Fase 5 por Code Reviewer +
  Accessibility Auditor (los 5, distintos entre fases).
  - **Rendimiento del tablero de Proyectos** (`useTableroProyectos.ts`,
    `api/proyectos.ts`): medido con `performance.getEntriesByType` en el
    navegador real — el tablero disparaba 5-7 peticiones paralelas por carga
    (una por columna + resumen + notificaciones), sin cancelar las obsoletas al
    cambiar de pestaña/filtro (React StrictMode las duplicaba en dev). Ahora
    cancela de verdad con `AbortController` en el cleanup del efecto, distingue
    cancelación de error real, y reintenta una vez ante fallos transitorios
    (timeout/5xx, nunca 4xx) antes de mostrar "No se pudo cargar esta columna".
    Se descartó a propósito combinar las 5-7 peticiones en un endpoint nuevo —
    los auditores recomendaron medir primero con este cambio más acotado.
  - **Arrastrar-y-soltar roto + columnas sin altura fija** (`ProyectosPage.tsx`,
    `TareaKanban.tsx`, `index.css`): causa raíz confirmada por un warning real de
    `@hello-pangea/dnd` en consola ("nested scroll container") — el scroll
    vertical de cada columna dependía de `<main>` (compartido por toda la app) en
    vez de tener el suyo propio. Aplicado el patrón exacto del prototipo Base44
    (`gestion-proyectos-nuevo-modulo.zip`, inspeccionado a pedido del fundador):
    altura acotada de página + cada columna con su propio `overflow-y-auto`.
    Alcance: solo escritorio (`md:` y superior), decisión explícita del fundador
    — Proyectos no tiene versión de móvil probada todavía, el arrastre en móvil
    queda pendiente. Verificado en vivo: el warning de consola desapareció por
    completo (antes 5 por carga, después 0) en las 3 vistas.
  - **Modal de "sesión en otro dispositivo"** (`SessionGuard.tsx`,
    `backend/routers/session.py`): decisión del fundador — se quita el período de
    gracia de 30 segundos antes de poder forzar el cambio (`_GRACE_S=0` en
    backend y frontend), queda disponible de inmediato. Corregido el contraste
    bajo (`text-brand-muted` sobre fondo `.glass` compuesto → botones a fondo
    sólido + `text-brand-text`, ajustado una segunda vez tras la auditoría de
    Fase 5 porque el primer arreglo seguía sin pasar AA sobre ese fondo real).
  - **Wizard de Nueva Cotización, fase Resultado** (`CotizacionPage.tsx`):
    **bug real encontrado y corregido** — el botón "Anterior" llamaba
    `setPaso(3)`, el mismo paso "Resultado" en el que ya se está (paso 2 =
    Proyecto), así que nunca navegaba a ningún lado; corregido a `setPaso(2)`,
    verificado en vivo (vuelve a "Proyecto" con los datos conservados). Quitado
    el botón "Calcular" duplicado. Tarjetas de esa fase (`.glass` → superficie
    sólida) y botón "Guardar cotización" reforzado a fondo sólido — antes casi
    invisible al 10% de opacidad, con jerarquía visual invertida frente a "Nueva
    cotización".
  - **Regla CSS global `button:not(:disabled) { cursor: pointer }`** en
    `index.css` (dentro de `@layer base`, corregido tras la Fase 5 — sin capa le
    ganaba al `cursor-grab` de las asas de arrastre) — cierra en toda la app el
    olvido recurrente de `cursor-pointer` por botón (Tailwind v4 quita el cursor
    por defecto de `<button>`; ya se había parchado uno por uno en Proyectos).
  - **2 hallazgos reales de las auditorías de Fase 5, corregidos**: contraste
    insuficiente del modal de sesión sobre su fondo compuesto real (no crema
    plano), y `--board-viewport-h` con una fórmula que asumía un padding-top que
    en realidad pierde contra `sm:p-6` en el rango 640-1023px (verificado contra
    el CSS compilado real, no en teoría).
  - **Pendiente honesto:** no logré simular de forma confiable un arrastre real
    de mouse con las herramientas de automatización del navegador (limitación
    conocida de este tipo de librería de drag-and-drop) — la corrección de raíz
    quedó verificada por la desaparición del warning de consola y por arrastre
    de columna independiente confirmado visualmente, pero el fundador debería
    hacer una prueba manual de arrastre real para cerrar el loop del todo.

- **Objetivo 6 — Módulo de gestión de proyectos: CICLO A + CICLO B completados (2026-09-02):**
  rama `goal/modulo-proyectos` (sobre `master`, con el rediseño visual ya fusionado).
  Reimplementación **nativa** (React 19 + FastAPI + Supabase) del prototipo que el fundador
  construyó en Base44 (`gestion-proyectos-nuevo-modulo.zip`): proyectos en tablero Kanban,
  tareas, hitos con dependencias, registro de horas, comentarios, notificaciones y barrido
  diario de automatizaciones. El asistente de IA del módulo queda **fuera** de este ciclo — se
  funde con el Objetivo 5 (decisión D2). Ciclo `/goal` completo, partido en 2 por recomendación
  de los auditores (mismo patrón que el rediseño visual). Plan vivo, con el detalle exacto de
  cada bloque y cada hallazgo de auditoría: `docs/PLAN_MODULO_GESTION_PROYECTOS.md`.
  - **Fase 1-2 (plan + auditoría del plan):** planeado por Software Architect / Database
    Optimizer / Frontend Developer / Product Manager. Auditado por 3 agentes distintos
    (**Security Engineer, UX Architect, Minimal Change Engineer**), los 3 "APRUEBA CON
    CAMBIOS" — se incorporaron todos los ajustes al plan antes de ejecutar (lista blanca de
    columnas editables por un no-gestor, autoría server-side, barrido set-based sin bucle bajo
    BYPASSRLS con `empresa_id` explícito en cada sentencia, `ProjectStatusBadge`/
    `TaskStatusBadge`, alternativa de teclado al arrastre, entre otros). El fundador decidió
    partir el ciclo en dos.
  - **Ciclo A — datos + backend (G0-G3):**
    - Migración `0007_gestion_proyectos.sql` **aplicada** a Supabase `hrmpyhixhbnkkpvxtuit`: 6
      tablas nuevas (`pm_projects`, `pm_tasks`, `pm_milestones`, `pm_time_entries`,
      `pm_comments`, `pm_notifications`), todas con `empresa_id` + RLS `enable`/`force` +
      policy `FOR ALL TO authenticated` (Regla 1), aislamiento estructural padre-hijo con
      `UNIQUE(id, empresa_id)` + FK compuestas.
    - `backend/routers/proyectos.py` (29 rutas bajo `db_rls`) — la jerarquía interna (Regla 2,
      decisión **D6: "el operativo ve todo el tablero del taller, solo edita lo suyo"**) se
      aplica en Python, no en RLS (RLS solo separa talleres).
    - `backend/routers/proyectos_cron.py` — barrido diario (desbloqueo de tareas al completar
      un hito, recordatorios de plazo, hitos/proyectos en riesgo, archivado a 30 días),
      protegido por `X-Cron-Secret`, set-based sin bucle, idempotente por `dedupe_key`.
    - **Fase 5 del Ciclo A** (Code Reviewer + Backend Architect + Database Optimizer, los 3
      "APRUEBA CON CAMBIOS", sin bloqueantes): arreglos aplicados + migración
      `0008_gestion_proyectos_endurecimiento.sql` (`completado_en`, `numeric(7,2)`, FK
      compuesta de `milestone_id`, índices). Verificado por SQL con rollback: aislamiento
      entre empresas, `WITH CHECK`, FK cross-tenant bloqueada, fail-closed sin claims,
      idempotencia del barrido — todo OK.
  - **Ciclo B — interfaz completa (G4-G7):**
    - Menú lateral "Proyectos" + rutas `/proyectos` y `/proyectos/:id`.
    - `ProyectosPage.tsx` (tablero Kanban con `@hello-pangea/dnd@18.0.1`, vistas
      Operativa/Cierre/Archivo, franja de resumen) y `ProyectoDetallePage.tsx` (tablero de
      tareas, cronograma de hitos, parte de horas) — construidos 100% sobre los 14 primitivos
      `ui/` y los tokens de marca; nada del verde/dorado del prototipo Base44.
    - Campana de notificaciones en ambos headers de `AppLayout`.
    - **Fase 5 del Ciclo B** (Frontend Developer + Accessibility Auditor + Code Reviewer, los 3
      "APRUEBA CON CAMBIOS"): **2 bloqueantes de accesibilidad nivel A corregidos** (asa de
      arrastre dedicada en vez de un `div role="button"` con controles anidados; `aria-label`
      de "Mover a" que empieza por el texto visible), más arreglos serios/medios (trampa de
      foco con diálogos apilados, anuncios de arrastre en español, manejo de error por columna
      del tablero con reintentar).
  - **Prueba en vivo (2026-09-02, cuenta admin "Ana"):** crear proyecto, hito + tarea
    dependiente que nace bloqueada, completar hito → desbloqueo con toast, mover tarjetas,
    registrar horas, comentar, barrido diario (2ª corrida idempotente), campana. **Bug real
    encontrado y corregido** (`b1825a5`): el barrido reventaba con `TypeError: dict is not a
    sequence` — el `%` literal del mensaje "% de avance" colisionaba con el parseo de
    parámetros de psycopg2 (fix: `%%`). No lo cazó la prueba SQL previa porque el MCP
    `execute_sql` no interpola parámetros.
  - **Ronda de pulido de UI** (feedback en vivo del fundador, commit `23f7b8a`): cursor de mano
    en tarjetas de tarea/proyecto; modal de tarea con doble scroll/recorte corregido — cambio
    en el primitivo `Dialog` (`max-h-[calc(100dvh-2rem)]` con su propio scroll), aplica a toda
    la app, no solo a Proyectos; foco visible que se desbordaba del modal; cronograma y parte
    de horas con mejor jerarquía visual (ancho acotado, tarjetas de resumen, hitos atrasados en
    rojo).
  - **Pendiente:** prueba en vivo con la cuenta **operativa** (Regla 2/D6 — ve todo el
    tablero, sin botones de gestión, 403 al forzar una acción de gestor o editar una tarea
    ajena) y **fusionar `goal/modulo-proyectos` a `master`**.

- **Rediseño visual del producto — CICLO 1 + CICLO 2 completados (2026-08-30/31):** rama
  `goal/rediseno-visual` (sobre `master`, Fase 2.A ya fusionada). Objetivo 1 del roadmap
  cerrado a falta de la fusión a `master`. Ciclo `/goal` completo:
  plan → auditoría Fase 2 (UX Architect + Frontend Developer, ambos "aprueba con cambios",
  ambos pidieron partir en 2 ciclos) → ejecución → **Fase 5 (Code Reviewer + Accessibility
  Auditor, ambos "aprueba con cambios", guardarraíles confirmados: motor intacto,
  `SessionGuard` sin cambios de lógica, RLS sin tocar)**. Plan vivo: `docs/PLAN_REDISENO_VISUAL.md`.
  - **7 bloques (R0, R1, R2, R4, R5, R7, R8) + correcciones del fundador y de la Fase 5**,
    ~22 commits (`a5292cf`…`441af59`), `tsc -b` + `vite build` limpios en cada uno.
  - **R0** backend (único cambio, aditivo): `empresa_nombre` en `/api/auth/me`;
    `Depends(require_dashboard)` en `GET /api/parametros`, `/api/config/empresa`,
    `/api/config/logo` (el rol operativo ya no los lee; verificado que no rompe cotizar).
  - **R1** capa de tokens con contrastes recalculados a WCAG AA (`text-secondary #5F5F5F`,
    `-tertiary #6E6E6E`, estados con token de texto vs. relleno, esmeralda). `Inter` fuera.
    `:focus-visible` global. `@media (prefers-reduced-motion)`. `formatPct` + clase `.num`.
  - **R2** modo oscuro ELIMINADO (hook `useTheme`, botones, `<script>` de `index.html`,
    orbes). Barra lateral `.glass-emerald` (verde real del isotipo `#00472B`, glassmorphism,
    texto crema/blanco sólido). `<MotionConfig reducedMotion="user">` + `useCountUp` con
    `matchMedia`.
  - **R4** shell: skip-link, foco al `<main>` + `document.title` por ruta, nombre de empresa
    en la barra superior.
  - **R5** componente `Logo` con el arte real del fundador (`logo.png` blanco para fondos
    oscuros, `logo_versiones_oscuras.png` tinta oscura para fondos claros). `manifest.json`
    reescrito (adiós "Costomarmol"). Favicon/apple-touch = isotipo, optimizados.
  - **R7** carga inicial reconstruida: `store/auth.ts` con estados
    `authenticating/anon/profile-pending/no-profile/ready`; shell con `<AppShellSkeleton>`
    inmediato (sin rebotar a `/login` a un usuario logueado); `SessionGuard` estado
    `reclamando` → indicador NO modal (su máquina de estados intacta); `RoleRoute` +
    `lib/capabilities.ts` ocultan y redirigen Dashboard/Parámetros/Configuración para el
    operativo; `HomeRedirect` rol-aware; `axios` con `timeout` (10 s default, 60 s en PDF y
    agente).
  - **R8** fuera "Gramar"/"Barranquilla" de los campos.
  - **Verificado en vivo** (navegador, extensión de Chrome) con cuenta de dueña Y de
    operativo: 13 rutas, barra esmeralda legible, títulos de pestaña, redirecciones del
    operativo sin bucles, `SessionGuard` no bloqueante, logo legible en login.
  - **Fase 5 — arreglos aplicados** (`441af59`): `git rm` de 6,6 MB de binarios de
    hero/landing que un `git add -A` arrastró por error; foco de teclado visible sobre la
    barra esmeralda (`.glass-emerald :focus-visible` en crema); `timeout` por-llamada en
    agente/PDF; `focus({preventScroll})`; semántica del spinner de `AuthGate`; `aria-hidden`
    en iconos; `theme-color` a crema; hover de la barra y estado activo de "Panel Admin".
  - `ARQUITECTURA_MAESTRA.md` §6 actualizado con todo lo anterior.
  - **CICLO 2 completado (2026-08-31)** — bloques **R3, R6, R10, R9**, un commit por
    pantalla/bloque (`d19fa0d`…`d573584`), `tsc -b` + `vite build` limpios:
    - **R3:** 14 primitivos accesibles en `web/src/components/ui/` (`Dialog` portalado con
      trampa de foco, `Card`, `Field` render-prop, `DataTable`, `Badge`/`StatusBadge`,
      `SegmentedControl` con 2 semánticas y roving tabindex, `Button`/`IconButton`,
      `PageHeader` que fija `document.title`, `AsyncBoundary`, `EmptyState`,
      `SelectField`/`DateField`).
    - **R6:** las 13 pantallas a `<PageHeader>` + barrido de colores de marca + `formatPct`
      + spinners a CSS. Dashboard reescrito con `<AsyncBoundary>`/`<Card>` y tabla `sr-only`
      del gráfico.
    - **R10:** migración `0005_catalogo_por_empresa.sql` **aplicada** a Supabase
      `hrmpyhixhbnkkpvxtuit` (4 políticas RLS: filas base `empresa_id IS NULL` inmutables,
      propias editables). `MaterialCombobox` → `<Dialog>` de marca con "Otro" + modal
      "¿guardar en tu catálogo?". Pantalla nueva `/materiales` ("Catálogo de materiales",
      rol dashboard). Verificado en vivo (RLS aisló un material de prueba a Marmolería Demo).
    - **R9:** eslint sin regresiones (23 errores pre-existentes de `react-hooks`, fuera de
      alcance). **Fase 5** (Code Reviewer + Accessibility Auditor, ambos "aprueba con
      cambios", sin bloqueantes de fondo): arreglos en `d573584` — kicker de `PageHeader` a
      `text-secondary` (12 pantallas), botón "quitar" del selector des-anidado, `aria-current`
      + check en la fila elegida, `strip()` de categoría en `crear_material`, contraste de
      los botones dorados "Descargar PDF"/"Cuenta de Cobro", roving tabindex del
      `SegmentedControl` en ambos modos.
    - **Diferido** (anotado en el plan): formularios grandes a `<Field>`; Historial a
      `<DataTable>`; auto-guardar el material al guardar la cotización; calendario/listbox
      propios.
  - **Ronda de revisión en vivo del fundador (2026-09-01)** — 4 rondas de observaciones,
    todas aplicadas y verificadas con el navegador (commits `6e483a2`, `f7b5a00`, `1478a48`,
    `34a9af6`). Detalle completo en `SESSION.md`. Resumen:
    - Bug crítico: la barra lateral se iba con el scroll en páginas largas → shell
      `h-screen overflow-hidden`, solo `<main>` scrollea.
    - Login roto: el CORS del backend solo aceptaba el puerto 5173 → `allow_origin_regex`
      para cualquier puerto de localhost en desarrollo.
    - Dashboard sin datos en vivo: desfase UTC vs. hora local del negocio → `dashboard.py`
      usa `date.today()` del backend como "hoy".
    - Barra lateral: glassmorphism sin brillo diagonal (rechazado por el fundador) +
      `.sidebar-aurora` estática detrás del cristal.
    - Catálogo: visible para operativo y admin; sin columnas Origen/Acciones; clic en la
      fila → modal precargado; **copy-on-write** (migración **`0006`**, aplicada) — editar
      una fila base crea una copia privada del taller, aislada, en vivo.
    - Express: "Calcular precio" no se habilitaba porque el placeholder `3.50` parecía un
      valor → `"Ej. 3.50"`.
    - Historial: cambio de estado con actualización optimista (instantáneo). Dashboard con
      indicador "Actualizando…".
    - `text-brand-gold` → token nuevo `--color-brand-gold-text` `#6E5410` (AA) en los
      números de acento.
    - Menú lateral reorganizado "por área del negocio": Dashboard · Cotizaciones (+ Historial)
      · Taller (+ Catálogo) · Ajustes · Panel Admin.
    - **Incidente de datos (resuelto):** un `DELETE` filtrado por nombre de cliente borró 2
      cotizaciones reales del fundador (COT-0003/0004) además de una de prueba. Restauradas
      el mismo día con datos exactos salvo costo/margen (aproximados, marcados en el
      registro). El desglose detallado de esas 2 no se recuperó.
  - **Próxima tarea:** decisión del fundador — fusionar `goal/rediseno-visual` → `master`
    (Ciclo 1 + Ciclo 2, 44 commits). Si se aprueba, reindexar el grafo contra `master`.

- **Fase 2.A ejecutada — migración a Supabase Auth + aislamiento real + sesión única (2026-08-27):**
  Ciclo `/goal` completo (Fases 0-6) en una sola sesión. 10 micro-commits en la rama
  `goal/fase-2a-multitenant-auth`, **fusionada a `master`** (merge `1a95284`). Detalle vivo en
  `docs/PLAN_FASE_2A.md`. Resumen:
  - **Plan** auditado por 2 agentes (Security Engineer + Database Optimizer, "aprueba con
    cambios") y aprobado por el fundador con 3 decisiones: (1) backend = servidor pequeño
    siempre encendido, no serverless; (2) acceso 100% por invitación (signup público OFF);
    (3) Google OAuth queda para después (esta fase entrega correo+contraseña).
  - **Migraciones `0003`/`0004`** aplicadas y probadas al proyecto Supabase nuevo
    (`hrmpyhixhbnkkpvxtuit`): trigger de aprovisionamiento `handle_new_user` (lee
    `raw_app_meta_data`, valida contra la tabla `invitaciones`, fail-closed ruidoso),
    trigger de cupo por plan, columnas de máquina de estados en `sesion_activa`, tabla
    `folio_seq` (contador atómico de folios), `empresa_actual()` endurecida.
  - **Backend:** login propio (usuario/contraseña/PIN, tabla `sesiones`) → **Supabase Auth**
    (JWT ES256 verificado por JWKS). `backend/db/client.py` con dos dependencias:
    `db_service` (rol postgres/BYPASSRLS, solo auth/aprovisionamiento/admin/sesión) y
    `db_rls` (fija `request.jwt.claims` + `SET LOCAL ROLE authenticated`, con aserción que
    aborta si el aislamiento no se activó). `main.py` corre un self-test de RLS al arrancar
    (apaga el backend si el aislamiento falla o si `DATABASE_URL` apunta al transaction
    pooler). 12 routers de datos bajo `db_rls`, sin `commit()` intermedios, con `empresa_id`
    en todos los INSERT y filtro jerárquico (Regla 2) centralizado en `scope_propio`.
    Alta de empresas (`POST /api/bootstrap/empresa`) y gestión de usuarios por invitación
    (`routers/admin.py` sobre la Admin API de GoTrue). Sesión única completa
    (`routers/session.py`: claim/keep/handoff/heartbeat/logout + `verificar_dispositivo`).
    `finanzas.router` desregistrado (opera sobre `facturas_compra`, que no es de Costo360).
  - **Frontend:** `@supabase/supabase-js`, login por correo + Google + "olvidé mi
    contraseña", página `/reset-password`, `SessionGuard` con el aviso de sesión única,
    `AdminPage` reescrita al modelo de invitación. `tsc -b` + `npm run build` limpios.
  - **Auditoría del código (Fase 5)** por 2 agentes distintos (Code Reviewer + Backend
    Architect): sin huecos de aislamiento ni regresiones; 7 arreglos aplicados
    (compensación de usuario huérfano, parpadeo del retador, bucle de refresh, carrera del
    primer claim, Regla 2 en endpoints por-id, self-test post-commit, menores).
  - **Verificado por SQL (con rollback):** el aislamiento entre empresas funciona de verdad
    — usuario A ve 1 de cada cosa y 0 de la empresa B, no puede escribir en otra empresa,
    `folio_seq` sin carreras, mismo número de cotización permitido entre empresas.
  - **B8 verificado en vivo (2026-08-28):** el fundador configuró `backend/.env` + `web/.env`;
    catálogo cargado (255 materiales); backend arrancado contra el proyecto real (self-test de
    RLS pasó); prueba end-to-end headless TODO PASA — alta de 2 talleres por bootstrap, login
    con JWT real, aislamiento entre empresas confirmado por la API real, invitaciones, y sesión
    única. Un bug menor encontrado y corregido (`session.claim` body, commit `3f9d01f`). Base
    del proyecto quedó limpia.
  - **Falta:** el repaso visual del frontend en un navegador (encaja en el rediseño), y
    **fusionar `goal/fase-2a-multitenant-auth` a `master`**.
  - **Próxima tarea lógica:** fusionar la rama y arrancar el **rediseño visual del producto**
    (Objetivo 1 / Fase 2.A del roadmap) — lo que el fundador pidió hacer después.

- **Revisión de UI/UX/Accesibilidad/Marca del prototipo (2026-08-29):** con el backend ya
  funcionando en vivo, se recorrieron los 12 módulos con la cuenta de dueña y la de operativo
  (25 capturas) y se analizaron con 3 agentes (UI Designer, Brand Guardian, Accessibility
  Auditor). Resultado consolidado y priorizado en **`docs/REVISION_UX_2026-08-29.md`** — es el
  insumo directo del rediseño visual. Temas: contraste bajísimo en toda la app (el token de
  texto secundario reprueba WCAG AA) · un modo oscuro a medio hacer que contradice el "light-mode
  estricto" (recomendación unánime: eliminarlo) · logo ilegible sobre crema · colores fuera de
  marca (morado/cian/naranja) en pantallas centrales · restos del taller piloto en
  `manifest.json`/placeholders · el Dashboard del rol Operativo se cuelga (403 sin manejar) ·
  formato de números no colombiano · controles de formulario sin etiqueta accesible · diálogos
  sin gestión de foco.

- **Ciclo `/goal` rediseñado a 7 fases (0-6) e instalado `codebase-memory-mcp` (2026-08-27):** el fundador redefinió el ciclo de trabajo con un mapa de grafo del proyecto + selección de agentes (Fase 0), planificación (1), auditoría con agentes distintos y reintento en bucle si no se aprueba (2), explicación obligatoria al usuario (3), ejecución con micro-commits (4), validación de la ejecución con agentes distintos y reintento en bucle (5), y guardado/reindexado (6) — reemplaza la versión anterior de 6 pasos en `HARNESS_INICIO.md`. Se instaló el servidor MCP `codebase-memory-mcp` (grafo de conocimiento del código, local, sin dependencias) para la Fase 0 — pendiente de confirmar que el indexado (`index_repository`) funciona tras reiniciar la sesión. De paso se corrigió un hallazgo real: `CONTEXTO_COSTOMARMOL.md` no era de Costo360 (documentaba una versión de marca blanca del código para un cliente específico, bajo un nombre que hoy pertenece a otro contexto de negocio) — se sacó del repositorio y se corrigió la narrativa de origen que lo mencionaba incorrectamente como el nombre académico anterior de Costo360.
- **Esquema multi-tenant diseñado, auditado dos veces y aplicado al proyecto Supabase real (2026-08-26/27):** ciclo `/goal` completo para la Fase 1 del roadmap. Nuevo proyecto Supabase creado en la organización "Costo360" (antes vacía) — `project_id: hrmpyhixhbnkkpvxtuit`, región `sa-east-1`. 11 tablas (`planes`, `roles_catalogo` con 3 niveles fijos admin/gerencia/operativo, `empresas`, `usuarios` ligado a Supabase Auth, `cotizaciones`, `app_config`, `inventario_retales`, `inventario_laminas`, `audit_log`, `catalogo_materiales` compartido, `sesion_activa` placeholder), todas con Row Level Security activado y forzado. Dos auditorías independientes (Security Engineer sobre el plan, Database Optimizer sobre el SQL) encontraron y corrigieron un hallazgo crítico real: las políticas originales permitían que cualquier usuario se autoascendiera de rol o cambiara el plan de su propia empresa — ya corregido antes de aplicar. Confirmado con el fundador: `facturas_compra`/`correos_procesados` (tablas del backend actual) son sobras de un proyecto no relacionado, no se migraron. Corregido de paso un hallazgo de seguridad en `backend/main.py` (CORS con `"*"` + credenciales). SQL completo en `backend/migrations/0001_esquema_multitenant.sql` y `0002_revocar_anon_empresa_actual.sql`.
- **Harness completado y ruta de desarrollo formalizada (2026-08-26):** `HARNESS_INICIO.md`, `ARQUITECTURA_MAESTRA.md` (documentación técnica profunda: stack completo con versiones, esquema real de base de datos, hallazgo crítico de falta de aislamiento multi-tenant, reglas sin excepción) y `PATRONES_DE_ERROR.md` (vacío, formato listo) creados. El fundador definió 5 objetivos activos del proyecto — rediseño de interfaz del producto, landing page de alto impacto, agentes de IA de operación, infraestructura gratuita para esos agentes, y agente de IA dentro del producto — formalizados en `docs/ROADMAP_COSTO360.md` con fases y dependencias (el rediseño de interfaz está bloqueado hasta resolver el aislamiento multi-tenant, que se ataca primero).
- App funcional desplegada en Streamlit Cloud (legado, sigue en producción)
- Rediseño visual completo (tema oscuro, glassmorphism, colores de marca)
- Corrección de bug de navegación (`radio_ui`)
- Landing page con logo real (9 secciones)
- Prototipo interactivo HTML (11 pantallas navegables)
- Configuración del harness de sesión (CONTEXTO, PROGRESS, SESSION)
- Análisis técnico completo del proyecto con 4 agentes especializados (2026-06-06)
- Consultoría completa Microsoft 365 vs Google Workspace (2026-06-06)
- Creación de `CONTEXTO_COSTOMARMOL.md` para el proyecto derivado Costomarmol
- **Decisión de arquitectura nueva APROBADA (2026-08-08):** React + Tailwind + Supabase + funciones serverless + Gemini API + React Native/Expo + Git local sin GitHub
- **Git local inicializado** en `C:\Costo360` (2026-08-08) — sin repositorio remoto
- **Comando `/cierre` creado** — actualiza harness y memoria al final de cada sesión
- **Fase 1 y arranque de Fase 2 construidos por esta sesión (2026-08-08):** login con Supabase Auth verificado en vivo, función de prueba de Gemini funcionando
- **Otro modelo de IA trabajando en paralelo sobre `web/` desde el 2026-08-08/09** — construyó su propia versión de Fases 2-4 (backend FastAPI, 11+ pantallas en React/TSX, deploy a Vercel, y desde entonces agregó empaquetado Android/Capacitor, más módulos y assets). El usuario decidió explícitamente seguir esa línea de trabajo; esta sesión se mantiene fuera de `web/` para no generar conflictos — el estado técnico real de `web/` debe verificarse leyendo el código, no asumirse desde aquí.
- **Visión de negocio consolidada (2026-08-15):** lectura completa de la documentación de grado (Opción de Grado, CUC) → `IDEA_PRINCIPAL_COSTO360.md` — origen CostoMarmol→Costo360, problema, cliente objetivo, propuesta de valor, Business Model Canvas, métricas, validación, y la corrección de que Costo360 no es un ERP/software contable.
- **Arquitectura de agentes de operación (2026-08-15 a 20):** `ARQUITECTURA_AGENTES_OPERACION.md` — **6 agentes** (Ventas, Marketing, Atención, Diseño, Contabilidad, **Legal y Cumplimiento** — agregado el 20 de agosto) que operan Costo360 S.A.S. como empresa, con LangGraph + Claude Sonnet 5 + Gemini 3.5 Flash-Lite (cascada de costos con caché), separados en dos capas (producto vs. operación de la empresa). Validación de infraestructura: Railway (servicios por agente) en vez de un VPS por agente (Hostinger) — se descartó por el trabajo de sysadmin que implicaría. Mecanismo de mensajería entre agentes auditado con un revisor técnico independiente: se mantiene `FOR UPDATE SKIP LOCKED` + estado/reintentos, se aplaza `LISTEN/NOTIFY` (chocaba con que Railway escala a cero), Redis queda como plan B sin precio inventado.
- **Estructura de costos completa investigada y definida (2026-08-16 a 20):** `PLAN_COSTOS_COMPLETO_COSTO360.md` — costos variables, infraestructura del producto y de los agentes, monitoreo (Sentry/PostHog), herramientas del fundador (Claude Max, Google AI Ultra), operación general, costos legales de arranque, y el consumo estimado del Agente Legal. Incluye precios reales investigados (no estimados) de Vercel, Supabase, Railway, Anthropic, Gemini, Alegra, Pipedrive, Higgsfield, Resend, Sentry, Google Workspace, Claude Max, Google AI Ultra.
- **Modelo financiero de la universidad completado y afinado (2026-08-16 a 20):** `C:\Users\wases\Desktop\Universidad\Opción de grado\Costo360\Modelo Financiero - Costo360.xlsx` — hojas Costos, Gastos e Inversión llenadas con datos reales y justificados. Respaldo del archivo original guardado en la misma carpeta.
- **Fusión con la investigación propia del usuario (2026-08-18/19):** se combinó `web/Costo360 - Modelo Financiero e Infraestructura de Costos.xlsx` (simulación de tokens por agente, stack de infraestructura más completo) con `PLAN_COSTOS_COMPLETO_COSTO360.md`. Se detectó y explicó un doble conteo en la hoja "Resumen Ejecutivo" del archivo del usuario. Se resolvieron 7 conflictos de cifras con decisión explícita del usuario en cada uno.
- **Equipo físico presupuestado y verificado (2026-08-19/20):** ASUS ROG Zephyrus G14 (2026) AMD Ryzen AI 9 370HX + RTX 5080. Se verificó en Falabella Colombia que la variante de 64GB no existe con garantía oficial (RAM soldada) — se optó por 32GB, precio real confirmado ($13.299.000), redondeado a $14.000.000 por decisión del usuario. Más equipo de continuidad operativa (monitor, UPS, router de respaldo, celular de prueba, SSD externo) y reserva discrecional ("Otro").
- **Sistema de usuarios y planes rediseñado por completo (2026-08-21):** `CONTEXTO_COSTO360.md` — Starter y Pro bajan a 1 usuario cada uno (Pro ya no es "hasta 5"), Enterprise se mantiene en 10. Flujo completo de creación de cuentas definido: login siempre por correo (Google OAuth o correo+contraseña, nunca por "nombre de usuario"), altas automáticas por plan, invitaciones y restablecimiento de contraseña vía enlaces nativos de Supabase Auth (nunca contraseñas enviadas por correo en texto plano — riesgo de seguridad detectado y corregido). Admin de Enterprise único e intransferible, con cargos decorativos (Gerente/Supervisor/Asesor/Otro) para los 9 usuarios restantes sin que cambien permisos. Recuperación de contraseña en autoservicio para cualquier usuario, en cualquier plan.
- **Propuesta de migración completa a Google Cloud Platform evaluada y descartada (2026-08-21):** el usuario trajo una propuesta (Cloud Run, Cloud SQL, Vertex AI, Pub/Sub, Delegación de Autoridad de Dominio de Workspace) para reemplazar Railway+Supabase+APIs directas. Auditada con investigación real de precios: saldría 1,5x-2,6x más cara, el producto se queda en Supabase de todas formas (Cloud SQL sería una segunda factura, no un reemplazo), Vertex AI no ahorra nada y pierde acceso a la Batch API de Claude, y la Delegación de Dominio tiene un riesgo de seguridad documentado (hallazgo "DeleFriend"). Decisión: mantener la arquitectura actual sin cambios. Documentado en `ARQUITECTURA_AGENTES_OPERACION.md` sección 1.4.
- **Auditoría completa de los 7 conceptos de Inversión (2026-08-21):** se revisó honestamente qué estaba validado y qué no. RNBD corregido de "registro obligatorio" ($400.000, en realidad gratuito y no obligatorio a esta escala) a redacción real de política de datos ($1.000.000). Equipos y maquinaria corregido con precios reales de mercado (3 de 5 accesorios estaban sobrestimados): $18.400.000 → $17.200.000. Capital de trabajo, Registro legal y Marketing de lanzamiento reforzados con fuentes reales, sin cambio de monto.
- **Reemplazo completo de la proyección de Ingresos (2026-08-21):** se auditó "Cantidad vendida por mes" contra la documentación propia — la proyección anterior (171 clientes) implicaba capturar el 85% del mercado regional original identificado en el estudio de marzo. Se confirmó con el usuario que el alcance real para 2027 es nacional (LatAm queda para después del año 5), y se investigó el mercado nacional real (218 empresas bajo el código oficial CIIU 2396, estimado 450-650 con informalidad del sector). Se reemplazó la curva lineal por una curva en "S" que llega a 108 clientes en diciembre (~17-24% del mercado nacional estimado). **Ingresos Año 1: $405.900.000 → $174.900.000.** Punto de equilibrio mensual: febrero → mayo. Margen EBITDA: ~74,7% → ~40%. Margen Neto: ~59,6% → ~32%.
- **Auditoría legal exhaustiva de la constitución de la empresa (2026-08-21, continuación):** se investigó si "Registro legal y constitución" cubría todos los gastos legales reales. Hallazgo importante: faltaba un gasto real nunca contemplado — **registrar la marca "Costo360" ante la SIC** (~$1.432.000) antes de lanzar, porque Colombia es un sistema "primero en registrar, primero en derecho" (sin esto, un tercero podría registrar el nombre primero). Se confirmó que las patentes NO aplican al software en Colombia (protección correcta: derecho de autor, automático y gratis). También se amplió el paquete legal de datos ($1.000.000 → $1.800.000) para cubrir Términos y Condiciones + contrato de suscripción SaaS, que no estaban incluidos. De paso se corrigieron 2 accesorios de Equipos (celular, SSD) que habían quedado en el mínimo del rango real, no en un punto medio con colchón.
- **Inversión total FINAL de la sesión: $71.390.000 COP, 100% financiada por inversionista** (constitución+marca $2.000.000, paquete legal de datos $1.800.000, equipos $17.600.000, resto sin cambios).
- **Confirmado (2026-08-23): la otra IA que trabajaba en `web/` ya no está activa.** El usuario dio luz verde explícita para que esta sesión retome el trabajo técnico completo en `web/`+`backend/`.
- **Prototipo funcional construido y verificado en vivo (2026-08-23):** Parámetros rediseñado (cada empresa define sus propias filas de costo, merma editable por material), integración Nesting→Banco de Retales, módulo nuevo de Inventario de láminas (CRUD completo), Dashboard con granularidad diaria/semanal/mensual, filtros de estado/fecha en Historial, primer agente de IA (chat de Parámetros con Gemini 3.5 Flash-Lite), paleta de comandos Ctrl+K. Todo probado extremo a extremo contra una base de datos real (Docker Postgres local) — login real, las 3 rutas de cotización (Directa, Express, AIU) generando PDF, guardado y filtros funcionando. Detalle completo: ver memoria `project_costo360_prototipo_web`.
- **Código muerto de logística/viáticos eliminado de todo el sistema (2026-08-23):** `LOGISTICA`/`VIATICOS` ya estaban marcados "(Eliminados)" en el motor de cálculo (siempre en $0, sin UI que los alimentara) pero seguían declarados y sembrados en la base de datos — se retiraron por completo del backend, PDF, prompt del copiloto legado y tipos del frontend.
- **Raíz del repositorio reorganizada (2026-08-23):** `docs/` (documentación de planeación), `_scratch/` (scripts de debug sueltos), y 7 repositorios de referencia sin relación con Costo360 movidos fuera del proyecto a `C:\Costo360-referencias\`. La app de Streamlit, los archivos que lee el harness (`PROGRESS.md`/`SESSION.md`/`CONTEXTO_*.md`), `Agents/` y los logos quedaron intactos a propósito — ver memoria `project_costo360_prototipo_web`.
- **Decisión de ruta tecnológica para el rediseño (2026-08-23/24):** investigadas 3 rutas posibles (evolucionar el stack actual, unificar todo a TypeScript, o unificar todo a Python con Reflex) — **se eligió la Ruta A** (evolucionar React+FastAPI actuales, sumando CopilotKit/AG-UI para que el Agente interactúe con la pantalla, y generación automática de cliente TypeScript desde el schema de FastAPI). Documentado en Notion, con el razonamiento de por qué esto sirve mejor a la ambición de "startup revolucionaria" que las otras dos rutas.
- **Entrevista de producto completada (2026-08-24):** el fundador narró la experiencia de un usuario final (caso Gramar) y definió **8 reglas de arquitectura no negociables** para el rediseño (aislamiento total de datos entre clientes, aislamiento jerárquico dentro de un mismo cliente, roles con nombre libre pero permiso fijo, sesión única por usuario con control real para el usuario legítimo, modo BI exclusivo del rol Admin, doble modo de uso agente+navegación manual, el Agente nunca entrega trabajo incompleto en silencio, entre otras). Planes confirmados: Starter 1 cupo, Pro 3 cupos (1 Admin + 2 usuarios), Enterprise hasta 9. Detalle completo: ver memoria `project_costo360_redesign_ruta_a`.

---

## 🔄 En progreso

- **Prueba manual de arrastre real pendiente:** la corrección del drag-and-drop de Proyectos
  (2026-09-03) quedó verificada por la desaparición del warning de consola de
  `@hello-pangea/dnd` y por el arrastre entre columnas confirmado con teclado — no se logró
  simular un arrastre real de mouse con las herramientas de automatización del navegador
  (limitación conocida de esa clase de librería). El fundador debería confirmar con un
  arrastre real en su propio navegador para cerrar el loop del todo.

---

## 📋 Siguiente

### Fase 1 + 2.A (fundamento técnico) — ✅ hecho salvo la prueba en vivo
1. ✅ **Aislamiento multi-tenant** — esquema con `empresa_id` en todas las tablas (2026-08-26),
   y en la Fase 2.A: RLS que protege de verdad al backend (`db_rls`), `usuarios.rol` →
   catálogo cerrado `roles_catalogo` (admin/gerencia/operativo) con capacidades.
2. ✅ **Motor único de roles/permisos** (mismo para Starter/Pro/Enterprise, cambia el cupo —
   trigger `trg_usuarios_cupo_check`) y **sesión única con aviso/control real** (Regla 5,
   `routers/session.py` + `SessionGuard.tsx`).
3. ⬜ Integrar CopilotKit/AG-UI para que el Agente nativo navegue la interfaz — **Objetivo 5
   del roadmap, depende del rediseño visual (Fase 2.A)**.
4. ⬜ Ajustar el Agente de Parámetros para que nunca entregue una cotización incompleta en
   silencio (regla 8) — pendiente, va con el Objetivo 5.
5. ⬜ Generación automática de cliente TypeScript desde el schema OpenAPI de FastAPI — nota:
   hoy `web/src/api/*.ts` están alineados a mano con el backend nuevo.

### Frente activo ahora mismo
- **El fundador confirma la ronda de bugs del 2026-09-03** (Proyectos + wizard de Cotización,
  ver entrada de "Hecho" arriba) — en particular el arrastre real con mouse, que no se pudo
  probar de forma automatizada.
- **El fundador pidió no tocar el asa de arrastre pequeña de las tarjetas del tablero
  Kanban** (2026-09-04) — es un arreglo deliberado de accesibilidad ya auditado (ver nota en
  la entrada de "Hecho" del 2026-09-04); si en el futuro se quiere una zona de agarre más
  grande, hay que diseñarlo con cuidado de no reabrir el hallazgo WCAG 4.1.2 del 2026-09-02.
- **Después:** el fundador decide el siguiente frente entre los objetivos que quedan abiertos
  del roadmap (ver `docs/ROADMAP_COSTO360.md`) — landing page de alto impacto (Objetivo 2),
  agentes de operación (Objetivos 3-4), o el asistente de IA dentro del producto (Objetivo 5,
  que ahora también incluye el asistente del módulo de proyectos, diferido por decisión D2).

### Prototipo ya construido — pendientes menores
- `GEMINI_API_KEY` en `backend/.env` está vencida/inválida — el chat de Parámetros responde con error controlado hasta que se renueve.
- Inventario, Dashboard y Historial no tienen pruebas automatizadas — solo verificación manual en vivo del 2026-08-23.

### Modelo financiero / negocio
- El modelo financiero está completo, con todas las cifras (Costos, Gastos, Inversión E Ingresos) respaldadas por precios/investigación reales — es la primera vez que las 4 hojas quedan así, ninguna pendiente de verificar.
- **Sugerido revisar:** con la nueva curva de Ingresos, el margen EBITDA/Neto del Excel bajó bastante (de ~74,7%/59,6% a ~40%/32%) — vale la pena que el usuario vea el Estado de Resultados completo recalculado en Excel antes de dar el modelo por cerrado del todo.
- **Acción pendiente real (no solo de documentación):** cuando se reciba la inversión y se constituya la empresa, el usuario debe efectivamente registrar la marca "Costo360" ante la SIC (clase 42) antes de lanzar públicamente — quedó presupuestado, pero es un trámite real que hay que ejecutar, no algo automático.
- **Nota abierta, no bloqueante:** falta definir un plan de sucesión del Admin único de Enterprise si esa persona deja de estar disponible — probablemente resuelto vía soporte de Costo360, no autogestionable.
- **Nota abierta, no bloqueante:** el Agente Legal debería confirmarse con un abogado real (alcance: solo documentos propios de Costo360, nunca asesoría a talleres clientes) antes de construirlo.
- **Nota personal del fundador, fuera del Excel:** afiliación a seguridad social como independiente (~$508.000 COP/mes: salud, pensión, ARL) — obligación personal, no de la empresa, pero real desde que haya ingresos ≥1 SMMLV.

### PENDIENTE — Bugs de producción en la versión Streamlit (legado, sigue en producción real — no tocar sin avisar)
- CTA del hero — `index.html` (el de la app Streamlit, en la raíz — no confundir con `docs/index-legacy-landing.html`) cambiar `href="#"` → URL real
- PIN en texto plano — `app.py` hashear PIN + migración de datos existentes
- Número de cotización con `random.randint(100,999)` — riesgo de colisión
- Configuración de empresa no alimenta los defaults del wizard

### PENDIENTE DE SIEMPRE
- Mantener `CONTEXTO_COSTO360.md` alineado con el estado real del código conforme avance cada fase

---

*Última actualización: 2026-09-04*
