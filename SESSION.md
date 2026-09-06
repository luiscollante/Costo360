# SESSION.md — Registro de Sesiones

---

## Sesión: 2026-09-06 (cuarta parte) — Objetivo 2: Landing Page desacoplada de alto impacto con AEO (costo360.com)

### Qué se hizo
El fundador confirmó la separación de dominios (`costo360.com` independiente del producto SaaS en `app.costo360.com`) e instruyó ejecutar el ciclo `/goal` completo para diseñar y construir la landing page en una sola pasada, incorporando optimización para crawlers de IA (AEO).

1. **Fase 0 y 1 (Mapa, agentes y diagnóstico):** Se identificó el código previo en `web/src/components/landing/` y la versión en vivo en Cloudflare Pages. Se estructuró el plan maestro en `landing_page_design_plan.md` con los 6 pilares tecnológicos solicitados.
2. **Fase 2 (Auditoría independiente):** Evaluada por Software Architect (aprobó la arquitectura desacoplada por aislamiento de blast radius y performance), Accessibility Auditor (exigió contraste WCAG AA en Glassmorphism 2.0 y soporte alternativo en la losa 3D) y Performance Benchmarker (validó lazy loading para conexiones móviles).
3. **Fase 4 (Ejecución):**
   - Proyecto independiente inicializado en `landing/` con React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion + Lenis Smooth Scroll.
   - Componentes construidos: `Navbar` (Glassmorphism 2.0 flotante), `Hero` (con visor interactivo 3D de losas de mármol Carrara/Granito/Sinterizado y física de luz especular), `MetricsBar`, `ScrollyStory` (narrativa del dolor y solución en 3 pasos), `InteractiveStudio` (simulador reactivo en COP con AIU), `BentoEcosystem` (módulos con spotlight), `RoiCalculator` (calculadora de dinero rescatado en merma), `PricingSection` (Starter, Pro, Enterprise), `FaqSection` y `Footer`.
   - **AEO (Answer Engine Optimization):** Implementación de `landing/public/llms.txt`, `robots.txt` permitiendo GPTBot, ClaudeBot, PerplexityBot y Google-Extended, y marcado Schema.org JSON-LD (`SoftwareApplication`, `Organization`, `FAQPage`).
4. **Fase 5 (Validación):** Compilación de producción con `npm run build` verificada con éxito (`dist/index.html` 5.97 kB, bundles optimizados sin errores en 21.95s).
5. **Micro-commit:** `a0b5928`.

### Archivos tocados
- **Nuevos:** Carpeta completa `landing/` (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/*`, `public/*`).
- **Docs:** `PROGRESS.md`, `SESSION.md`, artefacto `landing_page_design_plan.md`.

---

## Sesión: 2026-09-06 (tercera parte) — Objetivo 5, Ciclo 2: dominio Nesting

### Qué se hizo
El fundador pidió seguir con el siguiente dominio del Ciclo 2 (`/goal Sigue con Nesting`),
corrido en modo autónomo. Ciclo `/goal` completo (Fases 0-6).

1. **Fase 0:** al explorar `backend/routers/nesting.py` se encontró que este dominio es
   ESTRUCTURALMENTE distinto a los 5 anteriores: no tiene tabla propia, no escribe nada — es un
   cálculo puro (algoritmo Guillotine 2D, `motor_planos.optimizar_corte_2d`) que recibe una
   lámina y una lista de piezas y devuelve un SVG + métricas. El único punto de contacto con una
   escritura real es un botón del FRONTEND que guarda el sobrante como retal llamando a la misma
   API que ya usa `retales_crear`.
2. **Fase 1 (Software Architect):** en vez de forzar el molde CRUD de los otros dominios, diseñó
   una sola tool `nesting_calcular` sin capa de confirmación (no hay nada que confirmar), sin
   capa de servicio nueva (el router ya delega en `motor_planos`), y decidió que "guardar el
   sobrante como retal" reutiliza `retales_crear` tal cual — nunca una tool nueva.
3. **Fase 2 (Security Engineer) — APRUEBA CON CAMBIOS, 5 correcciones:** truncar `piezas_fuera`
   (costo de contexto + texto libre del usuario reinyectado al modelo); topes anti-DoS
   compartidos entre router y tool (el router no tenía ninguno); `aviso_para_ti` en la respuesta
   de la tool para que el modelo cite el área libre exacta al proponer un retal; rate limit en
   `/api/nesting/generar` (no tenía ninguno — el plan aumenta el tráfico directo a esa ruta);
   validar `cantidad >= 1` explícito.
4. **Fase 4 (ejecución), 3 micro-commits:** `motor_planos.validar_entrada_nesting` (validación
   compartida + constantes de tope), router adelgazado para usarla, `agente/tools/nesting.py`
   (la tool), `_SYSTEM_PROMPT` actualizado mencionando Nesting explícitamente desde el primer
   commit (lección aprendida de Retales, no repetida esta vez en el primer intento).
5. **Fase 5 (Code Reviewer, 2 rondas) — ambas APRUEBA:** 1 hallazgo real que solo podía verse en
   el código ejecutado: `cantidad` como string ("3") pasaba bien la validación compartida pero el
   handler de la tool la colapsaba a 1 con una coerción más estricta — mismo patrón de "coerción
   silenciosa" que la Fase 2 ya había prohibido, reaparecido sin querer. Corregido reutilizando
   la misma conversión de la validación, reverificado por el mismo revisor.
6. **Verificación en vivo — 2 bugs reales encontrados y corregidos, ninguno de código:**
   - **Bug de comportamiento del modelo:** con la tool registrada, aprobada, y mencionada en el
     prompt, Cost seguía sin invocarla — respondió una vez en inglés y a medias, otra vez dijo
     explícitamente "no tengo una herramienta automática, pero hago la cuenta a mano". A
     diferencia de listar datos reales (que el modelo no puede fingir saber), un cálculo de
     empaquetado con pocas piezas puede sentirse "resoluble mentalmente" para el modelo — mencionar
     el dominio no basta si la tool no prohíbe el atajo explícitamente. Corregido reforzando la
     `description` de la tool y agregando una regla nueva en "Reglas estrictas, sin excepción":
     nunca calcular el empaquetado a mano, ni para casos que parezcan simples.
   - **Complicación operativa:** 2-3 procesos `uvicorn --reload` huérfanos de reinicios previos
     de la sesión (con sus hijos `multiprocessing.spawn`) seguían corriendo en paralelo,
     sirviendo código desactualizado sin ningún error visible — `curl`/`Get-CimInstance` no lo
     revelan, hizo falta `Get-NetTCPConnection -LocalPort 8000` para ver qué proceso era el
     dueño real del puerto. Resuelto matando explícitamente TODO proceso con `uvicorn` o
     `multiprocessing.spawn` en su línea de comando antes de cada reinicio, no solo el PID que
     se cree haber iniciado.
   - Con ambos corregidos, las 4 pruebas completas pasaron: cálculo con piezas que caben
     (aprovechamiento real, nunca inventado), oferta proactiva de guardar el sobrante citando el
     área exacta calculada, confirmación de `retales_crear` con ese valor literal, borrado del
     dato de prueba, y el caso de una pieza que no cabe (0%, aviso claro).

### Archivos tocados
- **Backend modificados:** `backend/motor/motor_planos.py` (`validar_entrada_nesting` +
  constantes de tope), `backend/routers/nesting.py` (adelgazado + rate limit),
  `backend/agente/runtime.py` (`_SYSTEM_PROMPT` — Nesting + regla anti-cálculo-manual).
- **Backend nuevo:** `backend/agente/tools/nesting.py`.
- **Frontend:** `web/src/pages/AgentePage.tsx` (subtítulo con los 6 dominios).
- **Docs:** `PROGRESS.md`, este archivo, `ARQUITECTURA_MAESTRA.md`, `docs/ROADMAP_COSTO360.md`.

### Decisiones tomadas
- Un dominio de cálculo puro (sin tabla, sin escritura) NO fuerza el patrón de confirmación de
  dos fases — `es_destructiva=False` sin `handler_confirmar` es correcto y tiene precedente real
  (`retales_listar`).
- Regla de proceso nueva para futuros dominios de cálculo: si el modelo podría creer que puede
  aproximar el resultado sin la tool (a diferencia de datos reales que obviamente no puede
  inventar), la `description` de la tool debe prohibir explícitamente el atajo, no solo describir
  la función.
- Regla operativa nueva para esta máquina: verificar con `Get-NetTCPConnection -LocalPort 8000`
  qué proceso es el dueño real del puerto antes de confiar en una prueba en vivo tras reiniciar
  servidores — matar por patrón de línea de comando (`uvicorn`, `multiprocessing.spawn`), no por
  PID recordado.

### Pendiente / próxima tarea lógica
1. Decidir con el fundador el siguiente dominio del Ciclo 2 (Parámetros, el único que queda) o si
   se aborda "crear cotización" (deferido por su complejidad).
2. Commits locales de este dominio sin subir a GitHub — preguntar antes de subir.

---

## Sesión: 2026-09-06 (continuación) — Resolución del bug de Retales, verificación en vivo completa

### Qué se hizo
Continuación directa de la sesión anterior del mismo día (cerrada con `/cierre` justo antes de
poder reprobar el fix candidato). El fundador pidió explícitamente levantar backend y frontend
y probar Retales.

1. **Backend levantado limpio** (`uvicorn backend.main:app --reload --port 8000`, log a
   `backend_dev.log`) — arrancó sin errores. El frontend (`vite`) seguía corriendo solo, no hizo
   falta levantarlo (se había caído la sesión anterior por bajo uso de memoria del sistema, pero
   ya estaba de vuelta al retomar).
2. **Bug real cerrado y verificado:** con el párrafo nuevo del system prompt (commiteado la
   sesión anterior como `wip` sin verificar), Cost reconoció Retales de inmediato — preguntar
   "¿qué retales tengo disponibles?" ahora invoca `retales_listar` correctamente. Confirma la
   causa raíz: una tool registrada y aprobada en auditoría de código puede seguir siendo
   invisible para el modelo si el system prompt no la menciona como capacidad explícita — el
   registro técnico (`ToolSpec`) no es suficiente por sí solo.
3. **Verificación en vivo completa de las 4 tools**, datos desechables contra el taller demo:
   - `retales_listar`: vacío inicialmente, respuesta correcta.
   - `retales_crear`: "PRUEBA-RET-01", Mármol, 3.5 m², precio recuperación $120.000, precio
     mercado $200.000 — tarjeta de confirmación con ambos precios en formato COP (confirma el
     fix de `_CAMPOS_MONEDA`), confirmado y verificado en `/retales` que quedó creado de verdad.
   - `retales_editar`: cambiar precio de recuperación a $150.000 — Cost buscó primero el id
     (anti-encadenamiento funcionando: nunca asumió cuál retal sin listar antes), tarjeta mostró
     "$120.000 → $150.000" lado a lado, confirmado.
   - Intento de **estado inválido** ("Perdido"): rechazado con un mensaje claro listando los 3
     estados válidos (Disponible/Reservado/Usado) y ofreciendo alternativas — nunca se creó
     ninguna propuesta con datos corruptos. Verifica en vivo el fix de la Fase 5 (validación en
     la tool antes de proponer, no solo al confirmar).
   - `retales_eliminar`: tarjeta roja "Confirma antes de borrar" con los datos actuales
     (incluido el precio ya editado), confirmado. Pregunta de seguimiento "¿ya lo borraste?"
     respondida con coherencia total (sin decir "nunca existió"), y verificado en `/retales` que
     el DELETE físico real ocurrió (tabla vacía de nuevo).
   - Ningún hallazgo nuevo — las 4 tools funcionan exactamente como se diseñaron y auditaron.

### Archivos tocados
Ninguno nuevo — esta sesión fue puramente de verificación. Se actualizó `PROGRESS.md` y este
archivo para cerrar el hallazgo documentado como pendiente en la sesión anterior.

### Decisiones tomadas
- Nueva regla de proceso para futuros dominios de Cost: al hacer Fase 5/6, revisar explícitamente
  que `runtime.py::_SYSTEM_PROMPT` mencione el dominio nuevo como capacidad — no basta con que
  las tools estén registradas técnicamente, el modelo necesita la mención explícita para
  considerar razonable invocarlas.

### Pendiente / próxima tarea lógica
1. Decidir con el fundador el siguiente dominio del Ciclo 2 (Nesting, Parámetros) o si se aborda
   "crear cotización" (deferido por su complejidad).
2. Fase 6 completa: actualizar `ARQUITECTURA_MAESTRA.md` sección 8 y `docs/ROADMAP_COSTO360.md`
   con el detalle de Retales, memoria persistente, reindexar el grafo.
3. 7 commits locales de este dominio sin subir a GitHub — preguntar antes de subir.

---

## Sesión: 2026-09-06 — Objetivo 5, Ciclo 2: dominio Retales (Fases 0-5, con un bug real sin cerrar)

### Qué se hizo
El fundador pidió seguir con el siguiente dominio del Ciclo 2 (`/goal Sigue con Retales`),
mismo ciclo completo (Fases 0-6) ya usado en Cotización/Catálogo/Inventario. Corrida en modo
autónomo (goal), sin pausar a pedir aprobación en cada fase salvo cuando hizo falta.

1. **Fase 0-1 (mapa + plan):** grafo del proyecto consultado; se encontró que Retales no tenía
   capa de servicio (la lógica vivía inline en `backend/routers/retales.py`) y que introduce 2
   diferencias reales frente a los otros 3 dominios ya operados por Cost: (a) aislamiento
   **por usuario además de por empresa** (`scope_propio` — un operativo solo ve/edita/borra
   SUS PROPIOS retales), y (b) `retales_eliminar` es un **DELETE físico real** de Postgres, sin
   ninguna columna de soft-delete como sí tiene Inventario. Plan armado por un Software
   Architect aparte, con 6 riesgos de seguridad anticipados de antemano.
2. **Fase 2 (Security Engineer) — 1 bloqueante real cerrado:** la primera versión del plan de
   `retales_editar` aplicaba directo (sin confirmación) los cambios "de bajo riesgo" (notas,
   estado→Disponible/Reservado) y solo proponía para cambios de mayor impacto. El auditor lo
   rechazó: reactivar un retal a "Disponible" es justo la transición riesgosa (puede hacer que
   el mismo sobrante se prometa dos veces), no la segura, y la clasificación campo-por-campo era
   una superficie de bug nueva sin precedente en el resto del proyecto. Corregido: `retales_editar`
   SIEMPRE crea una propuesta, sin ninguna excepción, para cualquier combinación de campos.
3. **Fase 4 (ejecución), 6 micro-commits:** `backend/services/retales_service.py` (capa de
   servicio nueva, cada función aplica `scope_propio` internamente), `backend/models/retales.py`,
   router adelgazado, `backend/agente/tools/retales.py` (4 tools: `retales_listar`,
   `retales_crear`, `retales_editar`, `retales_eliminar`), `_CAMPOS_MONEDA` de `AgentePage.tsx`
   ampliado con `precio_recuperacion`/`precio_mercado_m2`, y el subtítulo de la página de Cost
   corregido (seguía diciendo "Proyectos, Tareas y Cotización" desde el Ciclo 1, nunca se
   actualizó al agregar Catálogo/Inventario).
4. **Fase 5 (Code Reviewer), 2 rondas — ambas APRUEBA:** ronda 1 encontró que mover la
   validación de `estado` a un `field_validator` de Pydantic cambiaba el contrato HTTP de 400 a
   422 en `PUT /api/retales/{id}` (corre durante el parseo automático de FastAPI, antes del
   handler) — corregido moviendo la validación a la capa de servicio, mismo patrón que
   `cotizacion_service.cambiar_estado_cotizacion`, y agregando el mismo chequeo en la tool antes
   de proponer (con `enum` en el `FunctionDeclaration`, igual que `cotizacion_cambiar_estado`).
   Ronda 2 (reverificación) aprobó el fix sin reservas, y de paso señaló un matiz de orden de
   chequeos no bloqueante (con doble error simultáneo, id inexistente + estado inválido, el 404
   ganaba sobre el 400 original) — corregido igual por prolijidad, reordenando para validar la
   forma del body antes de tocar la base.
5. **Verificación en vivo — encontró un bug real sin cerrar (ver "Pendiente" abajo):** al
   preguntarle a Cost por los retales disponibles, respondió que no tenía esa parte conectada,
   a pesar de que las 4 tools están registradas (confirmado con un script Python). Se probó
   Inventario en la misma conversación para descartar un problema general del motor — funcionó
   perfecto, así que el problema es específico de Retales. Hipótesis: `runtime.py::_SYSTEM_PROMPT`
   nunca mencionaba Retales como capacidad (a diferencia de los otros 3 dominios, que sí están
   descritos ahí) — se agregó el párrafo correspondiente, pero el fix quedó **sin verificar**
   porque el backend se reinició para descartar un problema de hot-reload y la sesión se cerró
   (`/cierre`) antes de poder reintentar la prueba.

### Archivos tocados
- **Backend nuevos:** `backend/services/retales_service.py`, `backend/models/retales.py`,
  `backend/agente/tools/retales.py`.
- **Backend modificados:** `backend/routers/retales.py` (adelgazado a delegar en el servicio),
  `backend/agente/tools/__init__.py` (registra el import), `backend/agente/runtime.py`
  (`_SYSTEM_PROMPT` — **cambio sin commitear todavía**, ver Pendiente).
- **Frontend:** `web/src/pages/AgentePage.tsx` (`_CAMPOS_MONEDA`, `_ETIQUETAS`, subtítulo).
- **Docs:** `PROGRESS.md`, este archivo (Fase 6 completa — `ARQUITECTURA_MAESTRA.md` y
  `docs/ROADMAP_COSTO360.md` — pendiente para la próxima sesión).

### Decisiones tomadas
- `retales_editar` nunca aplica directo, para ningún campo, sin excepción — no se replica el
  patrón de "confirmación condicional por campo" que se había propuesto, ni aquí ni en futuros
  dominios, salvo que el fundador lo pida como decisión de producto explícita y separada.
- La validación de un campo tipo enum (`estado`) en un modelo Pydantic compartido entre router y
  tools del agente va en la capa de SERVICIO, nunca en un `field_validator` del modelo — evita
  el cambio de contrato HTTP 400→422 que causó FastAPI al parsear el body automáticamente.

### 🔴 Pendiente — bug real sin cerrar, primera tarea de la próxima sesión
1. **Levantar backend y frontend** (ambos quedaron apagados al cierre de esta sesión — el
   backend se mató a propósito para descartar un problema de recarga en caliente, el frontend
   se cayó solo por bajo uso de memoria del sistema, sin relación con este trabajo).
2. **Probar de nuevo "¿qué retales tengo disponibles?" en `/agente`.** Si el párrafo nuevo del
   system prompt (ya escrito en `runtime.py`, sin commitear) resuelve el problema, commitearlo
   con un mensaje que documente el hallazgo real (un dominio con tools registradas y aprobadas
   en Fase 5 puede seguir siendo invisible para el modelo si el system prompt no lo menciona como
   capacidad — vale la pena revisar si esto aplica a algo más). Si NO lo resuelve, investigar más
   a fondo antes de asumir nada (revisar `backend_dev.log`, confirmar que el proceso cargó
   `backend/agente/tools/retales.py` sin excepciones silenciosas).
3. Completar la verificación en vivo de las 4 tools de Retales (crear/editar/eliminar con datos
   desechables, igual que se hizo con Inventario) — no se alcanzó a hacer por el bug de arriba.
4. **Fase 6** (documentación completa en `ARQUITECTURA_MAESTRA.md` sección 8 y
   `docs/ROADMAP_COSTO360.md`, memoria persistente nueva) — no hecha todavía para este dominio.
5. Hay 6 commits locales sin subir a GitHub de este dominio (más lo que salga del punto 2).
6. Después: decidir con el fundador el siguiente dominio del Ciclo 2 (Nesting, Parámetros) o si
   se aborda "crear cotización".

---

## Sesión: 2026-09-05 (noche) — Personalidad de Cost, animaciones sin restricción del SO, y Ciclo 2 (Cotización)

### Qué se hizo
Continuación directa de la sesión de la tarde del mismo día. Todo directo en `master`, con
micro-commits por cada avance.

1. **Personalidad de Cost cerrada con el fundador:** las 3 preguntas abiertas de
   `docs/AGENTE_PERSONALIDAD.md` (primera persona siempre, sin fórmula fija de saludo pero con
   calidez real, humor conservador-amigable) quedaron traducidas al `_SYSTEM_PROMPT` real de
   `backend/agente/runtime.py`. Al reiniciar el backend se descubrió que `ag-ui-protocol` había
   desaparecido del entorno Python (probablemente una actualización del sistema entre sesiones) —
   se reinstaló vía `pip install -r backend/requirements.txt`.
2. **Burbuja flotante global revisada, decidido NO tocarla todavía:** se confirmó con el fundador
   que `AgenteChat.tsx` (visible en toda la app salvo `/agente`) es un asistente previo y distinto
   ("Asistente de Parámetros", `gemini-3.5-flash-lite`, `/api/agente/chat`) — no es Cost, y no lo
   será hasta el Ciclo 3 (widget flotante global). Se le agregó sí un comportamiento pedido: cerrar
   al hacer clic afuera, y una animación de cierre más suave.
3. **Animaciones: reversión deliberada de `prefers-reduced-motion`.** Al depurar por qué esa
   animación más suave no se notaba, se descubrió que el fundador tenía las animaciones de Windows
   apagadas, y la app (a propósito, desde el rediseño visual) respeta esa preferencia del sistema
   apagando TODAS sus animaciones en consecuencia. El fundador objetó: mucha gente apaga eso solo
   por rendimiento, no por accesibilidad real, y no es razonable pedirles que lo cambien para ver
   el pulido visual de la app. Decisión consciente: `<MotionConfig reducedMotion="never">` +
   se eliminó el `@media (prefers-reduced-motion)` global + el chequeo de `useCountUp` — las
   animaciones de Costo360 ahora se muestran siempre. Trade-off aceptado: se pierde esa protección
   automática para quien sí la necesite por salud.
4. **Objetivo 5, Ciclo 2 — dominio Cotización, ciclo `/goal` completo (Fases 0-6):** ver detalle en
   `PROGRESS.md` y `ARQUITECTURA_MAESTRA.md` sección 8. Resumen: 4 tools nuevas, 2 rondas de
   auditoría de seguridad (4 bloqueantes reales cerrados), Fase 5 de Code Reviewer aprobada, y
   verificación en vivo completa contra datos reales del taller demo (incluido un borrado real
   autorizado explícitamente por el fundador sobre una fila de prueba QA, no un cliente real).
   Bugs reales encontrados y corregidos en el camino: serialización de `Decimal`/`date` de
   Postgres al pasarle una tool al modelo, y la tarjeta de confirmación del agente que solo sabía
   mostrar `{titulo, id}` (generalizada para cualquier dominio).
5. **Objetivo 5, Ciclo 2 — dominio Catálogo, ciclo `/goal` completo (Fases 0-6), esta vez sin
   atajos:** el fundador preguntó explícitamente si se había seguido el ciclo completo en
   Cotización — la respuesta honesta fue que las Fases 0 y 1 se habían acortado (exploración
   manual sin consultar el grafo primero, plan armado directamente sin un agente planificador
   aparte). Para Catálogo se corrigió: Fase 0 con `codebase-memory-mcp` primero, Fase 1
   delegada a un Software Architect real (2 rondas hasta que su plan quedó completo), Fase 2 con
   Security Engineer (2 rondas, 2 bloqueantes reales: validación Pydantic faltante en los
   handlers de tool, aviso anti-encadenamiento faltante), Fase 5 con Code Reviewer (aprobado, 1
   hallazgo corregido: tarjeta de confirmación de editar generalizada a cualquier campo, no solo
   precio). Verificado en vivo con datos reales: las 5 tools completas contra materiales de
   prueba desechables (creados y borrados por el propio Cost, nunca tocando el catálogo base
   real). Hallazgo real de comportamiento del modelo, no de código: Cost interpretó "borra el
   material X" como revertir su precio y llamó a la tool de editar en vez de la de borrar — la
   tarjeta de confirmación mostró la verdad (un cambio de precio, no un borrado), así que la
   defensa estructural funcionó, pero se corrigió también la causa de raíz con desambiguación
   cruzada en las descriptions de ambas tools, reverificado en vivo. Detalle completo:
   `PROGRESS.md` y `ARQUITECTURA_MAESTRA.md` sección 8.
6. **Objetivo 5, Ciclo 2 — dominio Inventario de láminas, ciclo `/goal` completo (Fases 0-6),
   pedido explícito del fundador ("Sigue con el siguiente dominio, empecemos por inventario"):**
   4 tools nuevas (listar/crear/editar/borrar láminas), capa de servicio compartida
   `backend/services/inventario_service.py`, modelos `backend/models/inventario.py` con
   validación nueva de dimensiones físicas (`>0`, no `>=0` — una lámina de 0cm no es válida).
   Antes de aprobar la ejecución, el fundador preguntó puntualmente si el plan contemplaba
   `material_categoria` (sí, desde el primer borrador) y aprobó condicionado a esa confirmación.
   Fase 2 (Security Engineer) cerró un bloqueante real: `inventario_crear_lamina` ejecutaba
   directo en vez de proponer, permitiendo "stock fantasma" en un solo turno sin confirmación
   humana — corregido para que las 3 tools de escritura siempre pasen por el flujo de propuesta.
   Fase 5 (Code Reviewer, 2 rondas) cerró otro bloqueante real: el chequeo de "lámina ya
   inactiva" solo vivía en el handler de la tool (momento de proponer), no en el servicio
   (momento de confirmar) — dejaba una ventana de carrera real donde una segunda acción podía
   colarse sobre una fila ya borrada; movido a `inventario_service.py`. Decisión de criterio
   documentada: el borrado de Inventario es un soft-delete internamente (`activo=FALSE`) pero se
   trata con la misma severidad que un borrado real en toda la UX del agente, porque la app no
   tiene ninguna pantalla de reactivación — el criterio es "¿el usuario puede deshacerlo desde la
   app?", no "¿sobrevive el dato en la base?". El fundador probó por su cuenta y reportó 2 bugs
   reales de este mismo bloque de trabajo (ver sección de abajo, ya corregidos y reverificados
   antes del cierre de Fase 5) más otros 2 encontrados por el propio Code Reviewer (tarjeta con
   "(id undefined)" en una lámina nueva sin id todavía; costo unitario propuesto sin formato de
   moneda). Verificado en vivo contra el taller demo real con filas de prueba desechables.
   Detalle completo: `PROGRESS.md` y `ARQUITECTURA_MAESTRA.md` sección 8.

### Hallazgo del fundador probando en vivo (post-entrega de Catálogo)
El fundador probó el trabajo del día por su cuenta siguiendo una guía de prueba paso a paso, y
encontró 2 bugs reales que ninguna auditoría había visto:
1. Al confirmar un borrado (o cualquier propuesta) desde la tarjeta, la conversación se quedaba
   sin ningún mensaje diciendo qué había pasado — el POST de confirmación va directo al backend,
   nunca por el modelo (regla de seguridad), así que Cost no tenía forma de "saber" que la acción
   ya había ocurrido. Si el usuario preguntaba después "¿lo borraste?", sonaba como si hubiera
   olvidado lo que él mismo preparó. Corregido: `confirmar()` en `AgentePage.tsx` ahora agrega un
   mensaje de Cost a la conversación real tras confirmar, genérico para cualquier dominio.
2. Al reverificar el fix anterior, apareció una segunda grieta: con el mensaje ya en la
   conversación, preguntar "¿ya borraste?" hacía que Cost volviera a consultar el catálogo, no
   encontrara la fila (correcto, ya está borrada) pero narrara mal el resultado diciendo que
   "nunca se alcanzó a crear" — contradiciendo su propio mensaje anterior en el mismo chat.
   Corregido con una regla explícita en el system prompt: confiar en lo que él mismo ya confirmó
   antes en la conversación, nunca reinterpretar una búsqueda vacía tras un borrado como "nunca
   existió". Reverificado en vivo end-to-end: crear → borrar → preguntar después — respuesta
   coherente en las dos vueltas.

### Decisiones tomadas
- Personalidad de Cost cerrada (ver `AGENTE_PERSONALIDAD.md`).
- Burbuja flotante vieja se deja intacta hasta el Ciclo 3 — no mezclar identidades a medio camino.
- Animaciones de la app ignoran la preferencia del sistema operativo, a partir de hoy.
- Ciclo 2 arranca por Cotización, luego Catálogo, luego Inventario (no todos los dominios a la
  vez); "crear cotización" se difiere a una segunda pasada por su complejidad (motor de ~60
  variables) y riesgo financiero.
- A partir de Catálogo, el ciclo `/goal` se sigue completo sin atajos: Fase 0 con el grafo del
  proyecto primero, Fase 1 delegada a un agente planificador aparte (nunca armada directamente).
- El borrado de Inventario (soft-delete técnico) se trata como un borrado real en toda la UX del
  agente, por falta de UI de reactivación — criterio a replicar en futuros dominios con el mismo
  patrón (soft-delete sin pantalla de deshacer = severidad de borrado real).

### Pendiente / próxima tarea lógica
- 2 bugs preexistentes encontrados de paso (no introducidos en esta sesión), ambos no
  bloqueantes, pendientes como tareas aparte: `calcular_merma` no pasa `tarifas_src` (ignora la
  merma personalizada del taller); la rama de copy-on-write de `catalogo_service.editar_material`
  ignora silenciosamente `proveedor`/`activo` al editar una fila base sin sombrear todavía.
- Decidir con el fundador: seguir el Ciclo 2 con los demás dominios (retales, nesting,
  parámetros) o abordar "crear cotización" primero.

---

## Sesión: 2026-09-05 (tarde) — Revisión visual del piloto, rebranding de la barra lateral, y verificación en vivo con el modelo real

### Qué se hizo
Continuación de la sesión del Objetivo 5. Cuatro frentes cortos, todos directos en `master`:

1. **Revisión visual pedida por el fundador** de la página piloto del agente (`/agente`): se
   encontró un bug real de integración — la página no usaba `AppLayout`, así que le faltaba
   toda la barra lateral y el encabezado del resto de la app (se veía "pelada"). Corregido
   envolviéndola en `AppLayout` como cualquier otra página, y de paso se mejoró el estado vacío
   con sugerencias clicables (mismo patrón que el chat legado de Parámetros). Verificado en el
   navegador comparando pixel a pixel contra `/parametros` — coinciden.
2. **Rebranding puntual de la barra lateral** (texto + color de fondo), a pedido del fundador:
   cambio de "Sistema de Cotizaciones" a "Sistema Integral de Cotizaciones", y negro carbón real
   del logo (`#212121`, muestreado de `assets/marca/logo-versiones-oscuras-original.png`) en el
   encabezado y pie de la barra. El primer resultado (2 bloques sólidos con corte seco) no
   convenció al fundador — se consultaron 3 agentes de diseño en paralelo (UI Designer, Brand
   Guardian, Accessibility Auditor). El Brand Guardian, revisando los archivos reales del logo,
   encontró el porqué de fondo: el negro nunca es una superficie de fondo en la marca real, solo
   tinta delgada de texto, y el dorado siempre media las transiciones de color — un corte sin
   ninguna mediación no tenía precedente. Se presentaron 3 alternativas con vista previa en
   ASCII; el fundador eligió un degradado continuo de 4 paradas (negro→esmeralda→esmeralda
   profundo→negro) con un filo dorado de 1px en cada costura real. Implementado y verificado en
   el navegador — efecto de "pieza continua" logrado, sin ningún corte visible.
3. **Corrección de un error del fundador al configurar la clave de Gemini:** pidió crear un
   `.env` nuevo con plantilla; se le explicó que `backend/.env` ya existía con una línea lista
   para eso, y se dejó más clara (`GEMINI_AGENTE_API_KEY=`). El fundador pegó la clave, pero por
   error la puso en la línea de `CRON_SECRET` en vez de la indicada — se le detectó por el
   diff automático del archivo (no coincidía el formato ni el valor esperado), se le confirmó
   con él antes de tocar nada, y se corrigió: la clave se movió a `GEMINI_AGENTE_API_KEY` y se
   restauró el `CRON_SECRET` original (que yo mismo había leído antes en la sesión).
4. **Verificación en vivo del Objetivo 5, Ciclo 1, con el modelo real** (ya con la clave
   correcta y el backend reiniciado): se probaron los 3 casos de punta a punta en `/agente` —
   listar tareas de un proyecto real (respondió con los datos correctos), crear una tarea nueva
   (se creó de verdad, verificado en el tablero), y pedir borrar esa tarea — el asistente
   **propuso** la acción (tarjeta de confirmación con nombre e id exactos) en vez de ejecutarla
   directo, y solo se borró tras el clic explícito en "Confirmar" (confirmado contra el tablero
   real). Un `503` transitorio de Gemini salió en el primer intento de listar, y el mensaje de
   "completé parte de esto antes de un error" (arreglo de la Fase 5 de la sesión anterior)
   funcionó correctamente en ese caso real. El Ciclo 1 del Objetivo 5 queda completamente
   probado, sin ningún pendiente técnico.

### Archivos tocados
- `web/src/pages/AgentePage.tsx` (envuelto en `AppLayout`, sugerencias clicables).
- `web/src/index.css` (`--color-brand-carbon`, degradado de 4 paradas en `.glass-emerald`).
- `web/src/components/Sidebar.tsx` (texto, filo dorado en header/footer).
- `backend/.env` (clave de Gemini corregida de lugar; no se versiona, cambio solo local).
- `ARQUITECTURA_MAESTRA.md`, `docs/ROADMAP_COSTO360.md`, `PROGRESS.md`, este archivo.
- Memoria persistente: `reference_env_backend.md` (creado al inicio de este bloque, ver abajo).

### Decisiones tomadas
- Degradado continuo con filo dorado (no bloques sólidos) para la barra lateral — decisión del
  fundador entre 3 alternativas, siguiendo la recomendación mejor fundamentada (Brand Guardian,
  contra los archivos reales del logo).
- `backend/.env` es el único archivo de entorno real del backend — nunca crear uno nuevo o
  duplicado; ya se guardó en memoria persistente para no olvidarlo en futuras sesiones.

### Pendiente / primera tarea de la próxima sesión
1. El fundador decide el siguiente frente: Ciclo 2 del Objetivo 5 (expandir el agente a más
   dominios), Ciclo 3 (las dos superficies de UI completas), u otro objetivo del roadmap
   (landing page, agentes de operación).
2. Sigue pendiente desde antes: confirmar el arrastre real de mouse en el tablero de Proyectos
   (2026-09-03) — el fundador pidió explícitamente no tocar esa zona por ahora.

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

*Sesiones del 2026-09-01 al 2026-08-27 movidas a `SESSION_ARCHIVO.md` el 2026-09-05 (regla de
las 800 líneas de `HARNESS_INICIO.md`). Sesiones anteriores al 2026-08-23 ya estaban ahí desde
el 2026-09-03.*
