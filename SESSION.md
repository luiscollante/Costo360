# SESSION.md — Registro de Sesiones

---

## Sesión: 2026-09-04/05 — Objetivo 5, Ciclo 1: motor del Agente de IA (piloto en Proyectos)

### Qué se hizo
El fundador pidió revisar el roadmap y eligió atacar el Objetivo 5 (agente de IA dentro del
producto). Ante 3 preguntas de alcance, eligió la versión más ambiciosa desde el día uno: todo
el producto (no acotado a un módulo), capaz de asesorar Y operar datos (crear/editar/borrar con
confirmación), en dos superficies (chat flotante + página dedicada). Se le señaló el riesgo real
(un agente con permiso de borrar datos es la pieza más delicada del roadmap, más aún tras el
incidente histórico de un borrado accidental) antes de seguir. Ciclo `/goal` completo (Fases
0-6), directo en `master`. Detalle técnico exhaustivo: `ARQUITECTURA_MAESTRA.md` sección 8.

- **Fase 0-1 (mapa + plan):** se leyó el agente actual (`routers/agente.py`,
  `AgenteChat.tsx` — chat simple, sin tool-calling, solo Parámetros) como línea base. 3
  planificadores en paralelo (AI Engineer: motor/tool-calling; Software Architect: integración
  de sistema; Product Manager: flujo de producto/UX), cada uno con contexto completo del código
  real. Los 3, sin coordinarse entre sí, coincidieron en empezar por Proyectos como dominio
  piloto y en partir el trabajo en al menos 3 ciclos — más grande que el rediseño visual o el
  módulo de Proyectos, que ya habían necesitado 2 ciclos cada uno.
- **Fase 2 (auditoría del plan), 2 rondas:**
  - Ronda 1 — Security Engineer, Database Optimizer y UX Architect en paralelo. El Security
    Engineer devolvió **NO APRUEBA** con 3 bloqueantes estructurales: (1) `confirmar_accion` no
    podía ser una tool invocable por el modelo — debía ser un endpoint HTTP separado, llamado
    directamente por el frontend, para que ni una inyección de prompt pudiera cerrar el círculo
    "proponer + autoconfirmar"; (2) la tabla de propuestas pendientes debía aislar por
    `usuario_id` además de `empresa_id` (el patrón `pm_*` que se iba a copiar solo aísla por
    empresa); (3) ninguna conexión `db_rls` podía sostenerse durante todo un turno de streaming
    — el pool (`pool_size=5, max_overflow=5`) no aguanta eso. El Database Optimizer y el UX
    Architect devolvieron "aprueba con cambios" (CHECK constraints, índices, snapshot de filas
    afectadas en columna propia, reutilizar el patrón de confirmación de dos pasos ya probado en
    `TareaDialog.tsx` en vez de inventar uno nuevo).
  - Las correcciones se incorporaron al plan con las soluciones exactas que los propios
    auditores especificaron (no hubo que rediseñar el enfoque general).
  - Ronda 2 — reverificación puntual, solo de los 3 bloqueantes, por otra instancia del Security
    Engineer: **APRUEBA**, los 3 cerrados, con 2 notas de implementación a cumplir en la
    ejecución (UPDATE atómico para confirmar, sin ventana de doble-clic; `db_rls` reutilizable
    como conexión corta, no solo como dependencia de FastAPI).
- **Fase 3:** se explicó el plan corregido en lenguaje simple; el fundador aprobó arrancar
  **solo el Ciclo 1**, dejando Ciclo 2 y 3 para decidir después de ver algo funcionando.
- **Fase 4 (ejecución), 8 micro-commits:** migración `0009_agente_acciones.sql`; `rls_connection`
  (conexión corta reutilizable, extraída de `db_rls` en `db/client.py`); `services/proyectos_service.py`
  (lógica extraída de `routers/proyectos.py` sin cambiar comportamiento — verificado en vivo
  creando y borrando una tarea real); paquete `backend/agente/` (motor completo); página piloto
  `web/src/pages/AgentePage.tsx`. Un spike real confirmó que el protocolo AG-UI funciona en
  Python puro (paquete `ag-ui-protocol`, sin runtime Node) — el riesgo técnico más grande de
  todo el plan quedó despejado con evidencia, no con una suposición.
- **Fase 5 (auditoría del código ejecutado):** Code Reviewer + Backend Architect + Accessibility
  Auditor, ninguno repetido de fases anteriores. Confirmaron los 3 bloqueantes de seguridad
  cerrados EN EL CÓDIGO real (no solo en el plan) — verificado contra el SQL exacto de la
  migración y el código fuente instalado del SDK. Encontraron 4 hallazgos reales de
  implementación que ninguna auditoría de plan podía anticipar:
  1. **El motor bloqueaba el proceso entero** — `runtime.py` era `async def` pero nunca hacía
     `await` de verdad; las llamadas síncronas a Gemini y a `psycopg2` corrían sobre el mismo
     hilo del event loop. En el despliegue actual (un solo proceso), esto habría congelado TODA
     la app — cotizaciones, login, cualquier pantalla — mientras cualquier usuario tuviera una
     conversación con el agente en curso. Corregido con `asyncio.to_thread(...)` en ambos
     puntos.
  2. **El límite de pasos de razonamiento (`_MAX_PASOS=6`) podía agotarse en silencio** —
     si el modelo encadenaba tool-calls sin nunca llegar a una respuesta final, el turno
     terminaba con la misma señal que un éxito normal, sin avisar al usuario (viola la Regla 8).
     Corregido con `for...else` + un mensaje explícito.
  3. Un mensaje de error genérico ("no pudo responder") que no avisaba si una acción SÍ se
     había ejecutado y comiteado antes de que un paso posterior fallara. Corregido con una
     lista de acciones ya ejecutadas que cambia el mensaje si aplica.
  4. Un bug latente de coerción `float`→`int`: Gemini puede devolver `8.0` en vez de `8` para un
     argumento entero; el propio SDK `google-genai` trae un parche para esto pero solo se aplica
     en su camino de "automatic function calling", que este motor desactiva a propósito.
     Corregido con un helper `_como_entero` propio.
  5. **Hallazgo de accesibilidad real** (no solo cosmético): la tarjeta de confirmación no
     movía el foco ni se anunciaba a un lector de pantalla (`role="alertdialog"` sin ninguna de
     las garantías que ese rol promete), y los botones "Confirmar"/"Cancelar" no decían qué se
     estaba confirmando — el mismo tipo de descuido que ya se había corregido antes en
     `TareaDialog.tsx` para el borrado de tareas, no reutilizado aquí. Corregido replicando ese
     patrón exacto (foco acotado + `aria-label` contextual + `role="alert"`).
- **Fase 6:** grafo reindexado; `ARQUITECTURA_MAESTRA.md` (secciones 3.3, 4, 8, 11, 12),
  `docs/ROADMAP_COSTO360.md` (Fase 3), `PROGRESS.md` y este archivo actualizados.

### Archivos tocados
- **Backend nuevos:** `backend/migrations/0009_agente_acciones.sql`, `backend/agente/`
  (`__init__.py`, `registry.py`, `confirmations.py`, `runtime.py`, `router.py`,
  `tools/__init__.py`, `tools/proyectos.py`), `backend/models/agente.py`,
  `backend/services/proyectos_service.py`.
- **Backend modificados:** `backend/db/client.py` (`rls_connection`), `backend/main.py`
  (`_self_test_agente`, registro del router nuevo), `backend/routers/proyectos.py` (3 endpoints
  delegan al servicio nuevo, resto sin cambios de comportamiento), `backend/requirements.txt`
  (`ag-ui-protocol`).
- **Frontend nuevos:** `web/src/pages/AgentePage.tsx`.
- **Frontend modificados:** `web/src/api/agente.ts` (`streamAgente`, `confirmarPropuesta`,
  `descartarPropuesta`), `web/src/App.tsx` (ruta `/agente`), `web/src/components/Sidebar.tsx`
  (ítem "Asistente (beta)").
- **Docs:** `ARQUITECTURA_MAESTRA.md`, `docs/ROADMAP_COSTO360.md`, `PROGRESS.md`, este archivo.

### Decisiones tomadas
- Alcance máximo desde el día uno (todo el producto, asesora+opera, dos superficies) — decisión
  explícita del fundador tras conocer el riesgo real.
- Partir en 3 ciclos (Motor+piloto / Expansión de dominios / UI completa), recomendación
  convergente de los 3 planificadores, aprobada por el fundador.
- Confirmar una acción destructiva es un endpoint HTTP separado, nunca una tool del modelo —
  no negociable, es la corrección del bloqueante de seguridad más serio de la Fase 2.
- La tabla `agente_acciones_pendientes` aísla por usuario Y empresa (no el patrón `pm_*`,
  que es intencionalmente compartido a nivel de taller).

### Pendiente / primera tarea de la próxima sesión
1. **Configurar `GEMINI_AGENTE_API_KEY` real** en `backend/.env` — es lo único que falta para
   probar la conversación real con el modelo (el camino degradado sin clave ya se verificó en
   vivo, backend y frontend responden con gracia).
2. Con la clave configurada, probar en el navegador (`/agente`, cuenta gestora): listar tareas
   de un proyecto real, crear una tarea, y sobre todo el flujo completo de borrar una tarea
   (proponer → ver la tarjeta de confirmación → confirmar → verificar que se borró de verdad).
3. Después de esa prueba real: decidir si se arranca el Ciclo 2 (expandir a más dominios) o el
   Ciclo 3 (las dos superficies de UI completas) del Objetivo 5, o si se prioriza otro frente
   del roadmap (landing page, agentes de operación).
4. Sigue pendiente desde antes: confirmar el arrastre real de mouse en el tablero de Proyectos
   (2026-09-03) — no se tocó esta sesión, y el fundador pidió explícitamente no tocar esa zona.

---

## Sesión: 2026-09-04 — Rediseño del modal de notificaciones + servidor levantado para pruebas

### Qué se hizo
Sesión corta. Se levantó el backend (`uvicorn`, puerto 8000, contra el proyecto Supabase real
— no hizo falta Docker porque `backend/.env` ya apunta al Session pooler real) y el frontend
(`vite`, puerto 5173) para que el fundador probara en vivo lo que quedó pendiente de la ronda
de bugs del 2026-09-03 (arrastre real de mouse en el tablero de Proyectos).

- **Arrastre de tarjetas — se aclaró, no se tocó:** el fundador pidió que cualquier parte de
  la tarjeta (no solo el icono pequeño de la esquina) se pudiera usar para arrastrar. Se le
  explicó que ese icono dedicado es un arreglo deliberado de accesibilidad (hallazgo WCAG
  4.1.2 de la auditoría del 2026-09-02, documentado en `PATRONES_DE_ERROR.md` #5 y
  `docs/PLAN_MODULO_GESTION_PROYECTOS.md`) — la librería (`@hello-pangea/dnd`) exige que el
  asa de arrastre sea un `role="button"` propio; anidar ahí el `<Link>`/`<select>` de la
  tarjeta reabre exactamente el bloqueante nivel A que se corrigió. El fundador decidió **no
  tocar esa sección** y seguir con otra cosa. Queda pendiente (no bloqueante): si en el futuro
  se quiere una zona de agarre más grande, diseñarlo con cuidado (p. ej. una franja más ancha
  dedicada, no la tarjeta completa) — anotado en `PROGRESS.md`.
- **Rediseño del modal de notificaciones — ciclo `/goal` completo (Fases 0-6):** el fundador
  pidió mejorar el diseño visual de `CampanaNotificaciones.tsx` (modal de la campana en la
  barra superior), plano desde que se construyó en el Objetivo 6. Detalle completo de las
  Fases y los 5 puntos implementados en la entrada de "Hecho" de `PROGRESS.md` del
  2026-09-04 — no se repite aquí para no duplicar. Resumen rápido: chip circular de color en
  los iconos, encabezado unido con línea divisoria, hover parejo en todas las filas,
  timestamp relativo con tooltip de fecha absoluta, y auto-refresco del timestamp cada 30s
  mientras el modal está abierto (este último punto se agregó a mitad del ciclo, a pedido del
  fundador, y se incorporó sin reabrir las Fases 1-2 por ser un cambio pequeño y autocontenido
  — un `useEffect`/`setInterval` con limpieza, sin tocar datos). Fase 2 (Accessibility Auditor
  + Code Reviewer) y Fase 5 (UI Designer + Minimal Change Engineer) sin bloqueantes en ningún
  punto. 3 micro-commits: `a80ef83`, `17eecfa`, `d550201`.
- **Sesión aparte, resuelta:** el fundador preguntó cómo activar el modo de auto-aceptación de
  permisos de forma permanente (usa Antigravity IDE). Se investigó contra la documentación
  oficial de Claude Code (no se confió en la primera respuesta de un agente, que tenía datos
  incorrectos) — la sesión ya corre en modo `auto` por defecto (plan Pro/Max/Team), y ciertas
  acciones sensibles (como editar `settings.json` de permisos) nunca se auto-aprueban en
  ningún modo salvo `bypassPermissions`, que Anthropic recomienda solo para contenedores/VMs
  aislados. Se le dieron los pasos exactos (`~/.claude/settings.json` con
  `defaultMode: "bypassPermissions"`, o `Shift+Tab` en sesión) y la advertencia de riesgo real
  dado que este proyecto toca una base de datos Supabase real con datos de clientes. El
  fundador no pidió que se aplicara el cambio — quedó como información, no como acción tomada.

### Archivos tocados
- `web/src/components/proyectos/CampanaNotificaciones.tsx`, `web/src/components/proyectos/badges.tsx`
  (`NotifIcono`), `web/src/lib/utils.ts` (`formatRelativo`, nuevo).
- `PROGRESS.md`, este archivo.

### Decisiones tomadas
- No tocar el asa de arrastre del tablero Kanban en este ciclo (decisión del fundador tras
  la explicación del trade-off de accesibilidad).
- El punto 5 del modal de notificaciones (auto-refresco) se incorporó al mismo ciclo sin
  repetir las Fases 1-2 completas, por ser un cambio mínimo y autocontenido — juicio tomado
  en el momento, documentado aquí para que quede claro que no se saltó el proceso por
  descuido.

### Pendiente / primera tarea de la próxima sesión
1. El fundador sigue sin confirmar el arrastre real de mouse en Proyectos (pendiente desde el
   2026-09-03) — no se tocó nada de esa sección esta sesión.
2. Preguntar si quiere el pulido menor y no bloqueante que anotaron los 2 auditores de Fase 5
   del modal de notificaciones (alinear el color del icono "recordatorio" con el par exacto
   que usa `Badge.tsx` para el tono `gold` — hoy usa los estilos de `warning`, visualmente casi
   idéntico).
3. Después: decidir el siguiente frente entre los objetivos abiertos del roadmap (landing page,
   agentes de operación, o el asistente de IA del producto) — mismo pendiente que quedó abierto
   desde el 2026-09-03.

---

## Sesión: 2026-09-03 (tarde) — Ronda de bugs: tablero de Proyectos + wizard de Cotización

### Qué se hizo
Tras fusionar el módulo de gestión de proyectos, el fundador exploró la app en vivo (servidor
local levantado para él) y reportó 6 problemas. Ciclo `/goal` completo (Fases 0-6), directo en
`master` (correcciones puntuales, no ameritaba rama aparte). Investigación propia con evidencia
real (consola del navegador, `performance.getEntriesByType`, lectura del prototipo Base44 a
pedido explícito del fundador) antes de plan/auditoría — no se adivinó ningún diagnóstico.

- **Fase 0-1 (mapa + plan):** los 6 reportes se agruparon en 4 causas de fondo reales.
- **Fase 2 (auditoría del plan):** Backend Architect + Frontend Developer + Minimal Change
  Engineer, los 3 "APRUEBA CON CAMBIOS". Decisiones del fundador tras la explicación: forzar el
  cambio de sesión de inmediato (sin esperar 30s), y dejar el arrastre en móvil sin arreglar
  por ahora (Proyectos no tiene versión de móvil probada).
- **Fase 4 (ejecución), 4 commits + 3 de arreglos de auditoría:**
  - **Rendimiento + error transitorio de columnas** (`af92749` es sesión, `b0de613` es este):
    `useTableroProyectos.ts` cancela peticiones obsoletas con `AbortController` (antes solo
    descartaba la respuesta tarde, sin cortar la petición HTTP — React StrictMode las
    duplicaba en dev), distingue cancelación de error real, reintenta 1 vez ante fallos
    transitorios (timeout/5xx, nunca 4xx). Medido con datos reales: picos de hasta 9.6s con 7
    peticiones paralelas por carga. Se descartó combinar las peticiones en un endpoint nuevo
    por ahora — los auditores recomendaron medir primero con este cambio más acotado.
  - **Arrastrar-y-soltar + columnas fijas** (`0cc5d53`): causa raíz confirmada por un warning
    real de `@hello-pangea/dnd` en consola ("nested scroll container") — el scroll vertical de
    cada columna dependía de `<main>` de `AppLayout.tsx` en vez de tener el suyo propio.
    Aplicado el patrón exacto del prototipo Base44 (`ProjectColumn.jsx`/`Projects.jsx`,
    inspeccionado línea por línea): altura acotada (`--board-viewport-h`, variable CSS nueva) +
    cada columna con `overflow-y-auto` propio. Solo `md:` y superior (decisión del fundador).
  - **Modal de sesión en otro dispositivo** (`af92749`): `_GRACE_S` de 30s → 0 (backend +
    frontend) por decisión del fundador; botones secundarios de `text-brand-muted` (documentado
    para texto deshabilitado, no accionable) a fondo sólido.
  - **Wizard de Cotización** (`fa641d8`): **bug real encontrado**, no solo cosmético — el botón
    "Anterior"/"Ajustar parámetros" de la fase Resultado llamaba `setPaso(3)`, el mismo paso
    "Resultado" en el que ya se está (paso 2 = Proyecto) — nunca navegaba a ningún lado, por
    eso el fundador no encontraba cómo volver. Corregido a `setPaso(2)`, verificado en vivo.
    Botón "Calcular" duplicado eliminado. Tarjetas de esa fase de `.glass` a superficie sólida;
    "Guardar cotización" reforzado (antes 10% de opacidad, casi invisible).
  - **Regla CSS global** `button:not(:disabled){cursor:pointer}` en vez de seguir parchando
    botón por botón (ya se había hecho una vez en Proyectos, commit `23f7b8a`).
- **Fase 5 (auditoría de la ejecución):** Code Reviewer + Accessibility Auditor, distintos a
  los de la Fase 2, ambos "APRUEBA CON CAMBIOS". Hallazgos reales, no ruido:
  - [Serio, a11y] Los párrafos del modal de sesión quedaron en `text-brand-text-secondary` —
    insuficiente sobre el fondo compuesto real (`.glass` sobre `bg-black/60`), no sobre crema
    plano como asume el contraste documentado de ese token. Corregido a `text-brand-text`.
  - [Medio, code review] La regla global de cursor se escribió sin `@layer` — en CSS Cascade
    Layers, una regla sin capa le gana a CUALQUIER regla en capa sin importar especificidad, así
    que le quitaba el `cursor-grab` a las asas de arrastre. Envuelta en `@layer base`.
  - [Medio, code review] `--board-viewport-h` asumía un padding-top de 4.5rem en el rango
    640-1023px, pero `sm:p-6` gana sobre `pt-[calc(3.5rem+1rem)]` ahí (verificado contra el CSS
    compilado real) — el padding real es 1.5rem. Corregido el bucket `sm:` de la variable.
  - [Menor, a11y] 2 iconos SVG decorativos nuevos sin `aria-hidden="true"`. Agregado.
  - Todo corregido en 2 commits de seguimiento (uno de a11y, uno de code review), ambos
    verificados en el navegador real (`getComputedStyle`), no solo por lectura de código.
- **Fase 6:** reindexar el grafo queda pendiente para el cierre de sesión; esta entrada +
  `PROGRESS.md` actualizados ahora.

### Archivos tocados
- `web/src/hooks/useTableroProyectos.ts`, `web/src/api/proyectos.ts` — cancelación + reintento.
- `web/src/pages/ProyectosPage.tsx`, `web/src/components/proyectos/tablero/TareaKanban.tsx` —
  layout de columnas con scroll propio.
- `web/src/components/SessionGuard.tsx`, `backend/routers/session.py` — modal de sesión.
- `web/src/pages/CotizacionPage.tsx` — wizard de cotización (solo `Step4Resultado`, Step1/2/3
  intactos a propósito).
- `web/src/index.css` — `--board-viewport-h`, regla global de cursor (en `@layer base`).

### Pendiente honesto
No se logró simular un arrastre real de mouse con las herramientas de automatización del
navegador disponibles en esta sesión (limitación conocida de `@hello-pangea/dnd` y libraries
similares — necesitan movimiento incremental real del puntero, no un salto atómico). La
corrección de raíz quedó verificada por: (a) el warning de consola de la librería desapareció
por completo tras el fix, reproducido en las 3 vistas; (b) un arrastre completo con teclado
(Espacio para levantar, flecha para mover, Espacio para soltar) sí movió una tarjeta de
columna con éxito. Falta que el fundador confirme con un arrastre real de mouse en su propio
navegador.

### Primera tarea de la próxima sesión
1. Confirmar con el fundador que el arrastre real con mouse funciona en Proyectos.
2. Si todo queda conforme, reindexar el grafo (`codebase-memory-mcp`) contra el estado actual
   de `master`.
3. Preguntar cuál de los objetivos abiertos del roadmap ataca después (landing page, agentes de
   operación, o el asistente de IA del producto).

---

## Sesión: 2026-09-02/03 — Objetivo 6: módulo de gestión de proyectos, Ciclo A + Ciclo B completos

### Qué se hizo
Ciclo `/goal` completo (Fases 0-6) para el **Objetivo 6 del roadmap** (módulo de gestión de
proyectos), partido en 2 ciclos por recomendación de los auditores — mismo patrón que el
rediseño visual. Rama `goal/modulo-proyectos` (sobre `master`, con el rediseño visual ya
fusionado). Plan vivo con el detalle completo de cada bloque, cada hallazgo de auditoría y
cada verificación por SQL: `docs/PLAN_MODULO_GESTION_PROYECTOS.md`.

- **Fase 0-1 (mapa + plan):** grafo del proyecto consultado; plan escrito por Software
  Architect / Database Optimizer / Frontend Developer / Product Manager — 6 tablas nuevas
  (`pm_*`), CRUD backend, automatizaciones, y toda la interfaz del tablero de proyectos. El
  asistente de IA del módulo queda fuera de este ciclo (decisión D2: se funde con el Objetivo
  5, que ahora se estrena acotado a proyectos cuando se construya).
- **Fase 2 (auditoría del plan):** 3 agentes distintos — **Security Engineer**, **UX
  Architect**, **Minimal Change Engineer** — los 3 "APRUEBA CON CAMBIOS". Hallazgos clave
  incorporados antes de ejecutar: lista blanca de columnas que un no-gestor puede tocar en una
  tarea propia (`estado`, `orden`, `descripcion`, `horas_estimadas`), `responsable_id`
  evaluado siempre contra la fila en BD (nunca el payload), autoría server-side en
  comentarios/horas, el barrido diario **set-based sin bucle** con `empresa_id` explícito en
  cada sentencia (corre bajo BYPASSRLS), `X-Cron-Secret` con comparación constante-time,
  `ProjectStatusBadge`/`TaskStatusBadge` nuevos (el `<StatusBadge>` genérico no sirve),
  alternativa de teclado al arrastre, `<Dialog>` de tarea sin diálogo anidado para borrar.
  El fundador decidió partir el ciclo en dos (Ciclo A = datos+backend, Ciclo B = interfaz).
- **Ciclo A — G0-G3 (datos + backend), `aab3b55`…`280c61e`:**
  - Migración `0007_gestion_proyectos.sql` aplicada a Supabase `hrmpyhixhbnkkpvxtuit`: 6
    tablas `pm_projects/pm_tasks/pm_milestones/pm_time_entries/pm_comments/pm_notifications`,
    `empresa_id` + RLS `force` + policy única por tabla (Regla 1), `UNIQUE(id,empresa_id)` +
    FK compuestas para aislamiento estructural padre-hijo.
  - `backend/routers/proyectos.py` (29 rutas, `db_rls`) + `backend/routers/proyectos_cron.py`
    (barrido diario, router separado sin dependencias de sesión) + `web/src/api/proyectos.ts`.
  - **Fase 5 del Ciclo A:** Code Reviewer + Backend Architect + Database Optimizer, los 3
    "APRUEBA CON CAMBIOS", **sin bloqueantes**. Arreglos en `ca5798c` + migración `0008`
    (endurecimiento: `completado_en`, `numeric(7,2)`, FK compuesta de `milestone_id`, índices).
    Verificado por SQL con rollback: aislamiento entre empresas, `WITH CHECK`, FK cross-tenant,
    fail-closed sin claims, idempotencia del barrido.
- **Ciclo B — G4-G7 (interfaz), `663e642`+`0ea46b8`:**
  - `@hello-pangea/dnd@18.0.1` (React 19 sin duplicados). Menú "Proyectos", rutas
    `/proyectos`/`/proyectos/:id`. `ProyectosPage.tsx` (Kanban, vistas
    Operativa/Cierre/Archivo, franja de resumen), `ProyectoDetallePage.tsx` (tablero de tareas,
    cronograma, parte de horas), campana de notificaciones en `AppLayout`.
  - **Fase 5 del Ciclo B:** Frontend Developer + Accessibility Auditor + Code Reviewer, los 3
    "APRUEBA CON CAMBIOS". **2 bloqueantes de accesibilidad nivel A** (asa de arrastre
    dedicada; `aria-label` de "Mover a" con el texto visible al frente) + serios/medios
    (trampa de foco con diálogos apilados, anuncios de arrastre en español, manejo de error
    por columna). Todo corregido en `9fc7414`.
- **Prueba en vivo (cuenta admin "Ana"):** crear proyecto, hito + tarea dependiente que nace
  bloqueada, completar hito → desbloqueo, mover tarjetas, registrar horas, comentar, barrido
  diario con 2ª corrida idempotente, campana. **Bug real encontrado y corregido** (`b1825a5`):
  el `%` literal de "% de avance" colisionaba con el parseo de parámetros de psycopg2 en el
  SQL del barrido — la prueba SQL previa no lo cazó porque el MCP `execute_sql` no interpola.
- **Ronda de pulido de UI** (feedback en vivo del fundador, `23f7b8a`): cursor de mano en
  tarjetas; modal de tarea con doble scroll/recorte corregido **en el primitivo `Dialog`**
  (aplica a toda la app); foco visible desbordado del modal; cronograma y parte de horas con
  mejor jerarquía visual.
- **Documentación puesta al día (2026-09-03):** `PROGRESS.md` y este archivo no reflejaban
  nada de lo anterior — el Ciclo A y el Ciclo B se ejecutaron y auditaron por completo sin que
  el harness se actualizara en el camino (solo vivía en `docs/PLAN_MODULO_GESTION_PROYECTOS.md`).
  Corregido ahora.
- **Limpieza:** 2 archivos basura de 0 bytes en la raíz del repo (`30`, `v_cupo` — restos de
  redirects de shell de sesiones anteriores) revisados contra el grafo del proyecto
  (`codebase-memory-mcp`: sin nodos, sin referencias, `v_cupo` además gitignored y sin
  historial de git) y borrados por ser irrelevantes.

### Archivos tocados
- **Backend nuevos:** `backend/migrations/0007_gestion_proyectos.sql`,
  `backend/migrations/0008_gestion_proyectos_endurecimiento.sql`,
  `backend/routers/proyectos.py`, `backend/routers/proyectos_cron.py`,
  `backend/models/proyectos.py`.
- **Backend modificados:** `backend/main.py` (router + `_self_test_rls` extendido),
  `backend/ENV_SETUP.md` (`CRON_SECRET`).
- **Frontend nuevos:** `web/src/api/proyectos.ts`, `web/src/pages/ProyectosPage.tsx`,
  `web/src/pages/ProyectoDetallePage.tsx`, `web/src/hooks/useTableroProyectos.ts`,
  `web/src/components/proyectos/*` (tarjetas, Kanban de tareas, diálogo de tarea, cronograma,
  parte de horas, notificaciones, badges).
- **Frontend modificados:** `web/src/App.tsx`, `web/src/components/Sidebar.tsx`,
  `web/src/components/AppLayout.tsx`, `web/src/components/CommandPalette.tsx`,
  `web/src/components/ui/Dialog.tsx` (scroll del panel — cambio transversal),
  `web/src/api/materiales.ts` (`getCategoriasMaterial`), `web/src/lib/utils.ts`
  (`formatFecha`/`formatFechaHora`/`diasHasta`), `web/package.json` (`@hello-pangea/dnd`).
- **Docs:** `docs/PLAN_MODULO_GESTION_PROYECTOS.md` (vivo, todo el detalle), este archivo,
  `PROGRESS.md`.
- **Raíz:** borrados `30` y `v_cupo` (basura, 0 bytes).

### Decisiones tomadas
- El asistente de IA del módulo se funde con el Objetivo 5 — no se construye en este ciclo (D2).
- Ciclo partido en dos (Ciclo A datos+backend, Ciclo B interfaz) — decisión del fundador tras
  la Fase 2, siguiendo la recomendación de los 3 auditores.
- `pm_tasks` sin columna `responsable` de texto libre — solo `responsable_id` ligado a
  `usuarios` (decisión D8, confirmada por el fundador el 2026-09-02).
- Barrido diario = endpoint idempotente protegido por secreto, sin planificador todavía (D3) —
  el disparo real se cablea cuando el backend tenga hosting propio.

### Pendiente / primera tarea de la próxima sesión
1. **Prueba en vivo con la cuenta operativa** (Regla 2/D6: ve el tablero completo del taller,
   sin botones de gestión, 403 real al forzar crear un proyecto o editar una tarea ajena).
2. Si pasa, **fusionar `goal/modulo-proyectos` a `master`**.
3. Tras la fusión: reindexar el grafo (`codebase-memory-mcp`) contra `master`, y actualizar
   `ARQUITECTURA_MAESTRA.md` (§3 dependencia `@hello-pangea/dnd`, §4 las 6 tablas `pm_*`, §11
   historial, §12) + `docs/ROADMAP_COSTO360.md` (Fase 2.D) — quedaron pendientes de esta
   sesión porque el pedido explícito del fundador fue actualizar solo `PROGRESS.md`/
   `SESSION.md` antes de la prueba con la cuenta operativa.
4. Renovar `GEMINI_API_KEY` en `backend/.env` (el chat de Parámetros sigue en error
   controlado) — pendiente de sesiones anteriores, sigue sin resolver.

---

## Sesión: 2026-09-01 — Rediseño visual: ronda de revisión en vivo del fundador (Ciclo 2)

### Qué se hizo
Tras cerrar el Ciclo 2 (ver sesión de abajo), el fundador revisó la plataforma en el
navegador y reportó observaciones en **4 rondas**. Todas aplicadas y verificadas en vivo con
la extensión de Chrome (cuenta Ana / admin). Commits `6e483a2`, `f7b5a00`, `1478a48`,
`34a9af6` sobre `goal/rediseno-visual`.

**Observaciones del fundador + hallazgos propios:**
- **Bug crítico — barra lateral que se iba con el scroll** en páginas largas (Catálogo). El
  shell era `min-h-screen` y el `<aside sticky>` no tenía recorrido. Ahora
  `flex h-screen overflow-hidden` → solo `<main>` scrollea, la barra queda fija (que era la
  intención de R7). `AppLayout.tsx`.
- **Login roto** al iniciar sesión: el CORS del backend estaba fijo a `localhost:5173`; como
  Vite tomó otro puerto (5175), TODAS las llamadas a `/api/*` se bloqueaban sin mensaje →
  `getMe()` fallaba → `no-profile` → rebote al login en bucle. `main.py`: añadido
  `allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+"` para desarrollo.
- **Dashboard sin datos en vivo** — desfase de zona horaria: el filtro "mes en curso" usaba
  `CURRENT_DATE` de Postgres (Supabase corre en UTC, ya en septiembre) mientras las
  cotizaciones se guardan con `date.today()` del backend (hora local del negocio). `dashboard.py`
  ahora recibe `hoy = date.today()` y lo pasa como parámetro a todas las consultas.
- **Barra lateral — glassmorphism**: el fundador rechazó el "brillo diagonal" de un intento
  previo. Solución: `.glass-emerald` a más transparencia (0.68→0.82) + capa `.sidebar-aurora`
  (`fixed`, dos manchas verde-menta muy difuminadas, **estáticas** — sin animación) que el
  `backdrop-filter` convierte en luz difusa. Sigue siendo sutil (no hay contenido pasando por
  detrás de la barra fija; sería otro cambio de layout).
- **Catálogo de materiales** (`MaterialesPage.tsx`):
  - Visible para **operativo y admin** (fuera el `RoleRoute` de `/materiales`; el item de la
    barra y de la paleta Ctrl+K sin `requiereDashboard`).
  - Columnas "Origen" y "Acciones" **quitadas** (decisión del fundador). Tabla de 3 columnas.
  - **Clic en cualquier parte de la fila** → abre el mismo modal que "Agregar material",
    **precargado** (categoría/nombre/precio, los tres editables). Se descartó la edición en
    línea que se probó primero.
  - **Copy-on-write** (migración **`0006_catalogo_override_por_taller.sql`**, aplicada a
    Supabase `hrmpyhixhbnkkpvxtuit`): `catalogo_materiales.base_id`. Editar una fila base de
    Costo360 NO la toca — crea/actualiza una fila propia del taller que la sombrea; `GET`
    devuelve las propias + las base no sombreadas; borrar el override restaura la base.
    `PUT`/`DELETE` de `routers/materiales.py` pasan de `require_dashboard` a `get_current_user`
    (cualquier usuario del taller edita; RLS aísla por empresa).
- **Cotización Express — "Calcular precio" no se habilitaba**: no era un bug. El campo "Metros
  lineales" mostraba `3.50` como placeholder y se confundía con un valor real; el campo estaba
  vacío. Placeholder → `"Ej. 3.50"`. Aviso "Falta completar" más visible (icono, sin alfa). El
  cambio de tipo de proyecto ya no borra los metros al montar (`useRef` de montaje).
- **Lentitud al cambiar estados** (Historial/Dashboard):
  - `HistorialPage` `EstadoBadge`: **actualización optimista** (`onMutate` parchea el caché de
    `['historial']`) → la fila cambia al instante; se revierte si el backend falla.
  - `DashboardPage`: indicador "Actualizando…" mientras `isFetching && !isPending` (refresco en
    segundo plano de 1-2 s se lee como "al día", no como lentitud). `staleTime: 0` +
    `refetchOnMount: 'always'`. Invalidación de `['dashboard']` en los cambios de estado y
    borrados de Historial.
- **`text-brand-gold`** (`#D4AF37`, ~1,6:1 sobre crema) → nuevo token
  **`--color-brand-gold-text` `#6E5410`** (5,9:1, AA). Barrido en Cotización/Express/AIU/
  Nesting/Config/MaterialCombobox (el dorado brillante queda solo en bordes/fondos/gráficos).
- **Menú lateral reorganizado "por área del negocio"** (decisión del fundador, elegida entre 3
  opciones): Dashboard suelto arriba · **Cotizaciones** (Nueva, Express, AIU, Historial) ·
  **Taller** (Catálogo, Inventario, Retales, Nesting) · **Ajustes** (Parámetros, Configuración) ·
  separador · **Panel Admin**. Historial pasó con las cotizaciones; Catálogo pasó a Taller;
  "Sistema" → "Ajustes". `Sidebar.tsx` con `NavRow` factorizado. Kickers de `PageHeader`
  alineados (Catálogo → "Taller"; Parámetros/Configuración → "Ajustes").

### ⚠️ Incidente de datos (resuelto)
Durante la revisión, al limpiar UNA cotización de prueba propia, se ejecutó un `DELETE ... WHERE
cliente = 'Cliente de Prueba QA'` — pero **dos cotizaciones reales del fundador tenían ese
mismo nombre de cliente** (COT-2026-0003 y COT-2026-0004, ambas Aprobadas). Se borraron 3 filas
en vez de 1. **Restauradas el mismo día** con número, fecha, cliente, material, precio y estado
exactos; **costo y margen reconstruidos de forma aproximada (~44%)** y marcados como tal en su
`datos_json` (`{"_nota":"Fila restaurada tras borrado accidental..."}`). El desglose detallado y
los m²/ml de esas dos NO se recuperaron — si se necesita su PDF completo, hay que rehacerlas.
Lección: filtrar borrados por `id` exacto, nunca por un campo de texto compartido.
(Existe además una COT-2026-0006 de prueba —"Cliente de Prueba QA", $563.300, Aprobada— que el
fundador pidió dejar; suma en el dashboard.)

### Archivos tocados (además de los del Ciclo 2)
- **Frontend:** `components/AppLayout.tsx`, `components/Sidebar.tsx`, `index.css`, `App.tsx`,
  `components/CommandPalette.tsx`, `components/MaterialCombobox.tsx`, `pages/MaterialesPage.tsx`,
  `pages/DashboardPage.tsx`, `pages/HistorialPage.tsx`, `pages/CotizacionExpressPage.tsx`,
  `pages/InventarioPage.tsx` (modal → `<Dialog>`), y el barrido de `text-brand-gold` en
  `pages/{ConfigPage,CotizacionAIUPage,CotizacionPage,NestingPage}.tsx`.
- **Backend:** `main.py` (CORS), `routers/dashboard.py` (fecha), `routers/materiales.py`
  (copy-on-write), `migrations/0006_catalogo_override_por_taller.sql` (nuevo, aplicado).
- **Docs:** este archivo, `PROGRESS.md`, `docs/PLAN_REDISENO_VISUAL.md`,
  `ARQUITECTURA_MAESTRA.md` §6 y §11, memoria `project_costo360_redisenio_visual`.

### Pendiente
1. Fusionar `goal/rediseno-visual` → `master` (decisión del fundador; 44 commits de C1+C2).
2. Reindexar el grafo `codebase-memory-mcp` contra `master` tras fusionar.
3. Renovar `GEMINI_API_KEY` en `backend/.env` (chat de Parámetros en error controlado).

---

## Sesión: 2026-08-31 — Rediseño visual del producto: CICLO 2 completo

### Qué se hizo
Ciclo 2 del rediseño (`/goal`, rama `goal/rediseno-visual`). Plan vivo:
`docs/PLAN_REDISENO_VISUAL.md` (con bloque "Estado — COMPLETADO"). Cierra el Objetivo 1.

- **R3 — 14 primitivos accesibles** en `web/src/components/ui/` (`d19fa0d`, `f01a377`,
  `0c7b8c7`): `Card`, `Badge`/`StatusBadge`, `Button`, `IconButton`, `EmptyState`,
  `PageHeader` (fija `document.title`, `<h1 tabindex=-1>`), `Field` (render-prop de a11y),
  `FormSection`, `SelectField`, `DateField`/`DateRangeField`, `SegmentedControl` (2
  semánticas: `tabs` con roving tabindex / `buttons` con `radiogroup`), `Dialog` (portal a
  `body`, `inert` en `#root`, trampa de foco, Escape, devuelve foco), `DataTable`,
  `AsyncBoundary`.
- **R6 — pasada pantalla por pantalla** (`3ea085b`…`e1bac62`, un commit por pantalla): las 13
  rutas migradas a `<PageHeader>`; barrido de colores de marca (muted/emerald/red/amber →
  tokens `brand-text-*`/`brand-primary`/`brand-danger`/`brand-warning-text`); `formatPct`
  para porcentajes; spinners a CSS `animate-spin` + `role="status"`. Dashboard reescrito con
  `<AsyncBoundary>` + `<Card>` + tabla `sr-only` para el gráfico. Colisión de nombre
  `PageHeader` local (Cotización/AIU) resuelta renombrando a `StepHeader`.
- **R10 — selector de material + catálogo por taller** (feedback del fundador):
  - Migración `backend/migrations/0005_catalogo_por_empresa.sql` **aplicada** al proyecto
    Supabase `hrmpyhixhbnkkpvxtuit` vía MCP `apply_migration`. `catalogo_materiales` gana
    `empresa_id uuid null`; 4 políticas RLS (SELECT: base `NULL` o propio; INSERT/UPDATE/
    DELETE: solo propio). Filas base inmutables para todos. Verificado en vivo (se creó y
    borró "Mármol Verde Guatemala especial" como Ana/admin; RLS lo aisló a Marmolería Demo).
  - `routers/materiales.py` reescrito: `GET` ordena propios primero; `POST` (cualquier rol,
    para "Otro" en una cotización) con `ON CONFLICT` = índice parcial; `PUT`/`DELETE`
    (`require_dashboard`) con 404 cuando RLS filtra.
  - `MaterialCombobox.tsx` reescrito: dropdown que se recortaba dentro de la tarjeta →
    `<Dialog>` de marca con búsqueda; opción "Otro" → campo de texto + modal decorativo
    "¿Guardar «X» a $Y/m² en tu catálogo?" (Sí / Ahora no). Cableado `precioM2Actual` en los
    3 sitios (Cotización, Express, Nesting — este último exigió pasar la prop por `FormPanel`).
  - Pantalla nueva `web/src/pages/MaterialesPage.tsx` → ruta `/materiales` ("Catálogo de
    materiales", `<RoleRoute>` dashboard). Tabla con base de Costo360 (`Badge` "Costo360",
    solo lectura) + materiales del taller (`Badge` "Tu taller", editar/borrar). Enlace
    "Catálogo" en el grupo "Sistema" de la barra.
- **R9 — verificación final.** `tsc -b` limpio, `vite build` OK, eslint sin regresiones (23
  errores pre-existentes de `react-hooks/set-state-in-effect` y `static-components` en
  Parámetros/AIU/MoneyInput — fuera de alcance). **Fase 5:** Code Reviewer + Accessibility
  Auditor, ambos "APRUEBA CON CAMBIOS", **sin bloqueantes de fondo**. Confirmaron
  guardarraíles: `motor/*`, `db_rls`/`db_service`, `middleware/auth`, `SessionGuard` sin
  tocar. Arreglos en `d573584`:
  - kicker de `PageHeader` `text-tertiary` → `text-secondary` (contraste AA, 12 pantallas)
  - botón "quitar material" del selector des-anidado del `<button>` disparador
  - fila elegida del selector con `aria-current` + check visible
  - `crear_material` normaliza `categoria` con `strip()` antes del INSERT
  - `aprovechamiento` de Cotización con `formatPct` (consistente con Express)
  - contraste de los botones dorados "Descargar PDF" / "Cuenta de Cobro" (~1.9:1) → borde
    neutro + verde de marca en hover
  - `Field` (showHint sin idref colgante, `aria-required`), `SegmentedControl` (roving
    tabindex + Home/End/flechas en ambos modos), `Dialog` (`aria-describedby`, foco al
    primer control)

### Archivos (rama `goal/rediseno-visual`, sobre el Ciclo 1)
- **Nuevos:** `components/ui/` (14 primitivos), `pages/MaterialesPage.tsx`,
  `backend/migrations/0005_catalogo_por_empresa.sql`.
- **Modificados:** las 13 pantallas de `pages/*`, `components/MaterialCombobox.tsx`,
  `components/Sidebar.tsx`, `components/AppLayout.tsx`, `App.tsx`, `api/materiales.ts`,
  `lib/utils.ts` (`formatPct`), `backend/routers/materiales.py`.
- **Docs:** `docs/PLAN_REDISENO_VISUAL.md` (bloque "Estado — COMPLETADO"), este archivo,
  `PROGRESS.md`, memoria `project_costo360_redisenio_visual.md`.

### Diferido (anotado en el plan, los auditores NO deben reportarlo)
- Migrar los formularios grandes (Cotización Directa/Express/AIU/Configuración) a
  `<Field>`/`<FormSection>`; filas de Historial a `<DataTable>`.
- R10.b parte 2: auto-guardar el material al **guardar la cotización** (solo se hizo el modal
  explícito "¿guardar?").
- Calendario/listbox propios para `DateField`/`SelectField` (hoy envuelven el nativo).
- Números de acento dorados (`text-brand-gold` sobre crema) en los paneles de resultado de
  Cotización/AIU/Express/Nesting — decisión de marca del fundador, no bloqueante.

### Primera tarea de la próxima sesión
1. **Decisión del fundador:** fusionar `goal/rediseno-visual` → `master` (Ciclo 1 + Ciclo 2
   juntos). El árbol está limpio, `tsc`/`build` pasan, ambas Fase 5 "APRUEBA CON CAMBIOS".
2. Si se aprueba la fusión: reindexar el grafo (`codebase-memory-mcp`) contra `master`.
3. Renovar `GEMINI_API_KEY` en `backend/.env` (el chat de Parámetros sigue en error
   controlado).

---

## Sesión: 2026-08-30/31 — Rediseño visual del producto: CICLO 1 completo

### Qué se hizo
Ciclo `/goal` completo para el **Objetivo 1** (rediseño de la interfaz del producto), partido
en 2 ciclos por recomendación de los auditores. **Este trabajo cubre el Ciclo 1.** Rama
`goal/rediseno-visual` (sobre `master`, con la Fase 2.A ya fusionada). Plan vivo:
`docs/PLAN_REDISENO_VISUAL.md`.

- **Fase 0-1 (plan):** se reescribió `PLAN_REDISENO_VISUAL.md` incorporando la revisión de UX
  previa (`docs/REVISION_UX_2026-08-29.md`) y 5 decisiones del fundador.
- **Fase 2 (auditoría del plan):** UX Architect + Frontend Developer, ambos "APRUEBA CON
  CAMBIOS", ambos pidieron **partir en 2 ciclos**. Se incorporaron todas las correcciones
  (marcadas `[aud]`) y el corte. Ciclo 1 = R0, R1, R2, R4, R5, R7, R8. Ciclo 2 = R3, R6,
  R10, R9.
- **Fase 3:** el fundador aprobó el Ciclo 1 y resolvió las 5 decisiones (nombre de empresa
  SÍ; rol operativo → bloqueo real de backend donde no rompa cotizar; landing fuera de
  alcance; R7 alcance completo; auditar el plan SÍ).
- **Fase 4 (ejecución):** ~22 commits (`a5292cf`…`441af59`). Detalle bloque por bloque en
  `PROGRESS.md`. Aparte del plan, el fundador entregó su arte de logo/isotipo nuevo
  (favicon + wordmark claro + wordmark de tinta oscura) y dio feedback en vivo (verde real
  del isotipo `#00472B` en vez del `#156850` de una decisión previa; glassmorphism no se
  veía → opacidad al 82%; logo del sidebar era un lockup tipográfico → arte real; botones
  "Agregar placa/ítem" no se notaban → color de marca + `cursor-pointer`).
- **Verificación en vivo:** navegación por la extensión de Chrome con cuenta de dueña (Ana,
  admin) Y de operativo (Beto). Las 13 rutas, títulos de pestaña, barra esmeralda legible,
  redirecciones del operativo (Dashboard/Parámetros/Configuración → Nueva Cotización) sin
  bucles, `SessionGuard` no bloqueante, logo legible en login.
- **Fase 5 (auditoría del resultado):** Code Reviewer + Accessibility Auditor, ambos "APRUEBA
  CON CAMBIOS". Confirmaron los guardarraíles (motor intacto, `SessionGuard` sin cambios de
  lógica —comparado byte a byte—, RLS sin tocar). Arreglos aplicados en `441af59`: `git rm`
  de 6,6 MB de binarios de hero/landing que un `git add -A` arrastró por error; foco de
  teclado invisible sobre la barra esmeralda → override a crema; `timeout` de axios global de
  10 s rompía el chat del agente y la generación de PDF → override por-llamada a 60 s;
  `focus({preventScroll})` + `scrollTo`; spinner de `AuthGate` con `role="status"` + sr-only;
  `aria-hidden` en iconos; `theme-color` a crema; hover de la barra y estado activo de "Panel
  Admin".
- **Fase 6:** `ARQUITECTURA_MAESTRA.md` §6 y `docs/ROADMAP_COSTO360.md` actualizados;
  `PROGRESS.md`/`SESSION.md` (este archivo); memoria persistente.

### Archivos modificados/creados (rama `goal/rediseno-visual`)
- **Frontend nuevos:** `components/Logo.tsx`, `components/AppShellSkeleton.tsx`,
  `components/RoleRoute.tsx`, `lib/capabilities.ts`.
- **Frontend modificados:** `index.css`, `App.tsx`, `store/auth.ts`, `components/AppLayout.tsx`,
  `components/Sidebar.tsx`, `components/PrivateRoute.tsx`, `components/AdminRoute.tsx`,
  `components/SessionGuard.tsx` (solo render/ARIA), `hooks/useCountUp.ts`, `api/client.ts`,
  `api/auth.ts`, `api/agente.ts`, `api/cotizacion.ts`, `lib/utils.ts`, `pages/LoginPage.tsx`,
  `pages/ResetPasswordPage.tsx`, `pages/CotizacionPage.tsx`, `pages/CotizacionAIUPage.tsx`,
  `pages/CotizacionExpressPage.tsx`, `pages/ConfigPage.tsx`, `index.html`, `public/manifest.json`.
- **Frontend borrados:** `hooks/useTheme.ts`.
- **Backend modificados:** `middleware/auth.py`, `models/auth.py`, `routers/auth.py`,
  `routers/config.py`, `routers/parametros.py`.
- **Assets:** `web/public/{favicon,apple-touch-icon,logo,logo_versiones_oscuras}.png`
  (optimizados); originales en `assets/marca/`. `git rm` de binarios de hero/landing e
  `isotipo.png` muerto.
- **Docs:** `docs/PLAN_REDISENO_VISUAL.md` (reescrito + bloque R10), `ARQUITECTURA_MAESTRA.md` §6.

### Decisiones tomadas
- Rediseño partido en **2 ciclos**: Ciclo 1 = fundamento (tokens, shell, barra, carga, logo);
  Ciclo 2 = primitivos + pasada pantalla por pantalla + catálogo de materiales.
- Verde esmeralda de la barra = `#00472B` (muestreado del isotipo real), NO el `#156850` de
  la decisión previa del 2026-08-29.
- Rol operativo: bloqueo real de backend en `GET /api/parametros`, `/api/config/empresa`,
  `/api/config/logo` (`require_dashboard`) + ocultamiento/redirección en el frontend.
- Logo: dos variantes de arte del fundador (claro/oscuro) vía componente `Logo`. El SVG
  vectorizado que entregó salía con el isotipo en negro → descartado; pendiente un SVG limpio.
- R7 con alcance completo (reconstrucción del flujo de carga), no solo el arreglo mínimo.
- `finanzas`/OCR de facturas ya estaba fuera del prototipo (no se tocó).

### Primera tarea de la próxima sesión
1. Arrancar el **CICLO 2** del rediseño (`docs/PLAN_REDISENO_VISUAL.md`): normalmente **R3**
   (los 12-14 primitivos accesibles: `Dialog`, `Card`, `Field`, `DataTable`, `Badge` con
   icono, `SegmentedControl` con 2 semánticas, `Button`/`IconButton`, `PageHeader`,
   `AsyncBoundary`, `EmptyState`, `SelectField`/`DateField` como envoltorios de nativo),
   salvo que el fundador quiera priorizar **R10** (selector de material + catálogo por taller,
   migración `0005`) o el pago visible de **R6** (contraste de contenido, formato de números,
   colores de gráficos).
2. En algún punto: fusionar `goal/rediseno-visual` a `master` (¿al cerrar el Ciclo 2?).
3. Reindexar el grafo del proyecto (`codebase-memory-mcp`) — quedó pendiente de esta sesión.

---

## Sesión: 2026-08-27 — Fase 2.A completa: migración a Supabase Auth + aislamiento real + sesión única

> Nota: SESSION.md venía sin actualizar desde el 2026-08-23/24. Entre medias hubo sesiones el
> 26 (esquema multi-tenant aplicado) y el 27 temprano (rediseño del ciclo `/goal` a 7 fases +
> `codebase-memory-mcp`) — su detalle está en `PROGRESS.md` y en los commits `af1c0cf`/`a443d65`.

### Qué se hizo
Ciclo `/goal` completo (Fases 0-6) en una sola sesión para la **Fase 2.A del roadmap**.

- **Fase 0-1 (plan):** se indexó el grafo del proyecto y se escribió `docs/PLAN_FASE_2A.md`
  (objetivo, estado verificado en código, arquitectura objetivo, 9 bloques B0-B8, 10 riesgos).
- **Fase 2 (auditoría del plan):** 2 agentes independientes — **Security Engineer** y
  **Database Optimizer** — ambos "APRUEBA CON CAMBIOS". Se incorporaron todos los hallazgos a
  la Parte II del plan (C1-C3 críticos convergentes, S1-S17 seguridad, D1-D14 base de datos).
- **Fase 3:** el fundador aprobó y respondió 3 decisiones (ver Decisiones abajo).
- **Fase 4 (ejecución):** 10 micro-commits en la rama `goal/fase-2a-multitenant-auth`:
  - **B0** preflight: verificado en el proyecto Supabase nuevo (`hrmpyhixhbnkkpvxtuit`) que
    `postgres` tiene BYPASSRLS + es miembro de `authenticated`, que `authenticated` tiene DML
    en las 11 tablas, que el esquema `0001`/`0002` está aplicado, que `pg_cron` no está, y
    que ningún `.env` fue commiteado jamás.
  - **B1** migraciones `0003_aprovisionamiento_sesion.sql` (trigger `handle_new_user` +
    trigger de cupo + columnas de `sesion_activa` + `folio_seq` + `empresa_actual()`
    PARALLEL SAFE) y `0004_revocar_execute_triggers.sql`. Aplicadas y **probadas end-to-end
    con rollback** (aprovisionamiento por invitación, cupo por plan, rechazo sin invitación,
    OAuth sin invitación → sin perfil).
  - **B2** núcleo de auth del backend: `db_service`/`db_rls`, `get_current_user` con JWKS
    ES256, self-test de RLS al arrancar, `main.py` sin `_CREATE_TABLES_SQL` ni seeds, CORS
    endurecido, `services/auth_service.py` eliminado.
  - **B3** 12 routers de datos a `db_rls`, sin `commit()` intermedios, `empresa_id` en todos
    los INSERT, `log_accion` con SAVEPOINT, `cfg_get`/`cfg_set` con jsonb + `empresa_id`,
    `_siguiente_numero` → `folio_seq`, `scope_propio` para la Regla 2, `db/deps.py` a
    capacidades. `finanzas.router` desregistrado.
  - **B4** `routers/bootstrap.py` (`POST /api/bootstrap/empresa`, `X-Bootstrap-Secret`) +
    `routers/admin.py` reconstruido (invitar/editar/desactivar por la Admin API de GoTrue,
    todo filtrado por `empresa_id`) + `services/supabase_admin.py`. `seed_catalogo.py`.
  - **B5** `routers/session.py` (sesión única: claim/keep/handoff/heartbeat/logout) +
    `verificar_dispositivo` en los 11 routers de datos + admin.
  - **B6** frontend auth: `@supabase/supabase-js`, `supabaseClient.ts`, `deviceId.ts`,
    `store/auth.ts` reescrito, `client.ts` (Bearer + X-Device-Id + retry), `LoginPage`
    (correo/Google/olvidé), `ResetPasswordPage` nueva, `AdminPage` reescrita al modelo de
    invitación, ajustes en Sidebar/Parametros/Dashboard.
  - **B7** `SessionGuard.tsx` (aviso de sesión única) + `api/session.ts`.
  - **B8** parcial: aislamiento entre empresas **verificado por SQL con rollback** (usuario A
    ve 1 de cada cosa y 0 de la empresa B; no puede escribir en otra empresa; `folio_seq`
    sin carrera). La prueba en vivo por HTTP queda pendiente del `.env` del fundador.
- **Fase 5 (auditoría del código):** 2 agentes distintos — **Code Reviewer** ("cambios
  menores") + **Backend Architect** ("ajustes recomendados"). Sin huecos de aislamiento ni
  regresiones. Se aplicaron 7 arreglos (commit `f8c6e0b`): compensación de `auth.users`
  huérfano, `SESSION_PENDING` vs `SESSION_SUPERSEDED` para no parpadear al retador, corte del
  bucle de refresh en el frontend, `ON CONFLICT` en la carrera del primer `claim`, Regla 2 en
  los endpoints por-id de cotización/retales, self-test post-commit, y menores.
- **Fase 6:** reindexado el grafo, actualizada la documentación (este archivo, `PROGRESS.md`,
  `ARQUITECTURA_MAESTRA.md`, `docs/ROADMAP_COSTO360.md`, `CONTEXTO_COSTO360.md`,
  `PATRONES_DE_ERROR.md`, memoria persistente).

### Archivos modificados/creados (rama `goal/fase-2a-multitenant-auth`, 11 commits)
- **Backend nuevos:** `routers/bootstrap.py`, `routers/session.py`, `services/supabase_admin.py`,
  `seed_catalogo.py`, `migrations/0003_*.sql`, `migrations/0004_*.sql`, `ENV_SETUP.md`.
- **Backend modificados:** `db/client.py`, `db/deps.py`, `db/config_helpers.py`,
  `middleware/auth.py`, `middleware/rate_limiter.py`, `models/auth.py`, `main.py`,
  `requirements.txt`, `services/audit_service.py`, y los 13 routers.
- **Backend eliminados:** `services/auth_service.py`, `models/admin.py`.
- **Frontend nuevos:** `lib/supabaseClient.ts`, `lib/deviceId.ts`, `api/session.ts`,
  `components/SessionGuard.tsx`, `pages/ResetPasswordPage.tsx`, `ENV_SETUP.md`.
- **Frontend modificados:** `App.tsx`, `store/auth.ts`, `api/client.ts`, `api/auth.ts`,
  `api/admin.ts`, `components/PrivateRoute.tsx`, `components/AdminRoute.tsx`,
  `components/Sidebar.tsx`, `pages/LoginPage.tsx`, `pages/AdminPage.tsx`,
  `pages/ParametrosPage.tsx`, `pages/DashboardPage.tsx`, `package.json` (+`@supabase/supabase-js`).
- **Docs:** `docs/PLAN_FASE_2A.md` (nuevo, documento vivo de ejecución).

### Decisiones tomadas
- **Backend = servidor pequeño siempre encendido** (proceso long-lived), no serverless.
  `ARQUITECTURA_MAESTRA.md` sección 3.4 deja de estar "a confirmar".
- **Acceso 100% por invitación** — "Allow new users to sign up" = OFF en Supabase Auth.
- **Google OAuth queda para después** — esta fase entrega correo+contraseña + enlaces.
- Verificación del JWT por **JWKS asimétrico ES256** (el proyecto nuevo usa signing keys
  asimétricas por defecto).
- Número de cotización = tabla contador `folio_seq` (atómica, sin carrera).
- Timeout de sesión única = resolución perezosa en `/heartbeat` (sin `pg_cron`).
- `finanzas.router` desregistrado del prototipo nuevo.
- Revocación de token por dispositivo en la Regla 5: NO se hace (GoTrue no la ofrece
  por-dispositivo) — se usa el 409 de `verificar_dispositivo` + re-lectura sin caché de
  `activo`/`rol_codigo`. "Sesión única cooperativa" (documentado).

### Primera tarea de la próxima sesión
1. Pedir al fundador que cree `backend/.env` (Session pooler 5432 + `SUPABASE_SERVICE_ROLE_KEY`
   + `BOOTSTRAP_SECRET`) y `web/.env` (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` =
   `sb_publishable_t5jOCjxELKXut05se_bgbQ_3zAk3FDJ`), y configure el panel de Supabase Auth
   (signup OFF + Redirect URLs `http://localhost:5173/reset-password` y `/dashboard`).
2. Ejecutar **B8**: `python -m backend.seed_catalogo`, levantar backend+frontend, y probar el
   flujo completo (alta de empresa demo por bootstrap, login por correo, invitar un
   `operativo`, aislamiento entre 2 empresas demo, sesión única en 2 navegadores, reset de
   contraseña).
3. Si B8 pasa, **fusionar `goal/fase-2a-multitenant-auth` a `master`**.
4. Arrancar el **rediseño visual del producto** (Objetivo 1 / Fase 2.A del roadmap) — el
   fundador lo pidió como el siguiente frente.
5. Borrar los 3 archivos basura de la raíz (`(CURRENT_DATE`, `NOW()`, `v_cupo`).

---


*Sesiones anteriores al 2026-08-23 movidas a `SESSION_ARCHIVO.md` el 2026-09-03 (regla de
las 800 líneas de `HARNESS_INICIO.md`).*
