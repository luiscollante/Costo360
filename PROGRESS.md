# PROGRESS.md — Estado del Proyecto Costo360

---

## ✅ Hecho (2026-09-23/24) — Piezas en celular, alertas de consumo de IA sin bloqueo, logo en correos, Centro de Control en línea con 2FA

- **Nueva cotización → Piezas en celular** (`7921ebd`): en pantallas < md cada pieza es una tarjeta (Largo/Ancho/Cant. legibles, sin scroll lateral); la canasta pide confirmación (`Dialog` alertdialog). Verificado en vivo a 390 px y en escritorio; el fundador confirmó "Eliminar".
- **Ciclo /goal completo — cuotas de IA sin bloqueo + alertas al fundador** (`9ecceef`…`1b374ba`): nadie se bloquea al pasar su cupo (Cost/Gemini, voz/ElevenLabs, render/OpenAI; se mantiene 3 renders por cotización). Nuevo `backend/services/alertas_service.py`: avisos Telegram (@Costo360_bot) + correo (atencion@costo360.com, collante110@gmail.com) al 70/80/100/150/200%, deduplicados por mes en `alerta_consumo_enviada` (migración `0015`, aplicada a producción), enviados DESPUÉS del commit con timeout 3 s. Cron diario `/api/consumo/cron/revision` (+ saldo real de ElevenLabs). Voz por USUARIO en "mensajes de voz" (5/10/15 provisional), pregunta ≤30 s con contador, respuesta de Cost nunca se corta (topes de texto subidos a 8.000/16.000). Mes contado en hora Colombia. `GET /api/admin/consumo` (token) + pestaña "Consumo de IA" en el Centro de Control. Prueba real: el fundador recibió 1 Telegram + 1 correo por dirección, sin repetición.
- **Vercel (cuenta Costo360):** cargadas `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ADMIN_API_TOKEN` (rotada después) y `OPENAI_API_KEY` (faltaba en producción: el render no funcionaba publicado). El MCP de Vercel quedó autenticado con wasesitowaginal@gmail.com (usar sin `teamId`).
- **Logo en todos los correos** (`b549c36`): incrustado como imagen en línea (`cid:`), recortado sin margen, 200 px (`backend/static/email_logo.png`).
- **Centro de Control en internet** (ciclo /goal, `52f71f9`…`1800f73`): https://costo360-centro-control.vercel.app — proyecto Vercel `costo360-centro-control` + Supabase SEPARADO `costo360-operaciones` (rol `crm_app` mínimo privilegio, RLS, advisor limpio). `CRM_MODE=local|online`: en línea 2FA TOTP obligatorio (Microsoft Authenticator, secreto AES-GCM, anti-reuso, 10 códigos de recuperación; alta SOLO por consola `python -m crm.manage totp`), bloqueo 5 fallos/30 min en BD, código errado cuenta para el bloqueo y 3 errados descartan la sesión, cookie `__Host-` Secure, inactividad 30 min / 12 h, rotación de token, CSRF+Origin+Sec-Fetch-Site, CSP/HSTS, docs apagados, interruptor `CRM_ONLINE_DISABLED`, cron keep-alive, avisos Telegram. Modo local intacto. 56 pruebas. Auditoría final limpia. El fundador entró desde el celular y recibió el aviso. Ícono "Centro de Control Costo360" en el escritorio.

## 🔄 En progreso
- Nada a medio camino.

## 📋 Siguiente
1. Calibrar con uso real los créditos por "mensaje de voz" (hoy 1.000 provisional) antes de anunciar números de voz en la landing; cuando haya presupuesto, ElevenLabs Starter (30.000 créditos).
2. Opcional: activar el agente de IA del Centro de Control en línea (`CRM_GEMINI_API_KEY`/`CRM_GEMINI_MODEL` + límite diario).
3. Respaldo semanal de `costo360-operaciones` (pendiente del plan, prioridad baja: hoy vacío).
4. Documentar el ciclo de pagos Wompi (2026-09-17→22) si el fundador lo pide.

---

## ✅ Hecho (2026-09-22/23) — Jerarquía visual en 3 módulos + 5 bugs de Express/AIU + landing desplegada

- **Rediseño de jerarquía visual** (aprobado por el fundador, con "revierte" como red de seguridad que no se usó): Nueva Cotización (Step2Piezas), Nesting y Cotización AIU (Step0) pasaron de tarjetas por fila a `DataTable` compacta + panel lateral fijo (`sticky`). Express se dejó igual (ya estaba empaquetada). Bug encontrado en dos páginas: el contenedor externo `max-w-4xl` recortaba el layout ancho interno → subido a `max-w-6xl`.
- **Express:** etiqueta "Ancho · def." → "Ancho (por defecto X m)"; el margen ahora muestra % **y** monto en pesos (`MarginLight` recibe `result.utilidad`); campos de Lámina con mini-etiquetas "Largo"/"Ancho".
- **Cotización AIU:** (1) el wizard ya no pierde los datos al cambiar de sección — nuevo store `web/src/store/aiuWizard.ts` (Zustand + localStorage, clave `costo360-aiu-wizard-v1`) + botón "Nueva cotización AIU" para reiniciar a propósito; (2) el campo "Otro" de A/I/U acepta coma decimal (`1,5` → `1.5`), igual que `MonoInput`; (3) "Siguiente"/"Calcular" visible sin scroll en pantallas de ~710px de alto (spacing compacto + botón dentro del panel lateral fijo).
- **Backend:** `_TOPES_GEMINI_COP_DEFAULT["starter"]` = 20.000 (antes 0) para que "Cost incluido desde Starter" sea verdad (decisión del fundador 2026-09-22).
- **Landing (costo360.com):** rediseño de tarjetas de planes (commit `a015f13`) y pulido de interacción hecho por otra IA (recorrido con scroll, ejemplos ilustrativos de Cost, nav con sección activa; commit `f22e29b`, doc en `docs/LANDING_INTERACCIONES.md`). Ambos ya en producción vía auto-deploy de GitHub.
- **Web (costo360-web):** commit `6a68be0` desplegado con `vercel deploy --prod` desde `web/` y verificado contra el bundle real.

## 🔄 En progreso
- Nada a medio camino.

## 📋 Siguiente
1. Pendiente de aviso del fundador: ¿borrar el proyecto Vercel sobrante `landing` (equipo `marmoles-collante-y-castro`, creado por error)?
2. Revisar el tope de voz por defecto de Pro (~30 s/mes, ver sesión 2026-09-16).
3. `PROGRESS.md`/`SESSION.md` no registran el ciclo de pagos Wompi (commits `74a933a`…`1b669fa`, 2026-09-17→22); documentarlo si el fundador lo pide.

---

## ✅ Hecho (2026-09-16, mismo día) — Desglose de costos profesional (Excel) + cuotas mensuales de consumo por empresa (Gemini/ElevenLabs)

Tras cerrar el ciclo del render de cocina con IA, el fundador pidió dos cosas más el mismo día:
(1) un desglose de costos profesional de Costo360 S.A.S. en Excel, con identidad de marca, pensando
la empresa ya en operación; y (2) un ciclo real para parametrizar cuánto puede consumir cada
taller/empresa por mes de las APIs de IA (mencionó específicamente Gemini y ElevenLabs), para que
Costo360 nunca tenga una sorpresa de gasto a fin de mes.

**Parte 1 — Excel de costos (`docs/Costo360_Desglose_Costos_Profesional.xlsx`, 11 hojas).**
Regla de oro explícita del fundador para esta parte: solo lectura de archivos existentes, cero
edición de código — el entregable es un archivo nuevo. Se leyó `docs/PLAN_COSTOS_COMPLETO_COSTO360.md`
(fuente oficial) y se verificaron a mano con Python todos los números antes de construir nada. Se
delegó la construcción real del `.xlsx` (openpyxl, identidad de marca real — esmeralda/dorado/logo,
fórmulas enlazadas entre hojas, cero texto corrupto) a un agente Document Generator, verificado de
forma independiente por esta sesión en cada entrega (nunca se confió solo en el reporte del agente).
Estructura: Portada, Resumen Ejecutivo, Costos Directos (COGS), Precios Unitarios y Cantidades,
Costos Indirectos (OpEx), Impuestos y Tasas (RST/IVA/GMF), Reservas de Contingencia, Estado de
Resultados, Actualización Operativa Sept-2026 (impacto real de los 2 productos nuevos — render de
cocina y voz — que el modelo oficial de agosto no incluía), Simulación de Consumo Exagerado por API
(empresa grande, pedida por el fundador en un mensaje aparte), y un Glosario de 21 términos en
lenguaje simple (pedido también aparte). **Hallazgo real de esta parte**: se detectó y se le
encontró útil al fundador durante las pruebas del ciclo 2 (ver abajo) que Cost usa Gemini 3.5 Flash
directamente, no el stack "Claude Sonnet 5 + Fable + Gemini orquestador" que asume ese documento
oficial — el costo real es ~7,5x más barato de lo presupuestado ahí.

**Parte 2 — Cuotas mensuales de consumo por empresa (ciclo formal con `/goal`, planificado con
`EnterPlanMode` antes de tocar código).** Investigación primero: se confirmó que hoy NO existe
ningún control de consumo mensual real para Gemini (`backend/agente/runtime.py`) ni ElevenLabs
(`backend/routers/voz.py`) — solo un limitador de velocidad por IP (`@limiter.limit`), que además
comparte balde entre los 10 usuarios de una misma empresa grande si están detrás de la misma IP de
oficina, y que en el caso de ElevenLabs es una cuenta compartida entre TODOS los clientes de
Costo360 (10.000 créditos/mes hoy).

Decisiones tomadas con el fundador antes de programar: medición con tokens/segundos REALES (nunca
un conteo aproximado), bloqueo duro por función (no de toda la app) al superar el tope, con aviso
temprano al 80% y un colchón de gracia del 20% (bloqueo real al 120%, no al 100% exacto, para no
cortar a alguien a mitad de una tarea), y visibilidad para el propio taller en lenguaje simple
("te quedan aproximadamente X interacciones/minutos este mes").

**Construido:** migración `0012_consumo_api.sql` (tabla única `consumo_api`, generalizada para
cualquier API medible — la "estandarización" pedida, en vez de una tabla por API — aplicada a
producción con confirmación explícita), `backend/services/consumo_service.py` (tarifas reales de
Gemini 3.5 Flash en un solo lugar, topes por defecto por plan editables sin redeploy vía
`app_config`), enganchado en `runtime.py` (chequeo antes del loop de pasos, registro real de
`usage_metadata` tras cada llamada) y `voz.py` (chequeo + estimación de segundos de audio), más
`GET /api/consumo/resumen` nuevo.

**Verificado en vivo de punta a punta, con la app real** (con una interrupción manejada con
cuidado: se encontró la sesión del fundador activa en su celular a mitad de la prueba y se canceló
de inmediato en vez de forzar el reclamo de sesión, hasta que él mismo confirmó que podía seguir):
una conversación real con Cost quedó registrada con tokens/costo reales; bajar el tope a mano
bloqueó a Cost con el mensaje humano exacto sin afectar el resto de la app; restaurar el tope lo
volvió a dejar funcionando normal de inmediato (incluida una tool-call real); `GET
/api/consumo/resumen` devolvió el resumen esperado. **Hallazgo real a revisar**: el tope por
defecto de voz para Pro (500 créditos) da apenas ~30 segundos reales de voz al mes — deliberadamente
conservador para proteger el pool compartido de ElevenLabs, pero casi inútil en la práctica; queda
documentado para que el fundador lo suba cuando lo necesite (es un valor de `app_config`, no
requiere redeploy).

Commiteado a git local (sin pushear/desplegar todavía — pendiente decisión del fundador).

---

## ✅ Hecho (2026-09-16, mismo día) — Objetivo nuevo: Render de cocina con IA (OpenAI) + 4 mejoras del fundador

El fundador pidió planificar (con 4 agentes especializados en paralelo: AI Engineer, Prompt Engineer,
Backend Architect, Product Manager) cómo integrar la API de OpenAI para que los asesores de un taller
generen un render fotorrealista de la cocina del cliente con el material real que está cotizando —
"no con un material que no se parece en nada al material en la vida real". Tras el plan, pidió
implementarlo directamente ("vamos a implementarlo y en la 'marcha' vemos que corregimos y agregamos").

**Diseño central del plan** (por qué no es solo "llamar a la API de imágenes"): sin una foto real de la
lámina, ningún modelo sabe cómo se ve una piedra puntual de un proveedor regional — así que el servicio
SIEMPRE prioriza anclar la generación en una foto real de referencia del material (`/v1/images/edits`)
sobre generar solo por texto. Modelo usado: `gpt-image-2.5-sunburst` (confirmado real, familia "ChatGPT
Imágenes 2.5", lanzado 2026-09-08).

**Construido de cero:**
- Migración `0011_render_cocina.sql` — tabla `render_cocina` (RLS real) + 3 buckets privados de Supabase
  Storage (`render-material-referencias`, `render-cliente-fotos`, `render-generados`), todos con URLs
  firmadas de corta duración, nunca públicas. **Aplicada a la base de datos real de producción** con
  confirmación explícita del fundador, verificada con `get_advisors` (sin alertas nuevas) y `list_tables`.
- `catalogo_materiales` gana atributos visuales de enum cerrado (color, veta, densidad/patrón de
  veteado, acabado, tono) + foto de referencia con aprobación humana separada — mismo patrón
  copy-on-write que el resto del catálogo (`backend/services/catalogo_service.py`).
- `backend/services/render_service.py` — construcción determinística del prompt (mismo enum → siempre
  la misma frase), tope mensual configurable por empresa, tope de 3 renders por cotización, límite de
  10/hora por IP, y defensa de inyección en la nota libre del asesor (mismo criterio que el system
  prompt de Cost: el texto de negocio es dato, nunca instrucción).
- `backend/services/storage_service.py` — acceso a Supabase Storage vía REST + service-role key
  (mismo patrón "el backend es la única frontera de confianza" del resto del proyecto).
- Frontend: `RenderCocinaDialog.tsx` (nuevo, botón de destellos en Historial) + 4 endpoints nuevos de
  atributos/foto de material integrados en `MaterialesPage.tsx`.

**Verificado en vivo, incluida la primera llamada real y pagada a OpenAI:** con la clave real que el
fundador configuró él mismo en `backend/.env` (yo preparé la línea vacía y las instrucciones paso a
paso para alguien no programador — nunca vi ni escribí el valor de la clave), se generó un render real
de cocina con el material AMAZONAS (granito) — `201 Created`, imagen fotorrealista correcta, mostrada
en el Historial con el aviso "Simulación referencial". Antes de tener la clave se confirmó también el
camino de error controlado (`503`, sin clave configurada).

**4 mejoras pedidas por el fundador el mismo día, ya implementadas:**
1. **Regla dura: nunca se genera un render sin una foto de referencia aprobada del material** —
   bloqueo real en el backend (422) además del frontend; antes esto era opcional (Ruta A degradada por
   texto solo). Confirmado en vivo: sin foto, el botón queda deshabilitado con el aviso "Falta la foto
   de referencia aprobada."
2. **Selección de material en 2 pasos** — "Tipo de material" (categoría) y "Referencia" (nombre,
   filtrado por tipo) en vez de un único `<select>` gigante con 200+ opciones mezcladas. Confirmado en
   vivo: elegir "Granito" habilita "Referencia" ya filtrada.
3. **Subir la foto de referencia + confirmación "bonita" para guardarla en el catálogo**, todo dentro
   del mismo diálogo — no hace falta salir a Catálogo. Al subir aparece una tarjeta con la vista previa
   y "¿Guardar esta foto en el catálogo para usarla en este y en futuros renders de [REFERENCIA]?" con
   "Sí, usar esta foto" / "Subir otra". Confirmado en vivo (con una foto de muestra genérica, usando
   deliberadamente "Subir otra" al final para no dejar guardada una foto incorrecta como si fuera la
   lámina real de AMAZONAS en el catálogo de producción).
4. **Comparación antes/después + mejor estado de carga** — implementadas en código (el "antes" es la
   foto que el asesor sube, guardada solo en el navegador vía `URL.createObjectURL`, nunca reenviada al
   backend por privacidad del cliente; el estado de carga pasa de un spinner chico a un panel con
   mensajes rotativos y barra de progreso animada). **No verificadas en vivo con una generación real**
   (cada llamada cuesta dinero real) — quedan como próxima verificación pendiente.

**Preguntas del fundador respondidas, sin acción tomada:** (1) Cost (el agente) NO tiene ninguna tool
conectada a este feature — el render de cocina es un flujo aparte, integrado solo en Historial; (2) sí
sería capaz de construir infraestructura completa en AWS/Azure como arquitecto de nube si se dan
credenciales acotadas, pero nunca de una sola pasada (plan + costo estimado + confirmación antes de
crear cada recurso), y no reemplaza guardia 24/7 real — sirve para cuando el fundador decida escalar,
no una decisión tomada en esta sesión.

**Sin comitear:** ningún archivo de este objetivo (backend ni frontend) se subió a git todavía — pendiente
la decisión del fundador.

---

## ✅ Hecho (2026-09-16, mismo día) — Corrección de voseo + 6 mejoras de diseño en Parámetros

El fundador revisó el rediseño de Parámetros (pidió una revisión de diseño sin tocar nada) y encontró
dos cosas más al mismo tiempo: (1) el modal de agregar costo tenía texto en voseo argentino ("le pagás
a un oficial", "Elegí qué tipo de costo…") pese a ser una regla ya definida del proyecto — y peor,
también noté que yo mismo le estaba hablando en voseo en el chat, algo que el fundador marcó como falta
de respeto; y (2) pidió implementar en un solo ciclo las 6 oportunidades de mejora encontradas en esa
revisión de diseño.

**Voseo corregido**: las 2 strings reales en `ParametrosPage.tsx` ("le pagás" → "le pagas", "Elegí" →
"Elige") — verificado con grep que no queda ninguna otra. Se guardó una memoria de feedback nueva
(`feedback_nunca_voseo.md`) porque esta regla ya se había corregido una vez antes (en las respuestas de
Cost) y volvió a aparecer dos veces — código y mi propio chat.

**Las 6 mejoras, todas implementadas y verificadas en vivo:**
1. **Montos con separador de miles** — nuevo componente `MoneyInput` ("60.000" en vez de "60000"),
   usado en Tarifas y en las 4 columnas de precio de Adicionales. Selecciona todo el texto al enfocar
   (reemplaza entero al escribir encima, nunca se mezcla con lo anterior) y reformatea al salir del
   campo.
2. **Textos truncados en Adicionales corregidos** — tabla con `table-fixed` y columnas reproporcionadas
   (Concepto 36%, Unidad 8%); nombres largos como "Fregadero instalación bajo cubierta" ahora se ven
   completos, igual que la unidad ("und" en vez de solo "u").
3. **El modal para agregar un costo ahora tiene una "X" para cerrar** — se agregó al componente
   `Dialog` compartido de toda la app (no solo a esta pantalla), con cuidado de no robarle el foco
   automático a los campos reales del diálogo (el botón queda último en el orden del DOM aunque se vea
   arriba a la derecha).
4. **Borrar un costo ahora pide confirmación** — un `Dialog` tipo `alertdialog` (mismo patrón que ya
   usa el resto de la app) antes de quitar una fila, tanto en Tarifas como en Adicionales, aclarando
   que no es permanente hasta guardar.
5. **La lista de costos ya guardados ahora se agrupa igual que el modal de agregar** — mismas 4
   categorías (Mano de obra, Insumo, Sobre el material, Costo fijo), mismos íconos — ya no hay
   inconsistencia entre cómo se agrega algo y cómo se ve después.
6. **Aviso de "cambios sin guardar"** — un punto dorado + texto junto a "Guardar cambios" cuando hay
   algo pendiente; se activa a través de un solo wrapper (`actualizarData`) que reemplaza todas las
   mutaciones locales, así ninguna edición futura se olvida de marcarlo.

Durante la verificación en vivo se encontró y corrigió un bug real: el primer diseño de `MoneyInput`
dependía de `requestAnimationFrame` para seleccionar el texto al enfocar, y a veces el clic dejaba el
cursor sin seleccionar nada — escribir encima insertaba en vez de reemplazar (ej. "60000" + "75000" =
"7500060000"). Se rediseñó para seleccionar de forma síncrona en el propio evento de foco, sin
depender de ningún timing de animación — más simple y sin la condición de carrera.

Build real sin errores. Commiteado, pusheado y desplegado a producción (solo frontend).

---

## ✅ Hecho (2026-09-16, mismo día) — Rediseño del selector de inductores en Parámetros › Tarifas

El fundador probó su propia pantalla de Parámetros y no entendió qué hacía el selector al final de la
pestaña Tarifas ("por metro lineal (mano de obra en bordes)" y otras 6 opciones) — un `<select>` nativo
con 7 frases de 6-8 palabras compitiendo por atención, sin agrupar. Pidió explícitamente un ciclo
formal (`/goal`) para rediseñarlo, intuitivo y visualmente pulido.

Antes de diseñar nada se leyó el motor de cálculo real (`backend/motor/calculos.py`) para tener las 7
definiciones exactas — confirmó 2 confusiones reales de fondo: hay DOS "por m²" (uno es mano de obra
por área, el otro es desgaste de disco/insumo — nada que ver entre sí) y DOS "por metro lineal" (borde
normal vs. zócalo, una pieza distinta de la cotización). Se consultó a un agente UI Designer con estas
7 definiciones exactas + el sistema de diseño real de la app (tokens, `Badge`/`InductorBadge` ya
existentes con sus 7 íconos) para un rediseño concreto, no solo inspiración.

**Implementado** en `web/src/pages/ParametrosPage.tsx`:
- El `<select>` + botón se reemplazó por un botón que abre un popover agrupado en 4 categorías por
  **qué representa el costo** (no por su unidad, que es justo lo que juntaba los pares confusos):
  Mano de obra, Insumo/desgaste de herramienta, Sobre el material de la pieza, Costo fijo del proyecto.
- Cada una de las 7 opciones lleva título corto + una descripción de una línea con un ejemplo real
  (tomado de la receta por defecto del motor) + el mismo ícono/badge que ya usa la fila una vez creada
  — mismo lenguaje visual, no uno nuevo en paralelo.
- Elegir una opción crea la fila al toque (sin segundo click de "Agregar"), con un flash breve
  (`bg-brand-success-soft`, 900ms) en la fila nueva para cerrar el loop de "elegí esto → esto apareció".
- Los `value` que llegan al backend (`por_ml`, `por_m2_mano_obra`, etc.) NO se tocaron — solo cambió el
  texto que ve el usuario, cero riesgo sobre el motor de cálculo real.
- Cierre con click-afuera, `Escape` (devuelve el foco al botón), o al elegir una opción.

Verificado en vivo: build real (`npm run build`) sin errores; popover abre con las 4 secciones,
íconos, descripciones y badges de vista previa correctos; seleccionar una opción agrega la fila con el
inductor correcto y cierra el menú (confirmado por estado real de React — `aria-expanded="false"` tras
elegir, más el conteo de filas subiendo de 8 a 9 con el badge esperado). El cierre visual del panel no
se pudo confirmar por la extensión de Chrome automatizada por la misma limitación de `document.hidden`
que afectó a la esfera de Cost — la animación de salida usa `requestAnimationFrame`, que el navegador
pausa en pestañas en segundo plano; la lógica de React cierra bien, falta que el fundador lo confirme
visualmente en su navegador real.

Commiteado, pusheado y desplegado a producción (solo frontend), verificado con `curl` 200.

**Ajuste post-despliegue el mismo día**: el fundador pidió 3 cambios sobre este mismo selector — que el
popover fuera un modal centrado en pantalla, que el botón "Agregar costo" tuviera fondo sólido (no pasar
desapercibido), y que "Guardar cambios" se moviera del header al final de la página, a la misma altura
que "Agregar costo"/"Agregar servicio adicional". Se reemplazó el popover por el `<Dialog>` real ya
existente en la app (foco atrapado, Escape, click afuera, todo ya resuelto — y de paso destrabó el
problema de cierre-visual-nunca-confirmado, porque `Dialog` no depende de `requestAnimationFrame` como
sí dependía `AnimatePresence`/framer-motion del popover). Ambos botones de agregar pasan a
`Button variant="primary"` (sólido), y "Guardar cambios" se pasa como prop a las dos pestañas
(Tarifas/Adicionales) en vez de vivir solo en el `PageHeader`. Se encontró y corrigió un error real
(`triggerRef` sin definir, resto de una limpieza incompleta) antes de dar el cambio por terminado.
Verificado en vivo: modal centrado con fondo oscurecido, cierra con click afuera y al elegir una opción
(fila se agrega bien), ambos botones sólidos alineados correctamente en las dos pestañas. Commiteado,
pusheado y desplegado a producción (solo frontend), verificado con `curl` 200.

---

## ✅ Hecho (2026-09-16, mismo día) — Entrenamiento de pronunciación de la voz de Cost

El fundador reportó 3 problemas reales escuchando a Cost: tarda 6-7 segundos en empezar a hablar tras
un mensaje de voz, habla demasiado rápido en respuestas largas, y pronuncia mal términos del dominio
("m²" → "m dos", "$1.339.000" → "mil trescientos treinta y nueve" — perdiendo la magnitud real del
monto). Pidió explícitamente un ciclo formal con ayuda de agentes especializados para un
"entrenamiento riguroso y exhaustivo", no un parche rápido.

**Auditoría** (agente Voice AI Integration Engineer, recorrido completo de las 8 tools de dominio +
el system prompt): además de los 3 casos que ya había encontrado el fundador, aparecieron `ml`
(metros lineales), `cm`, los códigos cortos de unidad de Parámetros (`und`, `glb`), `%`, timestamps
ISO completos que la Bóveda le devuelve al modelo, IDs/UUIDs que el system prompt le pide usar
"exactos" al deshacer algo, y markdown crudo (negritas, listas) que nunca se limpiaba antes de
mandarlo a ElevenLabs.

**Implementado** en `backend/services/voz_service.py` (nuevo) — función `normalizar_para_voz` en 4
etapas (markdown → texto hablable, redacción de IDs/fechas, unidades y moneda del dominio, limpieza
final), aplicada en `backend/routers/voz.py` antes de mandar el texto a ElevenLabs:
- Montos en pesos colombianos se deletrean completos en palabras (`cop_a_letras` — conversor de
  números a español escrito desde cero, con las reglas reales de apócope "un"/"veintiún" y "de" antes
  de "pesos" solo cuando corresponde) — decisión deliberada en vez de reformatear separadores, porque
  el bug real demostró que ElevenLabs no resuelve de forma confiable un monto con más de un punto de
  miles.
- m²/m2, ml, cm, %, und, glb expandidos a su forma hablada; "/m²" → "por metro cuadrado"; "COP"
  pegado a un monto ya convertido se descarta (ruido, "pesos" ya dice la moneda).
- Markdown (negritas, listas numeradas/viñetas, backticks, enlaces) limpiado con pausas reales entre
  ítems; guiones usados como separador ("Nombre – $precio") pasan a coma.
- UUIDs redactados por completo, timestamps ISO convertidos a fecha hablada — más un ajuste de una
  línea en el system prompt (`runtime.py`) para que Cost no vuelva a citar un id técnico en su
  respuesta al usuario (la regex es una red de seguridad, no el arreglo real).
- `model_id` de ElevenLabs cambiado de `eleven_multilingual_v2` a `eleven_flash_v2_5` (el que
  ElevenLabs recomienda para conversación en vivo, notablemente más rápido) y se agregó
  `voice_settings` (`speed: 0.92`, más los demás parámetros recomendados) — antes no se mandaba
  ningún ajuste de ritmo, ElevenLabs usaba el default de la voz.

Verificado: 12 casos de conversión de moneda contra los 5 montos reales del ejemplo del fundador (todos
exactos, incluida la regla de apócope en "$901.000" → "novecientos un mil pesos"); la función completa
probada contra el texto real que generó Cost en vivo (con negritas, lista numerada, guion separador y
sufijo "COP/m²" — un formato ligeramente distinto al ejemplo original del fundador, buena señal de que
generaliza) — resultado limpio y correcto. Endpoint `/api/voz/hablar` probado en vivo en el navegador
tras el cambio de modelo: 200 OK, audio se genera y reproduce.

**Honesto sobre la latencia**: los 6-7 segundos reportados no son solo TTS — incluyen transcripción del
audio + el turno completo del agente (razonamiento + tool-calls) antes de tener texto final. El cambio
de modelo reduce la porción de TTS del total, pero no se prometió (ni se puede confirmar desde acá) que
eso por sí solo baje los 6-7 segundos a algo instantáneo — falta que el fundador lo sienta en vivo.

Commiteado, pusheado y desplegado a producción (solo backend), verificado con `/healthz`.

**Ajuste post-despliegue**: el fundador escuchó "... pesos COP..." en vez de la moneda completa —
`cop_a_letras()` solo decía "pesos", dejando el "COP" que a veces escribe el modelo sonando suelto.
Ahora dice "pesos colombianos" directo, con 2 reglas nuevas para no duplicar "pesos"/"colombianos" si
el modelo ya los había escrito él mismo junto al monto. Reverificados los 10 montos de prueba + los
casos con "COP" pegado — todos limpios. Commiteado, pusheado y desplegado (solo backend), verificado.

---


*(Entradas anteriores en PROGRESS_ARCHIVO.md)*

*Última actualización: 2026-09-24*
