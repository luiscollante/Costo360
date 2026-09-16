# PROGRESS.md — Estado del Proyecto Costo360

---

## ✅ Hecho (2026-09-16, mismo día) — Bug real: Cost respondía con voseo argentino

El fundador reportó que Cost le respondió "Hola" con tono argentino ("Contame en qué te puedo dar
una mano..."), a pesar de que la personalidad ya estaba decidida como español neutro de Colombia con
tuteo. Causa raíz encontrada: el propio texto del system prompt (`runtime.py`) y varias descripciones
de tools (`bitacora.py`, `catalogo.py`, `cotizacion.py`, `inventario.py`, `proyectos.py`,
`retales.py`) tenían fragmentos reales en voseo ("vos", "tenés", "esperá", "consultá", "encontrás",
"usá", "decile", "decime", "sabés", "disculpate", "continuá") — instrucciones dirigidas al modelo, no
texto de cara al usuario, pero el modelo absorbe el registro lingüístico de TODO lo que tiene en su
contexto, no solo las reglas explícitas; la instrucción "siempre tuteo" de la cabecera no bastaba
para contrarrestar tantas líneas de voseo real más abajo en el mismo prompt. Corregidas las 22
ocurrencias encontradas en 7 archivos. Verificado en vivo con el mismo saludo que reportó el
fundador y con una segunda consulta real — ambas en tuteo limpio, sin ningún rastro de voseo. Commit
`f5dddbc`, subido y desplegado a producción (backend).

---

## ✅ Hecho (2026-09-16) — Voz de Cost (ElevenLabs): hablar verificado en vivo, envío por voz automático

El fundador pidió darle a Cost la capacidad de hablar y escuchar, con una API de ElevenLabs propia
(10.000 créditos), y consiguió su clave real durante el mismo ciclo. Decisiones tomadas antes de
construir, por el presupuesto limitado: "hablar" es manual (botón ▶ por mensaje, nunca automático);
"escuchar" usa ElevenLabs (Scribe) en vez del reconocimiento gratis del navegador; y luego, pedido
explícito aparte, el mensaje de voz se envía SOLO al detectar que el usuario dejó de hablar — nunca
un segundo clic en el micrófono ni en enviar.

**Backend** (`routers/voz.py` + `models/voz.py`): proxy mínimo contra la API de ElevenLabs
(`POST /api/voz/hablar` texto→audio, `POST /api/voz/escuchar` audio→texto), la clave nunca sale del
backend. Mismo patrón que `routers/nesting.py`: rate limit, topes anti-abuso, error controlado (503)
si falta la clave. **Bug real encontrado y corregido en vivo:** la primera voz que el fundador eligió
(de la Librería de Voces de ElevenLabs) devolvía 402 `payment_required` — las voces de librería
requieren plan pago para usarse por API, aunque funcionen en la web de ElevenLabs. Se cambió a una
voz propia ("Cost", categoría "generada") que sí está disponible en su plan actual — confirmado
`200 OK` contra la API real antes de aplicar el cambio.

**Frontend** (`CostChat.tsx`): botón ▶ por mensaje de Cost (loader mientras genera, toggle a pausa
mientras suena, un solo audio a la vez) y botón de micrófono junto al input. El micrófono graba con
`MediaRecorder` nativo y usa Web Audio API (`AnalyserNode` + RMS en vivo) para detectar cuándo el
usuario dejó de hablar de verdad (1.5s bajo el umbral, solo después de haber detectado voz al menos
una vez, para no cortar de inmediato si el ambiente ya estaba en silencio) — al detectarlo, transcribe
y **envía el mensaje directo**, sin pasos intermedios. Tope de 60s como respaldo si el silencio nunca
se detecta. Un clic manual en el micrófono mientras graba sigue cortando antes si el usuario quiere.

**Verificado en vivo:** "hablar" funciona de punta a punta contra la API real de ElevenLabs (audio
generado, reproducido, y el botón vuelve a su estado normal al terminar). La grabación por micrófono
no se pudo probar de punta a punta por automatización (no hay micrófono real en este entorno) — el
fundador debe probarla con su propia voz para cerrar el loop del todo.

Variables `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID` configuradas en `backend/.env` (local) y también
agregadas al proyecto `costo360-backend` en Vercel (producción). Commits `221c857`, `d93b62e`, subidos
y desplegados a producción (backend + frontend).

**Pendiente real:** que el fundador confirme con su voz real que "escuchar" transcribe y envía
correctamente — es la única parte que esta sesión no pudo verificar de punta a punta.

Commit `221c857`.

---

## Esfera líquida de marca para los estados de Cost — pendiente, siguiente frente

El fundador también pidió una esfera líquida personalizada (identidad Costo360) para los estados de
carga/pensamiento/procesamiento de Cost, usando el repositorio `github.com/LerSent001/orb` como base.
Investigación previa a construir: ese repo es un **editor** de esferas por WebGPU (no una librería para
instalar), sin fallback para navegadores sin soporte (Safari, algunos móviles). Decisión del fundador:
usar el shimmer dorado actual como respaldo donde WebGPU no esté disponible. Falta: clonar/correr el
editor, diseñar un preset con los colores de marca (esmeralda/dorado), exportar el resultado, y
construir el componente React que lo integre en `CostChat.tsx` con el respaldo ya decidido — no
iniciado todavía en este ciclo.

---

## ✅ Hecho (2026-09-15, mismo día) — Bug crítico: tarjeta duplicada al arrastrar dos veces

El fundador reportó, tras los 3 arreglos de más abajo: arrastrar una tarjeta de un estado X a un
estado Y y luego de vuelta a X hacía que apareciera **duplicada** en Y — desaparecía sin dejar rastro
al recargar la página (solo el estado en memoria del cliente quedaba mal, la base de datos siempre
estuvo correcta).

**Causa raíz real:** `mover()` reconciliaba la columna destino después de cada movimiento exitoso
llamando a `recargar(hacia)` — una petición GET aparte e independiente que volvía a listar TODA la
columna. Si la misma tarjeta se arrastraba de nuevo antes de que esa respuesta llegara, la respuesta
vieja (todavía con el primer movimiento) podía llegar DESPUÉS del segundo y sobreescribir la columna,
resucitando la tarjeta fantasma donde ya no debía estar.

**Arreglo:** `moverProyecto()` ya devuelve el proyecto completo actualizado (progreso/riesgo
recalculados) como respuesta directa del propio movimiento — ahora se usa esa respuesta para
reconciliar solo esa tarjeta, sin lanzar ninguna petición aparte. Elimina la clase de bug de raíz: ya
no existe una segunda petición independiente que pueda llegar fuera de orden.

Durante la investigación se encontró un cambio real e inesperado en la base de datos (proyecto
"Cocina Torre Andina 302" pasó de Activo a Planificación) que no coincidía con ninguna prueba propia
— se le preguntó al fundador antes de asumir nada o revertir algo; confirmó que fue él mismo, en
paralelo, mientras se investigaba. Commit `34f17a7`, subido y desplegado a producción (frontend).

## ✅ Hecho (2026-09-15) — 3 arreglos reales del tablero de Proyectos

El fundador confirmó en vivo que el arrastre real con mouse del Kanban de Proyectos funciona bien
(cierra el único pendiente que quedaba de la ronda del 2026-09-03), pero reportó 3 problemas nuevos
al usar el tablero en profundidad. Los 3 se investigaron con evidencia real (lectura de código +
reproducción en vivo con la consola del navegador) antes de tocar nada:

1. **"Recargado desde cero" al mover un proyecto:** causa raíz real en `useTableroProyectos.
   recargar()` — vaciaba la columna destino a `{items: [], cargando: true}` antes de refetch,
   disparando el skeleton como si la página arrancara de cero. Corregido para mantener las tarjetas
   visibles mientras se refresca en segundo plano. Instrumentado en vivo con medición de tiempos: en
   el tablero de Tareas (detalle de proyecto) NO se reprodujo el mismo problema — ese código ya usa
   optimistic updates reales vía react-query.
2. **No se podía marcar un proyecto como "Completado" desde la pestaña Operativa:** el menú "Mover
   a" solo ofrecía los estados que son columnas de la vista actual, y "Completado" solo vivía en
   "Cierre". Confirmado con la consola del navegador (el `<select>` de un proyecto "En revisión" en
   Operativa no tenía esa opción). Corregido: el menú ahora siempre ofrece todos los estados
   operables, sin importar la pestaña.
3. **"En revisión" aparecía a la vez en Operativa y Cierre**, confundiendo a usuarios no técnicos.
   El fundador eligió sacarlo de Operativa por completo — ahora vive solo en Cierre.

Verificado en vivo con datos reales del taller demo (movimientos de prueba revertidos al terminar).
Commit `1a3db1f`, subido y desplegado a producción (frontend; sin cambios de backend en este ciclo).

## ✅ Hecho (2026-09-15) — Ajuste post-rediseño: distinguir usuario de Cost

El fundador probó el rediseño de Cost del día anterior y reportó 2 problemas: no le gustaba el
degradé color crema sobre el scroll, y no podía distinguir su propio mensaje de la respuesta de Cost
(el label pequeño "Tú"/"Cost" no bastaba, ambos eran texto plano casi idéntico). Se quitó el degradé.
El turno del usuario ahora es un bloque propio alineado a la derecha con borde/fondo sutil (mismo
patrón que usa esta propia CLI para distinguir el prompt del usuario de la salida del agente); la
respuesta de Cost sigue en estilo bitácora (texto plano, izquierda, con sus pasos de herramienta) —
mantiene el objetivo de "agente, no chatbot" del ciclo anterior sin sacrificar que se pueda distinguir
quién dijo qué. Se agregó un `sr-only` "Tú:" para no perder la señal de rol en lectores de pantalla.
Verificado en vivo. Commit `7ad585b`, subido y desplegado a producción (frontend).

Ajuste adicional el mismo día: el fundador pidió que "Pensando…" resaltara un poco más — el punto
dorado ganó un anillo pulsante (mismo lenguaje visual que ya usa un paso de herramienta activo) y el
texto pasó de `text-xs`/`font-medium` a `text-sm`/`font-semibold`. Commit `f38a950`, desplegado.

---

## ✅ Hecho (2026-09-14, mismo ciclo) — Rediseño de Cost: agente de IA, no chatbot

El fundador pidió un ciclo de diseño para el panel de Cost: "necesito que tenga animaciones de carga,
tenga menos ruido visual y dé la impresión a los usuarios de que es un Agente de IA y no un
chatbot/asistente al que le hablas y te responde", más revisar el panel en el navegador por si tenía
demasiado scroll interno. Investigación en vivo confirmó el estado real: burbujas de chat clásicas en
zig-zag, un "…" estático sin ninguna animación como único indicador de carga, y un panel de altura
fija que ya necesitaba scroll interno a los 3 intercambios.

Se armó un ciclo con 2 agentes de diseño (UI Designer + Whimsy Injector) en paralelo, cada uno con el
contexto técnico real (código exacto, tokens de marca, regla dura de nunca respetar
`prefers-reduced-motion`, personalidad ya decidida de Cost). Hallazgo técnico central del ciclo: el
backend YA emitía eventos AG-UI reales `TOOL_CALL_START`/`TOOL_CALL_END` con el nombre de la
herramienta ejecutándose — pura oportunidad de frontend, cero cambios de backend. Al implementar
apareció un bug real (no hipotético): el encoder de `ag-ui` serializa esos campos en camelCase
(`toolCallId`/`toolCallName`), no snake_case como el modelo Python los nombra — verificado
directamente contra el encoder real antes de corregir, o los eventos habrían llegado silenciosamente
vacíos al frontend.

Implementado: el panel dejó de dibujarse como conversación de mensajería y pasa a ser una bitácora de
una sola columna (fila por turno, label "Tú"/"Cost", sin burbujas de color); el "…" se reemplazó por
un punto dorado pulsante + shimmer de texto; cada llamada a herramienta se ve en vivo como "Consultando
Proyectos"/"Actualizando Catálogo"/etc. con su propio anillo pulsante, y se colapsa a un resumen
clicable en cuanto el turno termina (soluciona el scroll rápido sin depender solo de agrandar el
panel); la tarjeta de confirmación ganó borde discontinuo, badge, subtítulo ("Cost pausó aquí — esto
no se ejecuta hasta que decidas"), filas tipo recibo y estado de carga visible en los botones.
Verificado en vivo en el navegador (página dedicada y widget flotante compacto), incluida una tarea de
prueba creada y borrada de punta a punta para confirmar el flujo completo. Commit `d829dd4`, subido y
desplegado a producción (frontend).

---

## ✅ Hecho (2026-09-14, mismo ciclo) — Destaca Cost en el sidebar

El fundador reportó que Cost pasaba desapercibido: vivía como el último ítem del grupo Ajustes, con
el mismo estilo visual que Parámetros o Configuración. Se preguntó si sacarlo del grupo (con estilo
propio), dejarlo en el mismo lugar (solo cambiando el estilo), o sacarlo sin darle estilo especial —
eligió sacarlo del grupo Ajustes y darle estilo propio. Ahora es un ítem suelto entre "Cotizaciones"
y "Taller" (mismo nivel que Proyectos), con fondo/borde dorados, un glow dorado cuando está activo, y
una etiqueta "Beta". Verificado en vivo: se ve claramente distinto al resto de la navegación, navega
bien a `/agente`, y sigue oculto para el rol operativo (misma bandera `requiereDashboard` que ya
usaban Parámetros/Configuración). Commit `2fcf4d0`, subido y desplegado a producción (frontend).

---

## ✅ Hecho (2026-09-14, mismo ciclo) — Quita el campo muerto "Condiciones de pago"

El fundador reportó que tener que escribir a mano las condiciones de pago en Configuración se sentía
poco profesional. Investigación confirmó que el campo era código muerto: se guardaba y se devolvía
por el API, pero `generador_pdf.py` nunca lo lee — la línea real "Forma de pago" que sí aparece en
los PDFs ("60% anticipo · 40% contra entrega") ya se genera sola a partir del slider de Anticipo
requerido, en la misma sección. Se preguntó al fundador si prefería quitarlo o conectarlo de verdad
a un selector — eligió quitarlo. Removido el input, el default, el tipo TS, y la clave en los 2
lugares del backend que la devolvían. Verificado: typecheck limpio, imports de backend limpios, el
campo ya no aparece en Configuración. Commit `792ab64`, subido y desplegado a producción (backend +
frontend).

## ✅ Hecho (2026-09-14) — Ciclo: bug del lápiz en Historial (AIU + cotizaciones vacías)

El fundador reportó 2 problemas en Historial: las cotizaciones AIU no tienen lápiz de editar, y las
que sí lo tienen abren el formulario casi vacío al editar. Investigación en vivo confirmó ambos y
encontró la causa raíz real de la segunda: `_wizard_inputs` (los datos que el formulario necesita
para reconstruirse) solo lo genera el asistente paso a paso — las cotizaciones creadas por **Express**
o por el agente **Cost** nunca lo incluyen, sin importar qué tan nuevas sean (no era solo un problema
de datos viejos, como parecía al principio).

**Antes de programar, limpieza de datos de desarrollo (autorizada explícitamente):** se identificaron
por consulta directa a la BD 7 cotizaciones de la cuenta demo sin `_wizard_inputs` (todas de prueba,
anteriores a que existiera esta función) — se mostró la lista completa (ID, número, cliente, fecha) y
se borraron por ID exacto tras confirmación, verificando antes y después que las cotizaciones con
datos completos quedaran intactas.

**Implementado:**
- Lápiz de editar visible siempre (antes oculto para AIU) — `handleEdit()` en `HistorialPage.tsx`
  ahora detecta AIU y navega a `/cotizacion-aiu` con los datos guardados
  (`_estado_guardado.aiu_items`, cliente, ciudad, teléfono, pct A/I/U, IVA); `CotizacionAIUPage.tsx`
  gana un hook de hidratación igual al patrón que ya usaba `CotizacionPage.tsx`.
- `reconstruirWizardInputs()`: cuando falta `_wizard_inputs` (Express, Cost, o cualquier cotización
  vieja), arma una aproximación (1 material + 1 pieza + datos de proyecto) a partir de los campos
  planos que el cálculo siempre guarda, con un toast explicando que es una aproximación a revisar.
  Resuelve el bug de raíz para las 3 vías de creación, no solo el caso puntual reportado.

Verificado en vivo: editar la cotización AIU real carga sus ítems guardados correctamente; una
cotización creada por Express (sin `_wizard_inputs`) muestra el aviso y reconstruye
material+pieza+proyecto con valores correctos (incluido el largo derivado del m² real). Commits
`946d2e8` (fix) — el borrado de datos fue directo a BD, sin cambio de código — subido y desplegado a
producción (frontend).

## ✅ Hecho (2026-09-14, mismo ciclo) — Logo de Costo360 oculto cuando el taller tiene logo propio

El fundador pidió que el logo/marca de agua "Generado por Costo360" (encabezado + pie de página de
los PDFs) no aparezca cuando el taller ya tiene su propio logo cargado — con logo propio, el
documento debe ser 100% de la marca del taller. `_encabezado_doc`/`_footer_doc` en
`backend/motor/generador_pdf.py` ahora condicionan la carga y el render del logo/texto de Costo360 a
que el taller NO tenga logo (`not logo_bytes` / nuevo parámetro `tiene_logo_propio`). Verificado en
vivo: cotización real generada con un logo de taller ya guardado — ni el logo ni el texto de
Costo360 aparecen en ningún lado del documento (el PDF resultante pesa ~11 KB en vez de ~100+ KB, al
no incrustar esa imagen). Commit `8282a53`, subido y desplegado a producción (backend).

## ✅ Hecho (2026-09-13, continuación) — Bug real de persistencia del logo, resuelto

El pendiente que había quedado del ciclo de PDF de marca por taller: la subida de logo devolvía
éxito pero no se veía reflejada al leerla de vuelta. Investigación completa: se descartó sesión/RLS
(confirmado consultando la BD directo con rol de servicio — la fila SÍ se guardaba — y reproduciendo
la misma sesión de Postgres que usa `rls_connection()` — la fila SÍ era visible bajo RLS). Causa real,
aislada con trazas temporales: `cfg_get` (`backend/db/config_helpers.py`) tenía una rama
`json.loads()` sobre valores que psycopg2 ya deserializa de `jsonb` a su tipo nativo — para un valor
STRING (el logo en base64), eso rompía contra el base64 (no es JSON válido), la excepción se tragaba,
y la función devolvía `None` en silencio. Solo afectaba a valores de config planos tipo string (los 2
campos del logo); el resto de la config es un `dict` y ya tomaba la rama correcta.

Verificado de punta a punta con el flujo real de la app (no solo scripts aislados): logo de prueba
subido desde Configuración → persiste → se genera una cotización real desde Historial → el PDF ya usa
la paleta de colores extraída de ese logo. Commit `217422c`, subido y desplegado a producción.

Con esto queda cerrado por completo el ciclo de PDF de marca por taller — la feature funciona de
punta a punta en la app real, no solo en pruebas aisladas.

## ✅ Hecho (2026-09-13, continuación) — PDF: 2 correcciones post-verificación del fundador

Tras el ciclo de PDF de marca por taller, el fundador revisó los PDFs generados y encontró 2
problemas reales que mi propia verificación no había detectado:

1. **Las 2 variantes del logo Costo360 estaban invertidas.** Había asumido por el nombre de archivo
   que `web/public/logo_versiones_oscuras.png` era la variante de texto claro (para fondo oscuro) y
   `web/public/logo.png` la de texto oscuro (para fondo claro) — era exactamente al revés. Confirmado
   componiendo cada archivo sobre fondo oscuro y claro por separado antes de corregir. Se corrigió el
   contenido de `backend/motor/logo_costo360_oscuro.png`/`logo_costo360_claro.png` (mismos nombres,
   contenido correcto). Commit `e50c2ea`.
2. **El logo Costo360 del encabezado no quedaba pegado al margen derecho** — se veía "casi en el
   centro". Causa: la tabla del encabezado no tenía ningún `ALIGN` definido para la columna derecha;
   el texto de al lado se veía bien alineado porque cada `Paragraph` traía su propio estilo
   `alignment=TA_RIGHT`, pero una imagen (`Image` flowable) no hereda esa alineación dentro de una
   celda de tabla — ReportLab solo la respeta vía el comando `ALIGN` de `TableStyle`. Se agregó
   `ALIGN RIGHT` a la columna derecha completa del encabezado. Commit `0cb4fe0`.

Ambos verificados generando PDFs de prueba y desplegados a producción (backend).

## ✅ Hecho (2026-09-13, continuación) — Ciclo: PDF de marca por taller + 3 bugs reales cerrados

El fundador pidió sentar las bases para estandarizar el formato de PDF de los entregables (cotización,
oferta AIU, cuenta de cobro): extraer los colores dominantes del logo del taller (subido previamente)
en vez de usar siempre la paleta fija de Costo360, con una plantilla base fija en vez de un diseño
reinventado cada vez. Ciclo completo: investigación de código (con subagente), validación en vivo de
los 3 tipos de documento en el navegador, plan aprobado, implementación y verificación.

**Hallazgo de partida:** el generador (`backend/motor/generador_pdf.py`, ReportLab) ya era 100%
determinístico — no hay ningún LLM diseñando el layout. El problema real era otro: la función
`_extraer_paleta_logo` existía pero estaba desactivada a propósito, ignorando el logo del taller y
forzando siempre la paleta de Costo360.

**Implementado:**
- `_extraer_paleta_logo` real: cuantiza el logo con Pillow (sin dependencias nuevas), descarta
  blancos/negros/grises puros del fondo, y deriva 3 colores (no 4 — son los 3 roles reales que la
  plantilla usa) con piso/techo de luminancia (vía `colorsys`) para garantizar texto legible sin
  importar qué tan claro u oscuro sea el logo. Sin logo o si falla, usa la paleta de Costo360 sin
  cambios.
- 3 bugs reales encontrados validando los PDFs en vivo, cerrados de una vez (afectan a los 3
  documentos por compartir `_encabezado_doc`/`_footer_doc`): el logo "Costo360" quedaba casi
  ilegible en el encabezado (texto claro compuesto sobre un recuadro blanco forzado — corregido con
  un parámetro `fondo` dinámico en `_logo_img` y las 2 variantes correctas del logo, claro/oscuro,
  ya existentes en `web/public/`); el nombre de empresa vacío caía en un fallback hardcodeado a un
  nombre de empresa real específico en vez de un texto neutral ("Tu Taller"), lo mismo que dejaba
  vacío el cuadro "PRESTADOR DEL SERVICIO" de la cuenta de cobro; la sección de inclusiones/exclusiones
  se imprimía con "-- / --" en vez de omitirse cuando no hay datos; y el número de documento se
  repetía 3 veces en la página 1.
- Nuevo `docs/PLANTILLA_PDF_COSTO360.md`: referencia fija de roles de color y estructura de secciones.

Verificado con 6 PDFs de prueba (script Python directo con un logo de prueba rojo/azul/amarillo +
1 generado por el navegador contra el backend real): paleta dinámica aplicada de forma consistente
en los 3 tipos de documento, logo Costo360 legible en ambos fondos, fallback "Tu Taller" correcto,
secciones vacías omitidas. Commit `4381a19`, subido y desplegado a producción (backend).

**Nota aparte, no corregida (fuera de alcance):** la subida de logo (`POST /api/config/logo`)
devuelve éxito pero el GET inmediato posterior no refleja el logo guardado en la cuenta demo —
parece un problema de persistencia o aislamiento de sesión, no de la lógica de extracción de color.
Investigar en un ciclo aparte antes de que un taller real use esta función.

## ✅ Hecho (2026-09-13, continuación) — Nesting: tabla de leyenda a 2 decimales

El fundador pidió que las columnas Largo, Ancho y Área de la tabla de piezas al pie del plano
mostraran solo 2 decimales — mostraban 3 (`2.400`) y 4 (`1.5600`, y el total `2.6400`), inconsistente
con el resto de la app. Ajuste puntual de formato en `motor_planos.py` (`_generar_svg_nesting`): las
3 columnas y la fila de TOTAL pasan de `.3f`/`.4f` a `.2f`. Verificado en vivo en `/nesting` con un
plan de 2 piezas: la tabla ahora muestra `2.40 / 0.65 / 1.56` y `1.20 / 0.90 / 1.08`, total `2.64 m²`.
Commit `00ee29b`, subido y desplegado a producción (backend).

## ✅ Hecho (2026-09-13, continuación) — Nesting: barra de título reorganizada para leerse de un vistazo

El fundador pidió reorganizar el texto de la barra de título del plano ("NESTING 2D · Placa
3.20×1.60 m · Uso: 30.5% · Retal: 69.5%") porque, al ir todo en una sola oración con separadores
"·" y el mismo tamaño/peso, no se entendía rápido. Rediseño a 2 filas en `motor_planos.py`
(`_generar_svg_nesting`): fila 1 = identificación del plano + dimensión de la placa, en texto
discreto; fila 2 = los 2 datos que realmente importan de un vistazo — Uso y Retal — como "chips"
independientes con ícono + número grande en negrita. El chip de Uso usa el mismo verde esmeralda de
las piezas colocadas (cuadro sólido); el de Retal usa dorado con un cuadro hueco, siguiendo el mismo
lenguaje visual sólido=pieza / vacío=sobrante que ya usa el resto del plano. Altura de la barra de
título sube de 44 a 60px para dar espacio a las 2 filas.

Verificado en vivo en `/nesting`: los 2 chips se leen de inmediato, y las descargas PNG/PDF/SVG
(agregadas en el ciclo anterior) siguen funcionando bien con la barra más alta. Commit `82b712a`,
subido y desplegado a producción (backend).

## ✅ Hecho (2026-09-13, continuación) — Nesting: descarga en PNG/PDF + fix de la cota vertical

El fundador pidió agregar 2 opciones de descarga más al plano de Nesting (antes solo SVG): PNG y
PDF, para un total de 3. El botón "Descargar SVG" pasa a un menú desplegable ("Descargar ▾") con
las 3 opciones. Nueva utilidad `web/src/lib/svgExport.ts`: como el SVG del plano es autocontenido
(sin recursos externos), se rasteriza directo en un `<canvas>` del lado del cliente sin librerías
para el PNG; para el PDF se agregó `jspdf` (nueva dependencia) embebiendo la imagen como **JPEG**
en vez de PNG — el patrón de rayado (hatch) del fondo comprime pésimo como PNG (primera versión:
8.6 MB) y muy bien como JPEG (~140 KB), sin pérdida perceptible en textos/cotas. El tamaño de
página del PDF respeta las proporciones reales del plano (conversión mm a 96 DPI).

De paso, el fundador reportó que la etiqueta de la cota vertical (el campo "ANCHO" del formulario,
lado izquierdo del plano) tenía el fondo desalineado del texto — el fondo se veía horizontal
mientras el texto se veía vertical. Investigación en `motor_planos.py` confirmó el bug: el `<rect>`
de fondo se definía ya "vertical" (16×72) *antes* de aplicarle `rotate(-90)`, lo que lo dejaba
horizontal (72×16) después de rotar, mientras el texto (que parte horizontal y se rota igual)
sí terminaba vertical como se esperaba. Se corrige definiendo el rect como horizontal (72×16,
igual que su contraparte de la cota de arriba) antes de la rotación, para que ambos — fondo y
texto — terminen vertical y alineados tras el `rotate(-90)`.

Verificado en vivo en `/nesting`: los 3 formatos de descarga producen archivos válidos (confirmado
por firma de bytes: `%PDF-1.3`, PNG, SVG) y la etiqueta de la cota vertical ya no muestra el fondo
desalineado. Nota de proceso: la primera ronda de verificación pareció fallar (el PDF no aparecía
en el Escritorio inmediatamente después del toast de "descargado") — resultó ser solo una demora
de escritura a disco/antivirus, no un bug real; confirmado ejecutando el mismo código directo en la
consola del navegador, que sí produjo el archivo. Commit `c10bf90`, subido y desplegado a
producción (backend + frontend).

## ✅ Hecho (2026-09-13) — Nesting: el plano de corte pasa a los colores reales de Costo360

El resultado del plan de Nesting (`backend/motor/motor_planos.py`, función `_generar_svg_nesting` —
la única realmente invocada por `optimizar_corte_2d`, usada por `agente/tools/nesting.py` y
`routers/nesting.py`) usaba una paleta azul-marino/dorado-genérico sin relación con la marca, herencia
del prototipo original. El fundador eligió mantener la estética de "plano técnico oscuro" pero
recolorearla con los tokens reales de Costo360 (`web/src/index.css` `:root`): fondo/placa a esmeralda
profundo, acentos/cotas a esmeralda clara, dorado real de marca en vez del dorado genérico anterior.

La paleta rotativa por pieza (`_NEST_FILLS`/`_NEST_STROKES`, 10 tonos) no se colapsó a un solo
color — eso habría destruido la distinción visual entre piezas, que es su propósito. Se curó una
paleta nueva de 10 tonos cálidos/tierra que encabeza con esmeralda y dorado reales de marca y
conserva la distinguibilidad pieza a pieza. Los colores de advertencia semántica (pieza ROTADA en
rojo, panel de "piezas que no caben") se dejaron intactos a propósito — son alerta universal, no
identidad de marca.

Verificado en vivo en `/nesting` con un plan real (placa 3.20×1.60m, piezas "Mesón cocina"
2.40×0.65m + "Isla" 1.20×0.90m): título, placa, piezas, cotas y tabla de leyenda renderizan
correctamente con la paleta nueva. Commit `62c20bd`, subido y desplegado a producción (backend).

**Nota aparte, no corregida en este ciclo (fuera de lo pedido):** el archivo tiene ~700 líneas de
código muerto heredado del prototipo Streamlit (`generar_plano_svg`, `wrap_svg_streamlit`,
`exportar_svg_a_pdf` y sus helpers) sin ningún caller real en `backend/` — candidato a limpieza en
un ciclo futuro, igual que `calcular_merma` en un ciclo anterior.

## ✅ Hecho (2026-09-13, continuación) — Barrido completo: quita `.glass` de otros 12 archivos

Tras el arreglo puntual de Cost/RetalesPage, el fundador pidió revisar el resto de la app. Barrido
completo: `.glass` seguía en 53 tarjetas/modales/paneles flotantes más, repartidos en 12 archivos
(`SessionGuard.tsx`, `LoginPage.tsx`, `ResetPasswordPage.tsx`, `CotizacionPage.tsx`,
`CotizacionExpressPage.tsx`, `CotizacionAIUPage.tsx`, `ParametrosPage.tsx`, `NestingPage.tsx`,
`InventarioPage.tsx`, `HistorialPage.tsx`, `ConfigPage.tsx`, `AdminPage.tsx`). Reemplazo mecánico y
verificado del token de clase `glass` → `bg-brand-surface`, excluyendo a propósito
`glass-emerald`/`glass-gold` (gradientes sólidos reales del sidebar, mal nombrados pero no son el
bug). Verificado en vivo en 3 páginas representativas (Login, Nesting, Parámetros) — todas sólidas.

**Fuera de alcance a propósito:** `LandingPage.tsx` + sus 3 componentes también usan `glass`, pero
esa página no está conectada a ninguna ruta real de `App.tsx` — código muerto, invisible para
cualquier usuario, no vale la pena tocarlo. Commit `adc59bd`, subido y desplegado a producción.

## ✅ Hecho (2026-09-13) — Quita la transparencia del panel de Cost y del modal de "Agregar retal"

Ambos usaban la clase `.glass` (60% blanco + blur de 20px), remanente del diseño glassmorphism
anterior al rediseño visual (que ya movió el resto de la app a superficies sólidas vía `Card.tsx`).
El modal de "Agregar retal" ni siquiera usa el `Dialog.tsx` compartido — es un modal hecho a mano en
`RetalesPage.tsx` que se quedó con el estilo viejo. Los dos pasan a `bg-brand-surface` sólido (blanco
real, sin alfa), mismo tratamiento que ya usa `Dialog.tsx` para cualquier otro modal de la app — el
fondo oscuro detrás del modal (`bg-black/50 backdrop-blur-sm`, que sí es intencional) no se tocó.
Verificado en vivo con la extensión de Chrome: ambos quedan completamente opacos. Commit `fe7e65a`,
subido y desplegado a producción.

**Nota aparte, no corregida en este ciclo (fuera de lo pedido):** `.glass` sigue usándose en otros
11 archivos — si se quiere migrar el resto también, es un frente aparte.

## ✅ Hecho (2026-09-12) — Cost: mensajes largos ya no se cortan, chat contiene código/texto largo

Ciclo `/goal` completo (Fase 0-6), 2 bugs reales reportados por el fundador probando la app.

**Bug 1 — mensajes largos se cortaban ("se cortó la conexión" era una excusa falsa del modelo):**
causa raíz real encontrada en Fase 0: `max_output_tokens=800` en `runtime.py` — un tope duro de la
propia API de Gemini, nunca un problema de red. El código tampoco revisaba `finish_reason`, así que
ni el backend ni el modelo sabían que había pasado; al preguntarle después, Cost inventaba una
excusa técnica falsa por no tener la razón real. Reproducido exactamente con el ejemplo del
fundador: "¿cuántos materiales tengo en mi catálogo?" contra un catálogo real de 255 materiales.

Fix: `max_output_tokens` sube a 2048; si aun así el modelo corta por longitud
(`finish_reason == MAX_TOKENS`), se reintenta UNA vez con 4096 ANTES de emitirle nada al usuario —
invisible, nunca ve la versión cortada. Nueva regla en el system prompt: nunca inventar una excusa
técnica por una respuesta propia incompleta. Además, las 5 tools "listar" (catálogo, inventario,
retales, tareas, historial de cotización) devolvían la lista cruda completa sin ningún campo de
conteo — se agrega `total` (y `hay_mas_de_las_mostradas` en cotización, que tiene tope fijo de 50)
a las 5, con una nota en la `description` de cada tool para que Cost lo use directo en vez de
contar la lista él mismo.

**Bug 2 — un mensaje con código se salía del recuadro del chat:** `CostChat.tsx` no tenía ningún
componente `pre` en `ReactMarkdown` (se renderizaba sin ancho máximo ni scroll propio), y la
burbuja del mensaje no tenía `overflow-hidden`/`min-w-0`/`break-words` como defensa contra
cualquier contenido ancho sin espacios. Fix: `pre` ahora es un recuadro con scroll horizontal
propio; la burbuja gana las 3 clases de defensa en profundidad.

**Verificado en vivo con la extensión de Chrome:** la pregunta exacta que fallaba (255 materiales)
responde limpia y completa, sin cortes; un bloque de código forzado con una línea de 200+
caracteres queda contenido en su propio recuadro con scroll, confirmado con zoom visual, sin
desbordar el panel del chat.

Commit `ba8b4b5`, subido y desplegado a producción (backend + web).

## ✅ Hecho (2026-09-10/11) — Disparador real de los 2 barridos (cron) conectado

Ciclo `/goal` completo desde Fase 0, pedido explícitamente por el fundador ("resolvamos el
disparador, arma un ciclo completo desde la fase 0"). Cierra un pendiente operativo real: ni el
barrido de limpieza de la Bóveda del Agente ni el barrido diario de Proyectos tenían un disparador
automático conectado — ambos existían y funcionaban, pero nadie los llamaba solos.

**Fase 0 (investigación):** confirmado con la documentación oficial de Vercel (2026-08-11) que su
cron nativo invoca SIEMPRE por GET, manda automáticamente `Authorization: Bearer <CRON_SECRET>`
(variable ya configurada en producción desde antes), y el plan gratuito permite 100 crons por
proyecto una vez al día — de sobra para los 2 que hacían falta. Se descartaron cron-job.org
(exigiría que el fundador cree una cuenta nueva) y GitHub Actions (exige el CLI `gh`, no instalado
en esta máquina). `backend/vercel.json` solo tenía una entrada muerta apuntando a un router
`finanzas` que ni siquiera está montado en `main.py`.

**Fase 1-2:** plan propio auditado por un Security Engineer independiente — **APRUEBA CON
CAMBIOS**, 2 correcciones de implementación (extraer el prefijo `"Bearer "` antes de comparar el
secreto; `Cache-Control: no-store` en ambas respuestas), ninguna bloqueante arquitectónica.
Confirmó además que ambos barridos ya eran genuinamente idempotentes (verificado leyendo el SQL
real, no solo los comentarios).

**Fase 3:** aprobación explícita del fundador, incluyendo conectar también `proyectos_cron.py`
(mismo problema, no pedido al inicio pero con el mismo fix).

**Fase 4 (ejecución):** `POST`→`GET` en los 2 endpoints (`/api/agente/cron/limpiar-historial`,
`/api/proyectos/cron/barrido-diario`); `verificar_secreto_cron` acepta el secreto por
`Authorization: Bearer` (nativo de Vercel) O `X-Cron-Secret` (alternativa manual), mismo
`CRON_SECRET`, comparación en tiempo constante en ambos casos; `vercel.json` con las 2 entradas
reales, sin la entrada muerta de finanzas. Ninguna lógica de negocio de los barridos cambió.

**Verificado en vivo:** local (sin secreto → 401, secreto incorrecto → 401, `Authorization: Bearer`
correcto → 200, `X-Cron-Secret` correcto → 200, `POST` → 405, `Cache-Control: no-store` presente en
los 2 endpoints) y en producción real — `vercel crons ls` confirma las 2 entradas registradas, y
`vercel crons run` disparó ambos crons de verdad contra producción (confirmado en los logs de
runtime: `GET /api/agente/cron/limpiar-historial` y `GET /api/proyectos/cron/barrido-diario`, nivel
`info`, sin errores).

Commit `a35b0a8`, subido y desplegado a producción.

## ✅ Hecho (2026-09-10, cierre de sesión) — Tablero de Proyectos sin recarga + limpieza de código muerto

Ciclo combinado ya aprobado por el fundador tras cerrar el Ciclo 3, con dos frentes:

1. **Tablero de Proyectos (`/proyectos`) ya no se recarga desde cero al reentrar.** Causa raíz
   real: `useTableroProyectos.ts` montaba el hook entero en cada navegación a la sección,
   vaciando el tablero y pidiendo la página 1 de cada columna otra vez, sin importar cuánto
   hiciera que se había visitado. Fix: caché en memoria a nivel de módulo (vive mientras la
   pestaña esté abierta), keyed por columnas+búsqueda+orden — al reentrar con la misma
   combinación se pinta de inmediato lo último visto mientras se refresca en segundo plano
   (stale-while-revalidate), tope de 8 entradas (LRU simple) para no crecer sin límite.
   La pantalla de detalle de un proyecto (`/proyectos/:id`, Tareas) ya usaba `react-query` con
   caché real — no era parte del problema. Verificado en vivo (extensión de Chrome): segunda
   visita sin parpadeo de carga, refetch de fondo confirmado en la red (5 columnas).
2. **`cotizacion_service.calcular_merma` eliminado** — código muerto confirmado (cero
   consumidores en el frontend, solo alcanzable vía `POST /api/calculos/merma`, que tampoco
   llamaba nadie), junto con el endpoint y el modelo `MermaIn` que solo él usaba.
   `/api/calculos/totales` (el otro endpoint del mismo router) no se tocó. Verificado con el
   schema OpenAPI real: la ruta ya no existe.

Commit `da7fcbd`, subido y desplegado a producción (backend + web) a mano.

## ✅ Hecho (2026-09-10, continuación) — Rediseño de 3.B: "Centro del Agente" → la Bóveda

El fundador probó en el navegador la primera versión de 3.B (entrada de abajo) y pidió un
rediseño grande: **la página `/centro-agente` desaparece por completo** — ni pantalla, ni botón
"Deshacer", ni el "modo BI" agregado con CSV (que resultó ser una confusión de nombres: el
fundador se refería al Modo BI Senior real del diseño original del producto — Cost usando un
modelo más potente para analizar el negocio, exclusivo de admin — un ciclo futuro aparte, todavía
sin construir). La bitácora (misma tabla `agente_historial_acciones`, sin cambios de esquema) pasa
a ser **"la Bóveda"**: memoria interna que Cost consulta bajo demanda en la conversación (nunca
inyectada en cada mensaje, para no encarecer cada llamada a la API), con 2 tools nuevas
(`agente_bitacora_consultar`, `agente_bitacora_deshacer` — esta última reemplaza el botón HTTP
directo por una propuesta de dos fases, reusando el mecanismo de confirmación ya existente, más
estricto que antes). Retención automática por plan (`empresas.plan_codigo`): Starter 1 día, Pro 30,
Enterprise 90, aplicada en la propia consulta (Cost nunca usa datos vencidos) más un barrido físico
diario (`backend/routers/agente_cron.py`, mismo patrón que `proyectos_cron.py` — **pendiente real:
falta enganchar el disparador automático**, igual que el cron de proyectos). Plan auditado por un
Security Engineer independiente antes de ejecutar (APRUEBA CON CAMBIOS, 5 correcciones
incorporadas). Verificado en vivo: "¿qué cambiaste en los últimos días?" y "deshaz el cambio de
Parámetros que sigue activo" funcionando de punta a punta, con tarjeta de confirmación legible.
Commit `9e6913d`, subido y desplegado a producción (backend + web).

Detalle técnico completo en memoria persistente: `project_costo360_objetivo5_ciclo3.md` (ya
actualizada con el diseño final — la entrada de abajo describe la PRIMERA versión, descartada).

## ✅ Hecho (2026-09-10) — Objetivo 5, Ciclo 3 COMPLETO: chat flotante global + "Centro del Agente"

Cierra el Ciclo 3 del Objetivo 5 (las dos superficies de UI pendientes), en dos mitades dentro de
la misma sesión, por decisión explícita del fundador ("atacamos primero este ciclo con un '/goal'").

**3.A — chat flotante global (commit `7076807`):** `CostFloating.tsx` reemplaza al asistente
legado de Parámetros (`AgenteChat.tsx`, sin tool-calling, borrado) — desde ahora la burbuja
flotante en TODA la app es el mismo Cost de verdad. Conversación compartida vía `useCostStore`
(zustand a nivel de módulo) entre el widget flotante y la página dedicada `/agente`: cerrar el
panel y abrir la página (o viceversa) nunca pierde el hilo. Invariante de seguridad verificada:
minimizar el panel NUNCA confirma ni cancela una propuesta pendiente por su cuenta. Lógica de
formato de tarjetas extraída a `web/src/lib/agenteFormato.ts` para que ambas superficies rindan
igual. Verificado en vivo: el widget = Cost real (no el legado), conversación persistida al
navegar entre superficies.

**3.B — bitácora, deshacer y modo BI (commit `eb46792`):** migración `0010_agente_historial_acciones`
— tabla que registra CADA acción que Cost EJECUTÓ de verdad, sin importar si llegó por
`confirmar_propuesta` (dos fases) o por uno de los 3 handlers de escritura directa preexistentes
(`proyectos_crear_tarea`, la rama de alta de `catalogo_crear_material`, la rama no-Aprobada de
`cotizacion_cambiar_estado`) — siempre en la MISMA transacción que la escritura real.

**Deshacer** solo para las 6 tools que EDITAN un campo ya existente (nunca altas ni borrados):
`parametros_tarifa_editar`, `parametros_adicional_editar`, `catalogo_editar_material`,
`inventario_editar_lamina`, `retales_editar`, `cotizacion_cambiar_estado`→Aprobada. Cada una con
un `handler_deshacer` dedicado que reaplica el valor "antes" vía la MISMA función de servicio que
usó la confirmación original (nunca una reconstrucción a mano) — `UPDATE ... WHERE deshecha_en IS
NULL RETURNING` atómico, mismo patrón anti-doble-clic que `confirmar_propuesta`.

**Nueva página `/centro-agente`:** bitácora propia (RLS aísla por `usuario_id`, ni admin/gerencia
ve la de otro) + modo BI agregado, gated por el permiso `puede_pedir_datos_agregados_agente` que
ya existía sin usar desde la migración 0001 — nunca se creó un permiso nuevo. El modo BI nunca
expone una fila individual: agrupa por usuario y omite cualquier grupo bajo un umbral de
k-anonimato (5 filas), con exportación CSV del mismo agregado.

**Bug real encontrado y corregido en la verificación en vivo** (no lo vio ninguna auditoría de
plan ni de código estático): varios `handler_confirmar` ya existentes (`_confirmar_editar_material`,
`_confirmar_editar_lamina`, `_confirmar_editar_retal`, `_confirmar_adicional_editar`) hacen
`payload.pop(...)` antes de llamar al service — como `confirmar_propuesta` reutilizaba el MISMO
diccionario para escribir la bitácora después, esta guardaba un payload mutilado y
`handler_deshacer` reventaba con `KeyError`. Corregido pasando una copia (`dict(payload)`) a
`handler_confirmar`, dejando el original intacto para la bitácora.

**Precisión numérica en Parámetros** (dominio de mayor riesgo financiero): el valor "antes" de una
tarifa se guarda en un campo interno oculto (`_valor_raw_antes`, sin el redondeo de 1 decimal que
sufre `valor_pct`/`valor_cop` al mostrarse) para que deshacer reponga el valor EXACTO, nunca una
aproximación.

**Verificado en vivo de punta a punta** contra el taller demo real (`Ana (Dueña)`, backend/frontend
levantados localmente): edición de un adicional (Cost, propuesta, confirmación) → aparece en la
bitácora con antes/después correctos → modo BI agregado y k-anonimato funcionando (`+1 usuario(s)
con menos de 5 acciones... no se muestran por separado`) → clic en "Deshacer" → valor EXACTO
restaurado (verificado leyendo `/parametros` directamente, no solo la respuesta del agente) → una
segunda edición sobre la misma fila, deshecha independientemente, revierte solo esa acción puntual
(no la cadena completa) → creación de una tarea de Proyectos (escritura directa) aparece en la
bitácora SIN botón de deshacer, como se espera.

**Hallazgo operativo real, no de código — el proyecto de Vercel no tenía conectado GitHub:**
al hacer `git push` de ambos commits, ningún despliegue se disparó solo. `vercel project inspect`
confirmó que ninguno de los 3 proyectos (`costo360-backend`, `costo360-web`, `costo360-landing`)
tiene una sección "Git" — es decir, **nunca hubo integración real de auto-deploy**, a pesar de que
sesiones anteriores lo dieron por hecho. Desplegado manualmente vía `vercel deploy --prod --token`
(mismo patrón ya usado en sesiones previas) — ambos quedaron `READY` y con sus alias de producción
(`costo360-backend.vercel.app`, `costo360-web.vercel.app`) actualizados. **Pendiente real: conectar
de verdad el repositorio de GitHub en la configuración de cada proyecto de Vercel, o seguir
desplegando a mano después de cada push** — ver memoria `feedback_vercel_sin_autodeploy`.

**Commits `7076807` y `eb46792` subidos a `master` en GitHub.** Migración `0010` ya aplicada
directamente al proyecto real de Supabase (`hrmpyhixhbnkkpvxtuit`) vía el MCP de Supabase.

**🎉 Objetivo 5 completo: los 3 ciclos (motor + los 6 dominios + las dos superficies de UI) — el
Agente Cost queda con su alcance funcional pleno.** Siguiente, por instrucción explícita del
fundador: un segundo ciclo combinado (recarga desde cero de Proyectos/Tareas + limpieza del código
muerto de `calcular_merma`); Objetivos 3/4 (agentes de operación de la empresa) quedan
explícitamente en espera.

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

*(vacío por ahora)*

---

## 📋 Siguiente

### Fase 1 + 2.A (fundamento técnico) — ✅ hecho salvo la prueba en vivo
1. ✅ **Aislamiento multi-tenant** — esquema con `empresa_id` en todas las tablas (2026-08-26),
   y en la Fase 2.A: RLS que protege de verdad al backend (`db_rls`), `usuarios.rol` →
   catálogo cerrado `roles_catalogo` (admin/gerencia/operativo) con capacidades.
2. ✅ **Motor único de roles/permisos** (mismo para Starter/Pro/Enterprise, cambia el cupo —
   trigger `trg_usuarios_cupo_check`) y **sesión única con aviso/control real** (Regla 5,
   `routers/session.py` + `SessionGuard.tsx`).
3. ⬜ Integrar CopilotKit/AG-UI para que Cost accione la interfaz directamente (navegar,
   abrir diálogos, resaltar campos) — hoy Cost opera datos por chat pero nunca "maneja" la
   pantalla por el usuario. **Objetivo 5 del roadmap, depende del rediseño visual (Fase 2.A)**.
4. ⬜ Verificar que Cost, en su dominio de Parámetros, nunca entregue una cotización incompleta
   en silencio (regla 8) — redactado originalmente como "Agente de Parámetros", nombre del
   asistente legado y separado que existía ANTES de que Cost se unificara en el Ciclo 3 (ver
   `AgenteChat.tsx`, borrado); hoy es 100% Cost. Pendiente, va con el Objetivo 5.
5. ⬜ Generación automática de cliente TypeScript desde el schema OpenAPI de FastAPI — nota:
   hoy `web/src/api/*.ts` están alineados a mano con el backend nuevo.

### Frente activo ahora mismo (actualizado 2026-09-10)
- **El Objetivo 5 (los 3 ciclos) y el ciclo combinado que le seguía quedan cerrados** — ver
  entradas de "Hecho" arriba. Objetivos 3/4 (agentes de operación de la empresa) siguen
  explícitamente en espera ("Esperemos por ahora") hasta que el fundador decida retomarlos.
- **Vercel sin auto-deploy real de GitHub** (descubierto 2026-09-10) — cada push a `master`
  necesita un `vercel deploy --prod --token` manual hasta que se conecte de verdad el repo en la
  configuración de cada proyecto. Ver memoria `feedback_vercel_sin_autodeploy`.
- **El fundador confirmó en vivo (2026-09-15) que el arrastre real con mouse del tablero Kanban
  de Proyectos funciona bien** — cierra el único pendiente que quedaba abierto de la ronda de
  bugs del 2026-09-03.
- **El fundador pidió no tocar el asa de arrastre pequeña de las tarjetas del tablero
  Kanban** (2026-09-04) — es un arreglo deliberado de accesibilidad ya auditado; si en el futuro
  se quiere una zona de agarre más grande, hay que diseñarlo con cuidado de no reabrir el
  hallazgo WCAG 4.1.2 del 2026-09-02.
- **Bug preexistente no bloqueante, pendiente como tarea aparte:** `catalogo_service.editar_material`
  ignora `proveedor`/`activo` en la rama copy-on-write sobre una fila base sin sombrear.
  (El de `calcular_merma` se cerró eliminando el código muerto, ver entrada de "Hecho" arriba.)

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

*Última actualización: 2026-09-13*
