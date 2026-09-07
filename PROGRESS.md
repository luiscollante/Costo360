# PROGRESS.md — Estado del Proyecto Costo360

---

## ✅ Hecho (2026-09-06, sexta parte) — Objetivo 5, Ciclo 2: "crear cotización" vía el agente (pieza diferida de Cotización, ahora completa)

Ciclo `/goal` completo (Fases 0-5, más verificación en vivo hecha directamente por Claude con su
extensión de navegador). Cierra la única pieza que había quedado deliberadamente fuera del dominio
Cotización el 2026-09-05 por su complejidad (el motor real recibe ~20 parámetros directos con un
desglose interno de ~60 variables).

**2 tools nuevas** (`cotizacion_calcular`, `cotizacion_guardar`) — plan auditado en 2 rondas por un
Security Engineer ANTES de ejecutar (Fase 2, primera pasada "APRUEBA CON CAMBIOS" con 6
correcciones, segunda pasada **APRUEBA**): `tipo_proyecto` como `enum` cerrado (decide en silencio
ML vs. m² en el motor); `categoria` deliberadamente NO como `enum` (es configurable por taller vía
Parámetros) sino validada server-side contra las tarifas reales del taller; combinación
inconsistente de zócalo rechazada con error explícito; `requiere_capacidad=None` explícito
(paridad con el resto del dominio); refactor de `/directa`/`/guardar` del wizard humano para
compartir la misma lógica de servicio — cierra de paso que el guardado manual nunca dejaba
auditoría; tarjeta de confirmación con los números reales (precio, costo, margen) para que el
humano note cualquier discrepancia antes de confirmar.

**Decisión de diseño central:** `cotizacion_guardar` NUNCA confía en el precio que el modelo
"recuerda" haber calculado — recalcula internamente con los mismos argumentos que recibió y
congela ESE resultado en la propuesta de dos fases; el folio solo se asigna al confirmar, nunca al
proponer, así ninguna propuesta descartada quema un número real.

**2 bugs financieros reales encontrados y corregidos en la Fase 5** (Code Reviewer, 2 rondas —
ninguna auditoría de plan los pudo ver, solo aparecían ejecutando el código real):
1. Cotizar con `piezas` (el caso conversacional típico, "cotízame un mesón de...") dejaba el costo
   de material en **$0 en silencio** — el motor solo saca ese costo de `area_placa_comprada`
   cuando `materiales_lista` viene vacía, y el agente nunca la puebla. Corregido asumiendo "compra
   exacta lo que necesita, sin retal" (`area_placa_comprada` = suma de las piezas mismas).
2. Con zócalo activo, el material de esa franja tampoco se cobraba (~$105.000 en el caso de
   prueba) — el motor asume que `area_placa_comprada` ya incluye esa franja, cierto en el wizard
   humano (número real de lámina comprada, con margen) pero no en el cálculo exacto del agente.
   Corregido sumando el m² del zócalo al área asumida.

**Verificado en vivo (2026-09-06) por Claude con su extensión de Chrome**, backend y frontend
levantados localmente (verificado antes que no hubiera procesos `uvicorn`/`vite` huérfanos):
cálculo sin zócalo ($900.067) y con zócalo (+$278.500, total $1.178.567) coincidiendo exactamente
con la verificación manual de los dos fixes; guardado con confirmación de dos fases (tarjeta con
cliente/categoría/precio/costo/margen bien formateados); cotización real creada y verificada en
Historial (`COT-2026-0009`, folio correcto); sin errores en el log del backend ni en la consola del
navegador; dato de prueba borrado al terminar.

**9 commits locales de este trabajo** (`a0266c5` … `b575df2`), sin subir a GitHub todavía. Backend
(`uvicorn`, puerto 8000) y frontend (`vite`, puerto 5173) quedaron corriendo localmente por si el
fundador quiere seguir probando.

**Fuera de alcance, a propósito (sin cambios):** AIU vía agente, mezclar varios materiales en una
misma cotización, la modalidad "optimizado" de aprovechamiento de retal, adicionales por etapa de
obra vía agente, editar una cotización ya guardada vía agente.

**Nota de proceso de esta sesión (detalle completo en `SESSION.md` y en memoria persistente):**
hubo un tropiezo real — un aviso automático del sistema de `/goal` (auto-mode) se interpretó por
error como aprobación del fundador para empezar a ejecutar, sin que él la hubiera dado. El fundador
lo detectó y lo corrigió de inmediato; se detuvo todo trabajo hasta recibir su aprobación real, y
luego se continuó normalmente. Regla nueva para no repetirlo: memoria `feedback_goal_hook_no_es_aprobacion`.

**Próxima tarea lógica:** decidir con el fundador si se sube este trabajo a GitHub, y si se sigue
con el Ciclo 3 del Objetivo 5 (chat flotante global + "Centro del Agente") o con otro frente del
roadmap.

## ✅ Hecho (2026-09-06) — Objetivo 5, Ciclo 2 COMPLETO: dominio Parámetros (último del ciclo)

Ciclo `/goal` completo (Fase 0 grafo → Fase 1 Software Architect → Fase 2 Security Engineer,
3 correcciones obligatorias + 2 recomendadas → Fase 4 ejecución → Fase 5 Code Reviewer, 2 rondas
→ verificación en vivo). **Dominio de mayor riesgo financiero de todo el Ciclo 2**: las tarifas de
costo y los adicionales alimentan DIRECTAMENTE el motor de cálculo de CADA cotización futura del
taller — un error aquí no afecta una fila, afecta todas las cotizaciones hasta que alguien lo note.

**Diferencias estructurales frente a los 6 dominios anteriores:** no hay ningún `id` numérico de
fila (identidad = `material`+`nombre_interno` para tarifas, `concepto` para adicionales, resuelta
por coincidencia exacta normalizada, fail-closed ante 0 o 2+ coincidencias); `cfg_set` reemplaza el
JSON COMPLETO de la clave (no hay UPDATE parcial de JSONB), así que toda escritura hace el ciclo
"leer completo fresco → mutar fila puntual → reescribir completo"; `requiere_capacidad=
"puede_ver_dashboard"` en las 7 tools, incluida la de lectura (ni siquiera ver Parámetros es
abierto a cualquier usuario, a diferencia de los demás dominios).

**7 tools sin comodín** (`parametros_ver`, `parametros_tarifa_editar/agregar/quitar`,
`parametros_adicional_editar/agregar/quitar`) — **TODAS las escrituras proponen sin excepción,
incluso "agregar"**, porque cualquier escritura aquí reescribe el JSON completo, no una fila
aislada con su propio id. Conversión %-vs-fracción siempre en el handler (el modelo habla en
puntos de porcentaje, 5=5%; el service recibe el valor ya convertido a fracción, 0.05).

**3 correcciones obligatorias de la auditoría de seguridad, todas cerradas:**
1. `etiqueta_pdf` como catálogo cerrado de 4 valores — un valor libre hacía que
   `motor/calculos.py` descartara la regla completa del `costo_total` en silencio (bug de costeo
   real, no cosmético de PDF).
2. `quitar_tarifa` **bloquea** (409), no solo advierte, borrar la última fila `merma_pct` de una
   categoría — sin ella el motor cae a un % de fábrica sin ningún aviso.
3. Candado de concurrencia barato usando la columna `actualizado` que `app_config` ya tenía: cada
   propuesta captura su "marca" al proponer, se vuelve a comparar al confirmar.

**Hallazgo real de Fase 5, cerrado tras 2 rondas del Code Reviewer:** el guardado manual
(`PUT /api/parametros`, la pantalla de edición normal) no tenía ninguna de las protecciones
nuevas — podía reintroducir en silencio los mismos 2 bugs financieros cerrados para el agente.
Corregido con `validar_invariantes_tarifas` compartida, aplicada también al PUT manual. De paso:
`agregar_tarifa` rechaza una segunda fila `merma_pct` en la misma categoría; la tool de editar
valida que venga al menos un campo antes de proponer, no solo al confirmar.

**Verificado en vivo (2026-09-06)** contra el taller demo real: leer tarifas de Mármol (porcentajes
mostrados correctamente, nunca la fracción cruda) → subir la merma de 8% a 10% (confirmado,
verificado en la BD real vía `/parametros`) → agregar una tarifa de prueba en Granito (creada,
verificada) → **intentar quitar la única fila de merma de Sinterizado — Cost anticipó el bloqueo
en su respuesta, y al insistir, el backend lo rechazó con 409 de verdad** (confirmado en el log y
verificado que la fila sigue intacta) → limpieza de los datos de prueba y restauración de la merma
de Mármol a su valor original (8%), dejando el taller demo exactamente como estaba antes de probar.

**🎉 CICLO 2 DEL OBJETIVO 5 QUEDA COMPLETO: Cotización, Catálogo, Inventario, Retales, Nesting,
Parámetros — los 6 dominios planeados, todos auditados y verificados en vivo.** Pendiente:
decidir con el fundador si se aborda "crear cotización" (deferido por su complejidad) o se pasa al
Ciclo 3 (las dos superficies de UI completas — chat flotante global + "Centro del Agente").

## ✅ Hecho (2026-09-06) — Objetivo 2: Landing Page de alto impacto con AEO (costo360.com)

Ciclo `/goal` completo (Fases 0 a 6). Por decisión estratégica del fundador, **la landing page no comparte dominio con el producto SaaS** (`costo360.com` vs `app.costo360.com`). Se construyó como proyecto desacoplado en la carpeta dedicada `landing/` con React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + Lenis:
- **Glassmorphism 2.0 y tactilidad mineral:** Superficies translúcidas multicapa (`backdrop-filter: blur(16px)`), micro-bordes dorados, sombras interiores y paleta oficial (crema `#F5E8D2`, esmeralda `#15612E`, dorado `#D4AF37`, negro carbón `#212121`).
- **Hero Section con Losa 3D Interactiva:** Visor táctil en 3D con simulación de rotación e iluminación especular en tiempo real al mover el mouse, selector de materiales reales (Mármol Carrara, Granito San Gabriel, Piedra Sinterizada Calacatta Gold) y dimensiones comerciales de placas.
- **Simulador de Cotización en Tiempo Real:** Cálculo reactivo instantáneo con receta por inductor (suministro, mano de obra, consumibles de disco/resina, merma monetizada, AIU 15% y utilidad neta) en pesos colombianos ($ COP).
- **Ecosistema Bento Grid:** Tarjetas con efecto linterna (*spotlight cursor*) para Nesting 2D, Catálogo Vivo, Generador PDF y el Asistente Inteligente Cost.
- **Scrollytelling & Calculadora de ROI:** El dolor del taller explicado en 3 pasos y cálculo interactivo del dinero en COP rescatado al mes por reducción de desperdicio.
- **AEO (Answer Engine Optimization) & AI Crawlers:** Estándar moderno implementado con `landing/public/llms.txt`, `robots.txt` autorizando explícitamente a GPTBot, ClaudeBot, PerplexityBot y Google-Extended, y marcado Schema.org JSON-LD (`SoftwareApplication`, `Organization`, `FAQPage`).
- **Validación técnica:** Compilación exitosa con `npm run build` en 21.95s sin errores de tipado ni de bundler (`dist/index.html`, `dist/assets/*`).
- **Micro-commit:** `a0b5928`.

## ✅ Hecho (2026-09-06, continuación) — Objetivo 5, Ciclo 2, dominio Nesting

Ciclo `/goal` completo (Fase 0 grafo → Fase 1 Software Architect → Fase 2 Security Engineer, 5
correcciones exigidas → Fase 4 ejecución → Fase 5 Code Reviewer, 2 rondas → verificación en vivo).
**Primer dominio del agente sin tabla propia ni escritura**: `/api/nesting/generar` es un cálculo
puro (algoritmo Guillotine 2D, `motor_planos.optimizar_corte_2d`), así que la tool nueva
`nesting_calcular` es `es_destructiva=False` **sin `handler_confirmar`** — no hay ninguna fila
fantasma que un flujo de confirmación deba evitar (mismo precedente que `retales_listar`).

**Plan (Fase 1):** el arquitecto identificó que el molde CRUD de los otros 5 dominios no aplica
aquí y diseñó desde cero: 1 tool de cálculo (nunca expone el SVG al modelo — se reinyecta al
contexto en cada paso del turno, quemaría dinero/contexto sin motivo), sin capa de servicio nueva
(el router ya delega en `motor_planos`, no hay nada más que envolver), y "guardar el sobrante
como retal" reutiliza `retales_crear` tal cual existe — sin ninguna tool ni mecanismo nuevo.

**Fase 2 (Security Engineer) — APRUEBA CON CAMBIOS, 5 correcciones, todas incorporadas:** (1)
truncar `piezas_fuera` a 8 nombres + conteo del resto (costo de contexto + superficie de
inyección, un nombre de pieza es texto libre del usuario); (2) topes anti-DoS como constantes
nombradas (`MAX_PIEZAS_DISTINTAS=200`, `MAX_UNIDADES_EXPANDIDAS=500`, estimación razonada
documentada como tal — el empaquetador es ~O(n²)), aplicados en una validación COMPARTIDA entre
el router HTTP (que no tenía ningún tope) y la tool; (3) `aviso_para_ti` en el dict de respuesta
(no solo en la `description` estática) recordando usar `area_libre_m2` literal si se propone
`retales_crear`; (4) `@limiter.limit("10/minute")` en `/api/nesting/generar`, que no tenía
ninguno; (5) validar `cantidad >= 1` explícito en vez de la coerción silenciosa que el código
original tenía.

**Fase 5 (Code Reviewer, 2 rondas) — ambas APRUEBA:** 1 hallazgo real que ninguna fase anterior
pudo haber visto (depende de la interacción entre dos piezas de código de esta misma ronda): si
Gemini mandaba `cantidad` como string (ej. `"3"`), la validación compartida la contaba bien pero
el handler de la tool usaba una coerción más estricta (`_como_entero`) que la colapsaba a 1 en
silencio — exactamente el patrón de "coerción silenciosa sin aviso" que la corrección #5 de Fase
2 había prohibido, reaparecido en un lugar nuevo. Corregido reutilizando la misma conversión ya
validada, verificado y reconfirmado por el mismo revisor.

**Bug real de comportamiento del modelo, encontrado en la verificación en vivo (no de código):**
con la tool registrada, aprobada, y mencionada en el system prompt (lección de Retales ya
aplicada), Cost seguía sin invocar `nesting_calcular` — en un intento respondió en inglés y a
medias, en otro dijo explícitamente que "no tenía una herramienta automática" y ofreció "hacer la
cuenta a mano". Diagnóstico: a diferencia de listar datos reales (que el modelo obviamente no
puede inventar), un cálculo de empaquetado con pocas piezas y medidas redondas es algo que el
modelo puede creer que sabe resolver mentalmente — mencionar el dominio en el prompt no basta si
la tool no prohíbe explícitamente el atajo. Corregido reforzando tanto la `description` de la
tool como una regla nueva en "Reglas estrictas, sin excepción" del system prompt: nunca calcular
el empaquetado a mano, sin excepción, ni para casos que parezcan simples. **Lección de proceso
para futuros dominios de cálculo (no CRUD):** no basta con que el modelo sepa que la capacidad
existe — si la tarea es algo que el modelo podría creer que puede aproximar solo, la tool debe
prohibirlo explícitamente, no solo describir qué hace.

**Complicación operativa aparte, no de código:** durante la verificación se descubrieron 2-3
procesos `uvicorn --reload` huérfanos de reinicios anteriores de esta sesión (más sus hijos
`multiprocessing.spawn`) corriendo simultáneamente, causando que el navegador a veces golpeara
código desactualizado sin ningún error visible. Diagnosticado con `Get-NetTCPConnection -LocalPort
8000` (revela qué PID es dueño real del puerto, a diferencia de `Get-CimInstance`/`tasklist` que
solo lista procesos vivos sin decir cuál escucha). Resuelto matando explícitamente todo proceso
con `uvicorn` o `multiprocessing.spawn` en su línea de comando antes de reiniciar, no solo el PID
que uno cree que inició. **Lección operativa:** verificar con `Get-NetTCPConnection` el dueño real
del puerto antes de dar por buena una prueba en vivo tras reiniciar servidores en esta máquina.

**Verificado en vivo (2026-09-06):** cálculo con 2 piezas que caben (aprovechamiento real
calculado, nunca inventado), oferta proactiva de guardar el sobrante citando el área exacta,
propuesta de `retales_crear` con el valor literal reutilizado, confirmación y borrado del dato de
prueba, y el caso de una pieza que no cabe (0% de aprovechamiento, aviso claro). Ningún hallazgo
nuevo en esta ronda.

**Roadmap de continuación:** dentro del Ciclo 2 queda Parámetros. "Crear cotización" sigue
diferida por su complejidad.

## ✅ Hecho (2026-09-06) — Objetivo 5, Ciclo 2, dominio Retales

Ciclo `/goal` corrido completo (Fase 0 grafo → Fase 1 Software Architect → Fase 2 Security
Engineer, 1 bloqueante real cerrado → Fase 4 ejecución, 6 commits → Fase 5 Code Reviewer, 2
rondas, ambas APRUEBA). Código nuevo: `backend/services/retales_service.py`,
`backend/models/retales.py`, `backend/agente/tools/retales.py` (4 tools: `retales_listar`,
`retales_crear`, `retales_editar`, `retales_eliminar`), router adelgazado. Primera vez que Cost
opera un dominio con doble aislamiento (empresa + `scope_propio` por usuario: un operativo solo
ve/edita/borra SUS PROPIOS retales) y con un DELETE físico real de Postgres (sin soft-delete,
a diferencia de Inventario). Detalle técnico completo en `ARQUITECTURA_MAESTRA.md` sección 8
(pendiente de escribir la próxima sesión) y en `SESSION.md` de hoy.

**Bloqueante real cerrado en Fase 2 (Security Engineer):** la primera versión del plan dejaba
que `retales_editar` aplicara directo (sin confirmación) los cambios "de bajo riesgo" (notas,
estado→Disponible/Reservado). El auditor lo rechazó: reactivar un retal a "Disponible" es la
transición riesgosa, no la segura, y la clasificación campo-por-campo era una superficie de bug
nueva. Corregido: `retales_editar` SIEMPRE propone, sin excepción.

**Hallazgo real en Fase 5, 2 rondas del mismo Code Reviewer:** ronda 1 encontró que mover la
validación de `estado` a un `field_validator` de Pydantic cambiaba el contrato HTTP de 400 a
422 en `PUT /api/retales/{id}` (el validador corre durante el parseo automático de FastAPI,
antes del handler) — corregido moviendo la validación a la capa de servicio, mismo patrón que
`cotizacion_service.cambiar_estado_cotizacion`. Ronda 2 (reverificación) aprobó el fix y señaló
un matiz de orden de chequeos (no bloqueante, corregido igual por prolijidad): con doble error
simultáneo (id inexistente + estado inválido) el 404 ganaba sobre el 400 original — reordenado
para validar la forma del body antes de tocar la base, igual que el router viejo.

**Bug real encontrado en la verificación en vivo y CERRADO (2026-09-06):** con las 4 tools
registradas y aprobadas en Fase 5, Cost respondió "Por ahora no tengo cómo consultar los
retales... todavía no tengo conectada esa parte" al preguntarle por retales — el modelo nunca
invocó `retales_listar` a pesar de que la tool existe y está registrada (confirmado por script
Python). Inventario probado en la misma conversación funcionó perfecto, descartando un problema
general del motor. Causa real confirmada: `backend/agente/runtime.py::_SYSTEM_PROMPT` nunca
mencionaba Retales como capacidad — a diferencia de Cotización/Catálogo/Inventario, que sí están
descritos ahí explícitamente. Agregado el párrafo correspondiente y **verificado en vivo que
resuelve el problema por completo** (backend y frontend reiniciados, sesión reautenticada,
prueba repetida con éxito). Lección para futuros dominios: una tool registrada y aprobada en
auditoría de código puede seguir siendo invisible para el modelo si el system prompt no la
menciona como capacidad explícita — revisar esto como parte de la Fase 5/6 de cada dominio nuevo
de aquí en adelante, no solo el registro técnico de la tool.

**Verificación en vivo completa (2026-09-06), las 4 tools contra el taller demo real, datos
desechables:** listar (vacío inicialmente, correcto) → crear un retal de prueba (propuesta con
precios en formato COP, confirmada, verificado que quedó en la base vía `/retales`) → editar su
precio de recuperación (propuesta actual/propuesto correcta, confirmada) → intentar un estado
inválido ("Perdido") — rechazado con mensaje claro listando los 3 estados válidos, sin crear
ninguna propuesta corrupta → borrar el retal (tarjeta roja de "Confirma antes de borrar",
confirmada) → preguntar "¿ya lo borraste?" — respuesta coherente, sin autocontradecirse →
verificado en `/retales` que el DELETE físico real ocurrió (la fila ya no existe, "No hay
retales registrados"). Ningún hallazgo nuevo en esta ronda de pruebas.

**Próxima tarea lógica:** decidir con el fundador el siguiente dominio del Ciclo 2 (Nesting,
Parámetros) o si se aborda "crear cotización" (deferido por su complejidad). 7 commits locales
de este dominio, sin subir a GitHub todavía.

## ✅ Hecho (2026-09-05, tercera ronda)

- **Objetivo 5, Ciclo 2 — dominio Inventario de láminas para Cost:** 4 tools nuevas
  (`inventario_listar_laminas`, `inventario_crear_lamina`, `inventario_editar_lamina`,
  `inventario_eliminar_lamina`), mismo patrón ya auditado varias veces (capa de servicio
  compartida `backend/services/inventario_service.py`, modelos nuevos `backend/models/inventario.py`
  con validación de campos físicos —`ancho_cm`/`alto_cm`/`espesor_cm` exigen `>0`, nunca `>=0`,
  porque una lámina de 0cm no es un dato válido, a diferencia de un precio en $0 en otro
  dominio—, router adelgazado a delegar en el servicio). Ciclo `/goal` completo sin atajos: Fase 0
  con el grafo del proyecto, Fase 1 delegada a un Software Architect aparte (incluyó
  `material_categoria` desde el primer plan — confirmado con el fundador antes de ejecutar), Fase 2
  con Security Engineer (corrigió que `inventario_crear_lamina` ejecutaba directo en vez de
  proponer — "stock fantasma en un solo turno" —, ahora las 3 tools de escritura siempre pasan por
  confirmación humana), Fase 5 con Code Reviewer en 2 rondas (cerró un hallazgo real: el chequeo de
  "esta lámina ya está borrada" solo vivía en el handler de la tool al proponer, no en el servicio
  al confirmar — dejaba una ventana de carrera de minutos donde una edición o un segundo borrado
  podían colarse sobre una fila ya inactiva; movido a `inventario_service.editar_lamina`/
  `eliminar_lamina`, verificado que compone bien con el rollback transaccional existente).
  Tratamiento deliberado: el borrado de Inventario es técnicamente un soft-delete (`activo=FALSE`,
  el dato sobrevive) pero se trata con la MISMA severidad que un borrado real porque la app no
  tiene ninguna pantalla para reactivarlo — el criterio correcto es "¿el usuario puede deshacerlo
  desde la app?", no "¿sobrevive el dato en la base?". Verificado en vivo contra el taller demo real
  (crear → editar → borrar → reconsultar, filas de prueba desechables). 4 bugs reales encontrados y
  corregidos en el camino, 2 reportados por el fundador probando por su cuenta: (1) al confirmar
  una acción no aparecía ningún mensaje avisando qué había pasado — Cost "parecía tener amnesia" al
  preguntarle después; corregido inyectando un mensaje de confirmación genérico al chat justo tras
  confirmar. (2) tras ese fix, Cost aún podía contradecir su propia confirmación al reverificar
  (interpretaba una búsqueda vacía tras un borrado como "nunca existió"); corregido con una regla
  nueva en el system prompt: confiar en lo que ya confirmó antes en la misma conversación. (3) la
  tarjeta de confirmación de una lámina nueva (sin id todavía) mostraba literalmente "(id
  undefined)"; corregido con un chequeo condicional. (4) el costo unitario propuesto no se
  formateaba como moneda (solo `precio_m2_propuesto` estaba en la lista fija de campos de moneda);
  corregido de forma genérica reconociendo el sufijo `_propuesto` en cualquier campo de moneda
  conocido, para que futuros dominios no necesiten repetir el registro. Próxima tarea lógica: seguir
  con el resto de dominios del Ciclo 2 (retales, nesting, parámetros) o pasar a "crear cotización"
  (deferido por su complejidad).

## ✅ Hecho (2026-09-05, continuación)

- **Objetivo 5, Ciclo 2 — dominio Catálogo de materiales para Cost:** 5 tools nuevas
  (`catalogo_listar_materiales`, `catalogo_listar_categorias`, `catalogo_crear_material`,
  `catalogo_editar_material`, `catalogo_eliminar_material`), mismo patrón auditado ya varias veces
  (capa de servicio compartida `backend/services/catalogo_service.py`, modelos movidos a
  `backend/models/materiales.py`, tipado `INTEGER` estricto, dos fases para lo destructivo/alto
  impacto). Auditado por Security Engineer en 2 rondas (2 bloqueantes reales cerrados: faltaba
  validar los argumentos de la tool con los mismos modelos Pydantic del router antes de tocar la
  base — los argumentos de una tool-call nunca pasan por FastAPI —, y faltaba el aviso
  anti-encadenamiento) + Code Reviewer en Fase 5 (aprobado, con 1 hallazgo corregido: la tarjeta
  de confirmación de editar solo mostraba antes/después del precio, generalizado a cualquier
  campo). Verificado en vivo con datos reales del taller demo: las 5 tools completas — incluido
  un hallazgo real de comportamiento del modelo, no de código: al pedir "borra el material X",
  Cost llamó a la tool de EDITAR en vez de la de BORRAR (interpretó "borrar" como revertir el
  precio). La tarjeta de confirmación mostró la verdad de lo que iba a pasar (un cambio de
  precio, no un borrado), así que la defensa estructural funcionó — pero se corrigió también la
  causa de raíz con desambiguación cruzada explícita en las descripciones de ambas tools, y se
  reverificó en vivo que Cost ya elige la tool correcta. Bug preexistente encontrado de paso (no
  de hoy, no bloqueante): la rama de copy-on-write de `editar_material` ignora silenciosamente
  `proveedor`/`activo` al editar una fila base sin sombrear todavía — pendiente como tarea
  aparte, igual que el de `calcular_merma` de la entrada anterior. Próxima tarea lógica: seguir
  con el resto de dominios del Ciclo 2 (inventario, retales, nesting, parámetros) o pasar a
  "crear cotización" (deferido por su complejidad).

## ✅ Hecho (2026-09-05)

- **Objetivo 5, Ciclo 2 — dominio Cotización para Cost:** 4 tools nuevas (`cotizacion_listar_historial`,
  `cotizacion_ver_detalle`, `cotizacion_cambiar_estado`, `cotizacion_borrar`), siguiendo el mismo
  patrón auditado de Ciclo 1 (capa de servicio compartida `backend/services/cotizacion_service.py`,
  parámetros de identidad tipados `INTEGER`, borrado en dos fases). Auditado por Security Engineer
  en 2 rondas (4 bloqueantes reales cerrados: falta de capa de servicio, tipado laxo de ids, falta
  de auditoría en cambio de estado, y un gate de prompt insuficiente para la transición a
  "Aprobada" — reemplazado por el mismo mecanismo técnico de dos fases que ya existía para
  borrados) + Code Reviewer en Fase 5 (aprobado, encontró de paso un bug preexistente no
  relacionado: `calcular_merma` no pasa `tarifas_src`, ignora la merma personalizada del taller —
  pendiente como tarea aparte). Verificado en vivo con datos reales del taller demo: los 4 flujos
  completos, incluida la tarjeta de confirmación del agente ahora genérica (antes solo mostraba
  `{titulo, id}`, con una cotización mostraba "14 (id 14)" — ahora muestra número, cliente, precio,
  fecha y estado para cualquier dominio). De paso se corrigió un bug real (Postgres devuelve
  `Decimal`/`date`, no serializables al pasarle una respuesta de tool al modelo de IA). Además,
  se descubrió y corrigió que `ag-ui-protocol` puede desaparecer del entorno Python entre
  sesiones (paquete faltante tras una actualización del sistema) y que la app dependía de
  `prefers-reduced-motion` del sistema operativo para mostrar animaciones — el fundador pidió
  revertir esto último a propósito (ver `ARQUITECTURA_MAESTRA.md`). Próxima tarea lógica:
  decidir si seguir con el resto de dominios de Ciclo 2 (catálogo, inventario, retales, nesting,
  parámetros) o pasar a "crear cotización" (deferido por su complejidad — motor de ~60 variables).

## ✅ Hecho

- **Objetivo 5, Ciclo 1 — motor del Agente de IA con tool-calling, piloto en Proyectos/Tareas
  (2026-09-04/05):** ciclo `/goal` completo (Fases 0-6), directo en `master`. El fundador eligió
  la versión más ambiciosa desde el día uno (todo el producto, asesora Y opera datos, dos
  superficies de UI) — los 3 planificadores (AI Engineer, Software Architect, Product Manager)
  recomendaron partirlo en 3 ciclos empezando por un dominio piloto de bajo riesgo, aprobado por
  el fundador. Detalle técnico completo: `ARQUITECTURA_MAESTRA.md` sección 8 y
  `docs/ROADMAP_COSTO360.md` Fase 3.
  - **Fase 2 (auditoría del plan):** Security Engineer + Database Optimizer + UX Architect. La
    primera pasada del Security Engineer devolvió **NO APRUEBA** por 3 bloqueantes reales
    (confirmar una acción destructiva no podía ser una tool del modelo; la tabla de propuestas
    pendientes debía aislar también por usuario, no solo por empresa; ninguna conexión de base
    de datos podía sostenerse durante todo un turno conversacional) — corregidos con las
    soluciones exactas que los propios auditores especificaron, y reverificados como cerrados
    por una segunda pasada del mismo especialista antes de pasar a ejecutar.
  - **Fase 4 (ejecución), 8 micro-commits:** migración `0009_agente_acciones.sql` (tabla
    `agente_acciones_pendientes`, RLS por empresa Y usuario); `rls_connection` (conexión corta
    reutilizable, extraída de `db_rls`); `services/proyectos_service.py` (lógica extraída de
    `routers/proyectos.py`, sin cambiar una línea de comportamiento — verificado creando y
    borrando una tarea real en el navegador); el motor (`backend/agente/`: `registry.py`,
    `confirmations.py`, `runtime.py`, `router.py`, `tools/proyectos.py`) con 3 tools piloto
    (listar/crear/borrar tareas); página de prueba `web/src/pages/AgentePage.tsx` (`/agente`).
    Confirmado con un spike real que el protocolo AG-UI funciona en Python puro (paquete
    `ag-ui-protocol`), sin necesitar un runtime Node intermedio — el riesgo técnico más grande
    que había señalado la planificación quedó despejado.
  - **Fase 5 (auditoría del código ejecutado):** Code Reviewer + Backend Architect +
    Accessibility Auditor, ninguno repetido de fases anteriores. Confirmaron que los 3
    bloqueantes de seguridad quedaron genuinamente cerrados EN EL CÓDIGO (no solo en el plan,
    verificado línea por línea contra el SQL real y el SDK instalado). Encontraron y se
    corrigieron 4 hallazgos reales que la auditoría del plan no podía ver por ser de
    implementación: (1) el motor bloqueaba el proceso entero por no usar `asyncio.to_thread` —
    habría congelado TODA la app (no solo el agente) mientras cualquier usuario conversaba con
    él, en el despliegue actual de un solo proceso; (2) el límite de pasos de razonamiento podía
    agotarse en silencio sin avisar al usuario (Regla 8); (3) un mensaje de error engañoso si
    una acción ya se había ejecutado antes de que un paso posterior fallara; (4) un bug latente
    de coerción `float`→`int` en los argumentos que devuelve el modelo (encontrado leyendo el
    propio código fuente del SDK `google-genai`, no solo el de Costo360). También encontró un
    hallazgo de accesibilidad real y ya corregido: la tarjeta de confirmación no movía el foco
    ni se anunciaba a un lector de pantalla, y los botones no decían qué se estaba confirmando —
    justo el tipo de descuido que podría dejar a alguien confirmar un borrado sin darse cuenta.
  - **Verificado en vivo, primero el camino degradado** (sin clave configurada): el backend y
    el frontend respondían con un mensaje claro en vez de romperse, exactamente como exige la
    Regla 7. **Y luego, el mismo 2026-09-05, con `GEMINI_AGENTE_API_KEY` real ya configurada,
    los 3 casos de punta a punta con el modelo real:** el asistente listó una tarea real del
    proyecto demo, creó una tarea nueva, y al pedirle borrarla **propuso la acción en vez de
    ejecutarla** — mostró la tarjeta de confirmación con el nombre y el id exactos, y solo se
    borró de verdad tras el clic explícito en "Confirmar" (confirmado contra el tablero real).
    Un `503` transitorio de Gemini ("alta demanda") salió en el primer intento, y el aviso de
    "completé parte de esto antes de un error" (el arreglo de la Fase 5) funcionó correctamente
    en ese caso real, no solo en teoría. **El Ciclo 1 queda completamente probado, sin ningún
    pendiente** — la clave se configuró con un tropiezo menor (el fundador la pegó por error en
    `CRON_SECRET` en vez de `GEMINI_AGENTE_API_KEY`; se corrigió y se restauró el secreto de
    cron original).
  - **Decisiones tomadas en el camino:** Ciclo 2 (resto de dominios) y Ciclo 3 (las dos
    superficies de UI completas) quedan para que el fundador decida cuándo arrancarlos, después
    de ver el Ciclo 1 funcionando de verdad con el modelo real.

- **Rebranding puntual de la barra lateral (2026-09-05):** texto "Sistema de Cotizaciones" →
  "Sistema Integral de Cotizaciones". Primer intento (2 bloques sólidos negro carbón arriba y
  abajo, corte seco contra el verde) no convenció al fundador — se consultaron 3 agentes de
  diseño (UI Designer, Brand Guardian, Accessibility Auditor). El Brand Guardian, revisando los
  archivos reales del logo, encontró el porqué: el negro **nunca** es una superficie de fondo en
  la marca real, solo tinta delgada de texto — un corte sin ninguna transición no tenía
  precedente. El fundador eligió, de 3 alternativas presentadas con vista previa, un solo
  degradado continuo (negro→esmeralda→negro) con un filo dorado de 1px marcando cada costura
  real — verificado en el navegador, sin ningún problema de contraste (confirmado por el propio
  Accessibility Auditor antes de implementar). Detalle completo: `ARQUITECTURA_MAESTRA.md`
  sección 6 e historial del 2026-09-05.

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

### Frente activo ahora mismo (actualizado 2026-09-06)
- **El Ciclo 2 del Objetivo 5 quedó completo**, incluida la pieza de "crear cotización" que
  faltaba en Cotización (ver entrada de "Hecho" arriba) — el fundador decide si sigue con el
  Ciclo 3 (chat flotante global + "Centro del Agente") o con otro frente del roadmap.
- **Decidir si se suben a GitHub los commits locales acumulados** de varias sesiones recientes
  (Ciclo 2 completo + Landing Page + "crear cotización") — nunca se subió nada todavía.
- **El fundador confirma la ronda de bugs del 2026-09-03** (Proyectos + wizard de Cotización,
  ver entrada de "Hecho" correspondiente) — en particular el arrastre real con mouse, que no se
  pudo probar de forma automatizada (ver "🔄 En progreso" arriba).
- **El fundador pidió no tocar el asa de arrastre pequeña de las tarjetas del tablero
  Kanban** (2026-09-04) — es un arreglo deliberado de accesibilidad ya auditado; si en el futuro
  se quiere una zona de agarre más grande, hay que diseñarlo con cuidado de no reabrir el
  hallazgo WCAG 4.1.2 del 2026-09-02.
- **Bugs preexistentes no bloqueantes, pendientes como tareas aparte:** `cotizacion_service.calcular_merma`
  ignora `tarifas_src` (merma personalizada del taller); `catalogo_service.editar_material` ignora
  `proveedor`/`activo` en la rama copy-on-write sobre una fila base sin sombrear.

### Prototipo ya construido — pendientes menores
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

*Última actualización: 2026-09-07*
