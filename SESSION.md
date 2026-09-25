# SESSION.md — Registro de Sesiones

---

## Sesión: 2026-09-23/24 — Piezas en celular, alertas de IA, logo en correos, Centro de Control en línea

### Qué se hizo
1. **Piezas (Nueva cotización) adaptado a celular** + confirmación al borrar una pieza. Publicado.
2. **Ciclo /goal de consumo de IA**: fin de todos los bloqueos por cupo (fase de medición); alertas en tiempo real por Telegram + correo al fundador (empresa, usuario de voz, cuentas globales); voz por usuario en "mensajes"; cron diario; pestaña "Consumo de IA" en el Centro de Control. Auditado 2 veces (plan y ejecución), prueba real recibida por el fundador.
3. **Claves en Vercel (cuenta Costo360)**: Telegram, token admin (rotado), OpenAI (faltaba en producción).
4. **Logo de Costo360 visible en todos los correos** (imagen incrustada).
5. **Centro de Control publicado en internet** con 2FA (Microsoft Authenticator) y base Supabase separada. El fundador creó su cuenta (atencion@costo360.com) por consola y entró desde el celular.

### Archivos creados
`backend/migrations/0015_alertas_consumo.sql`, `backend/services/alertas_service.py`, `backend/routers/consumo_cron.py`, `backend/tests/test_alertas_service.py`, `backend/static/email_logo.png`; `agentes-operacion/centro-control/{crm/security.py, crm/migrations/0001_init.sql, api/index.py, vercel.json, .vercelignore, tests/test_online.py, web/src/consumo.tsx, web/public/{manifest.webmanifest,icon-192.png,icon-512.png}, costo360.ico}`. Locales, fuera de git: `agentes-operacion/centro-control/{admin_token.txt, .env.online}`, acceso directo en el escritorio.

### Archivos modificados
`web/src/pages/CotizacionPage.tsx`, `web/src/components/CostChat.tsx`, `web/src/api/voz.ts`; `backend/services/{consumo_service,render_service,email_service}.py`, `backend/routers/voz.py`, `backend/models/voz.py`, `backend/agente/runtime.py`, `backend/main.py`, `backend/vercel.json`; Centro de Control `crm/{config,db,auth,main,manage,agent}.py`, `requirements.txt` (versiones fijas), `web/src/{main.tsx,style.css}`, `web/index.html`, `.gitignore`, `Iniciar Centro de Control.bat`.

### Decisiones tomadas
- Nunca bloquear por cupo durante la fase de medición; solo avisar al fundador (Telegram + correo).
- Cupo de voz por usuario; la respuesta de Cost nunca se corta.
- Proyecto `landing` sobrante en la cuenta familiar de Vercel: se deja sin tocar.
- Centro de Control en línea (opción B) con Supabase separado y TOTP de Microsoft Authenticator; alta del 2º factor solo por consola.

### Riesgos / pendientes detectados
- El fundador escribió una contraseña en el chat: se le pidió no usarla; la del Centro de Control es otra.
- PowerShell 5.1 (`Get-Content`/`Set-Content`) dañó tildes de `agent.py`; se restauró (patrón registrado).
- Cualquiera con el correo del fundador puede bloquearlo 30 min (inherente al bloqueo; hay aviso).
- Agente de IA del Centro de Control no configurado en línea.

### Primera tarea de la próxima sesión
Preguntar al fundador si activa el agente de IA del Centro de Control en línea o si retoma otro frente; recordar la calibración real de créditos por mensaje de voz antes de publicarlos en la landing.

---

## Sesión: 2026-09-22/23 — Jerarquía visual (Cotización/Nesting/AIU), bugs de Express y AIU, landing desplegada

### Qué se hizo
- **Rediseño de jerarquía visual** aprobado por el fundador ("si no me gusta te diré 'revierte'"; nunca lo dijo): tablas compactas + panel lateral `sticky` en `CotizacionPage` (Step2Piezas), `NestingPage` y `CotizacionAIUPage` (Step0). Se añadió prop `compact` a los inputs locales. Hallazgo: el wrapper externo `max-w-4xl` de `CotizacionPage` y `CotizacionAIUPage` anulaba el `max-w-6xl` interno → se subió el externo a `max-w-6xl`.
- **Feedback posterior del fundador**, todo corregido y verificado en vivo en el navegador:
  - Express: etiqueta "Ancho · def." confusa → "Ancho (por defecto X m)"; margen ahora `% · $monto`; mini-etiquetas "Largo"/"Ancho" sobre los dos campos de Lámina.
  - AIU: amnesia al cambiar de sección (el más grave) → `store/aiuWizard.ts` (Zustand persist) + botón "Nueva cotización AIU"; coma decimal en "Otro" (`type="text"` + `inputMode="decimal"`, normaliza a 1 decimal al salir del campo); "Siguiente" sin scroll (spacing compacto, botón dentro del panel sticky). Se probó primero un `sticky bottom-0` global y se descartó: se solapaba con el panel lateral sticky-top.
- **Backend:** tope Gemini por defecto de Starter 0 → 20.000 COP (`consumo_service.py`), porque la landing ya prometía Cost desde Starter.
- **Deploys:** landing (`a015f13`, luego `f22e29b` de otra IA) y web (`6a68be0`).

### Archivos modificados / creados
`web/src/pages/{CotizacionPage,NestingPage,CotizacionAIUPage,CotizacionExpressPage}.tsx`; nuevo `web/src/store/aiuWizard.ts`; `backend/services/consumo_service.py`; landing: `PricingSection.tsx`, `pricing.css`, `CostAssistant.tsx`, `Footer.tsx` y (otra IA) `ScrollyStory`, `BentoEcosystem`, `Navbar`, `ProductTour`, `Hero`, `App`, nuevos `CostPreview`, `ui/ModuleArt`, `ui/Tactile`, `experience.css`, `tests/experience.spec.ts`, `docs/LANDING_INTERACCIONES.md`.

### Decisiones tomadas
- Cost incluido en Starter (tope inicial 20.000 COP, editable vía `app_config` sin redeploy).
- Solo se comitea/deploya lo relacionado; se dejaron fuera los archivos sueltos (`CONTEXTO_COSTO360.md` con nota "pendiente técnico" ya obsoleta, imágenes sin usar en `web/public`, archivo vacío `web/src/pages/0)`, `_scratch/`, etc.).

### Riesgos / pendientes detectados
- **Dos cuentas de Vercel:** `costo360-landing` (costo360.com, equipo `wasesitowaginal-1630`) se despliega SOLO por auto-deploy de GitHub; `web` vive en `marmoles-collante-y-castro` y se despliega con la CLI local. `landing/` no tiene `.vercel/` a propósito: correr `vercel deploy` ahí crea un proyecto equivocado (pasó: quedó el proyecto vacío `landing`, pendiente de borrar si el fundador lo aprueba). La memoria vieja "Vercel sin auto-deploy" es falsa para la landing.
- No se corrió el suite de Playwright de la landing (el fundador interrumpió); sí `tsc` y `vite build` limpios.
- Lint previo sin tocar: `PreviewRow` definido dentro de `Step1AIU` (react-hooks/static-components).
- `landing/.gitignore` quedó modificado (+`.vercel`), sin commitear.
- Pendiente de sesiones anteriores: tope de voz de Pro (~30 s/mes).

### Primera tarea de la próxima sesión
Preguntar al fundador si borra el proyecto Vercel sobrante `landing`; luego correr `npx playwright test` en `landing/` como verificación pendiente.

---

## Sesión: 2026-09-16 (mismo día) — Excel de costos profesional + cuotas de consumo por empresa (Gemini/ElevenLabs)

### Qué se hizo
Después de cerrar el ciclo del render de cocina, el fundador pidió dos cosas más el mismo día.

**1) Desglose de costos profesional en Excel**, pensando la empresa ya en operación, con regla de
oro explícita: solo lectura de archivos existentes, cero edición de código en esta parte. Se leyó
`docs/PLAN_COSTOS_COMPLETO_COSTO360.md` (fuente oficial del modelo financiero de la universidad) y
se verificaron a mano con Python todos los cálculos (costos unitarios por plan, OpEx, impuestos
colombianos — RST 8,3%, IVA como pass-through, GMF, reservas de contingencia) antes de construir
nada. La construcción real del `.xlsx` (identidad de marca — esmeralda/dorado, logo real, Calibri,
fórmulas enlazadas entre hojas, cero texto corrupto) se delegó a un agente Document Generator,
verificado de forma independiente en cada entrega (nunca se confió solo en su reporte — se detectó
así, por ejemplo, que un "mojibake" reportado en la consola era en realidad solo una limitación de
la propia consola para mostrar guiones largos, no un defecto real del archivo). El fundador pidió
2 hojas más en mensajes aparte: una simulación de "consumo exagerado" por API para una empresa
grande (para dimensionar colchón sin sorpresas) y un glosario de 21 términos en lenguaje simple.
Resultado final: `docs/Costo360_Desglose_Costos_Profesional.xlsx`, 11 hojas.

**Hallazgo real de esta parte, con impacto directo en la parte 2**: al construir la hoja de
"consumo exagerado" se confirmó leyendo el código real que Cost usa Gemini 3.5 Flash directamente
(`backend/agente/runtime.py`), NO el stack "Claude Sonnet 5 + Fable 100% + Gemini orquestador" que
asume el modelo financiero oficial — el costo real por conversación es ~7,5 veces más barato de lo
presupuestado ahí.

**2) Cuotas mensuales de consumo por empresa**, pedido explícito del fundador para "que no tengamos
sorpresas a fin de mes por altos picos de consumo" de Gemini y ElevenLabs. Se armó como ciclo formal:
`EnterPlanMode` con investigación real ANTES de proponer nada (un Explore agent + lectura directa de
código), confirmando que hoy NO existe ningún control de consumo mensual real — solo un limitador de
velocidad por IP, que además comparte balde entre los 10 usuarios de una empresa grande si están
detrás de la misma IP de oficina, y que ElevenLabs es una cuenta compartida entre TODOS los clientes
de Costo360 (10.000 créditos/mes hoy, sin aislamiento por empresa).

El fundador no sabía qué hacer cuando una empresa llega al tope — se le explicó el estándar real de
la industria (aviso al 80%, corte de la función puntual al 100%, nunca corte de toda la app) antes de
que decidiera; pidió además un colchón de gracia del 20% antes del corte real. También decidió:
medición con tokens/segundos REALES (no un conteo aproximado) y visibilidad para el taller en
lenguaje simple ("te quedan aproximadamente X interacciones/minutos").

**Construido:** migración `0012_consumo_api.sql` (tabla única y genérica `consumo_api`, aplicada a
producción con confirmación explícita — la "estandarización" pedida, en vez de una tabla por API),
`backend/services/consumo_service.py` (tarifas reales en un solo lugar, topes por plan editables sin
redeploy vía `app_config`), enganchado en `backend/agente/runtime.py` y `backend/routers/voz.py`, más
`GET /api/consumo/resumen` nuevo.

**Verificado en vivo de punta a punta** (con un incidente manejado con cuidado: se encontró la
sesión del fundador activa en su celular a mitad de la prueba en el navegador — se canceló de
inmediato en vez de forzar el reclamo de la sesión, y se retomó solo cuando el fundador confirmó que
podía seguir): una conversación real con Cost quedó registrada con tokens/costo reales; bajar el
tope a mano bloqueó a Cost con el mensaje humano exacto sin afectar el resto de la app; restaurar el
tope lo devolvió a funcionar normal de inmediato; el endpoint de resumen respondió correctamente.

**Hallazgo real encontrado en la propia verificación**: el tope de voz por defecto de Pro (500
créditos) da apenas ~30 segundos reales de audio al mes — deliberadamente conservador para proteger
el pool compartido de ElevenLabs, pero casi inútil en la práctica. Queda documentado como pendiente,
no corregido en este ciclo (es un valor de config, ajustable sin tocar código).

### Archivos creados
`docs/Costo360_Desglose_Costos_Profesional.xlsx`, `backend/migrations/0012_consumo_api.sql`,
`backend/services/consumo_service.py`, `backend/routers/consumo.py`.

### Archivos modificados
`backend/agente/runtime.py` (chequeo de tope + registro de consumo real de Gemini),
`backend/routers/voz.py` (chequeo de tope + registro de consumo estimado de ElevenLabs),
`backend/main.py` (registra el router `consumo`).

### Decisiones tomadas
- Una tabla ÚNICA (`consumo_api`) para cualquier API medible, no una tabla por API — es la
  "estandarización" que pidió el fundador explícitamente, y deja el camino abierto a agregar otra
  API medida en el futuro sin otra migración de esquema.
- Bloqueo duro por función (no de toda la app), con aviso al 80% y colchón de gracia del 20% antes
  del corte real — mismo criterio que ya usaba el render de cocina, con el colchón extra que pidió
  el fundador tras entender el estándar real de la industria.
- Medición con tokens/segundos reales, nunca conteo aproximado de turnos — el gasto acumulado debe
  ser el costo real, no un estimado, para que el número que ve el taller sea confiable de verdad.
- `render_cocina`/`render_config` NO se migran al nuevo esquema en este ciclo (ya funcionan, ya están
  probados) — queda anotado como candidato a unificación futura, no una tarea de este ciclo.
- Al encontrar la sesión del fundador activa en su celular durante las pruebas en el navegador, se
  canceló de inmediato en vez de reclamar la sesión — nunca se fuerza cerrar la sesión real de otro
  dispositivo sin preguntar primero.

### Primera tarea de la próxima sesión
Decidir con el fundador si pushear/desplegar el ciclo de cuotas de consumo (backend + migración ya
en producción), y revisar el tope de voz por defecto de Pro antes de que un cliente real lo note.

---

## Sesión: 2026-09-16 (mismo día) — Render de cocina con IA (OpenAI): objetivo nuevo completo + 4 mejoras

### Qué se hizo
El fundador pidió planificar, con 4 agentes en paralelo (AI Engineer, Prompt Engineer, Backend
Architect, Product Manager), cómo integrar la API de OpenAI para que los asesores generen un render
fotorrealista de la cocina de un cliente con el material real que está cotizando — su preocupación
explícita era que el resultado no se pareciera "en nada al material en la vida real". Tras revisar el
plan, pidió implementarlo directo: "vamos a implementarlo y en la 'marcha' vemos que corregimos y
agregamos".

**Construcción completa** (backend + frontend + migración de base de datos real):
- Migración `0011_render_cocina.sql` aplicada a producción (Supabase) con confirmación explícita del
  fundador — tabla `render_cocina` con RLS real + 3 buckets privados de Storage con URLs firmadas.
- `catalogo_materiales` ganó atributos visuales (enum cerrado: color, veta, densidad/patrón de
  veteado, acabado, tono) y foto de referencia con aprobación humana separada de la subida.
- `backend/services/render_service.py`: construye el prompt de forma determinística a partir de los
  enum (nunca texto libre del asesor sin filtrar), ancla la generación en una foto real del material
  siempre que exista (`/v1/images/edits` en vez de generación por texto solo), tope mensual
  configurable, tope de 3 renders por cotización, límite de 10/hora por IP.
- Modelo real usado: `gpt-image-2.5-sunburst`.
- Frontend: `RenderCocinaDialog.tsx` (botón nuevo en Historial), 4 endpoints nuevos de atributos/foto
  de material integrados en `MaterialesPage.tsx`.

**Primera generación real y pagada, verificada en vivo:** el fundador consiguió su clave de OpenAI y la
agregó él mismo a `backend/.env` (yo preparé la línea vacía + instrucciones paso a paso sin tecnicismos
— nunca vi ni escribí el valor real de la clave, regla dura del proyecto). Con la clave activa se
generó un render real de una cocina con el material AMAZONAS (granito): `201 Created`, imagen
fotorrealista correcta. Antes de tener la clave se confirmó también el camino de error controlado
(`503 Service Unavailable`, mensaje claro, sin romper el resto de la app).

**4 mejoras pedidas por el fundador el mismo día sobre el diálogo de render**, las 4 implementadas:
1. Regla dura: nunca se genera un render sin foto de referencia APROBADA del material — antes era
   opcional (se degradaba a generar solo por texto). Ahora el backend la exige con un 422 y el frontend
   bloquea el botón con un aviso claro. Verificado en vivo.
2. Selección de material en 2 pasos en cascada (Tipo de material → Referencia) en vez de un único
   `<select>` con más de 200 opciones mezcladas de todas las categorías. Verificado en vivo.
3. Subir la foto de referencia y aprobarla sin salir del diálogo — al subir aparece una tarjeta con
   vista previa preguntando "¿Guardar esta foto en el catálogo para usarla en este y en futuros
   renders de [REFERENCIA]?". Verificado en vivo (con una foto de muestra genérica, usando
   deliberadamente el botón "Subir otra" al final para NO dejar guardada una foto incorrecta como
   referencia real de AMAZONAS en el catálogo de producción — esa foto sigue pendiente de subir con la
   lámina real cuando el fundador la tenga).
4. Comparación antes/después (foto del cliente vs. render generado, lado a lado en el mismo diálogo) y
   un estado de carga más agradable (mensajes rotativos + barra de progreso animada, reemplazando el
   spinner chico anterior). Implementadas y revisadas en código, pero NO verificadas con una generación
   real todavía (cada llamada a OpenAI tiene costo real) — queda como primera tarea pendiente.

**2 preguntas del fundador, respondidas sin tocar código:**
- ¿Cost (el agente) genera los renders? No — es un flujo completamente aparte, sin ninguna tool
  conectada a Cost hoy.
- ¿Podés construir toda la infraestructura de Costo360 en AWS/Azure de forma automatizada? Sí, como
  arquitecto de nube, con credenciales acotadas (nunca cuenta root) — pero siempre con plan + costo
  estimado + confirmación antes de crear cada recurso, nunca de una sola pasada, y sin reemplazar
  guardia 24/7 real. Es una decisión de migración grande para el futuro, no algo iniciado en esta sesión.

### Archivos creados
`backend/migrations/0011_render_cocina.sql`, `backend/models/render.py`,
`backend/services/storage_service.py`, `backend/services/render_service.py`,
`backend/routers/render.py`, `web/src/api/render.ts`, `web/src/components/RenderCocinaDialog.tsx`.

### Archivos modificados
`backend/models/materiales.py`, `backend/services/catalogo_service.py`,
`backend/routers/materiales.py`, `backend/main.py`, `backend/.env` (línea `OPENAI_API_KEY=` agregada
vacía; el fundador puso el valor real él mismo), `web/src/api/materiales.ts`,
`web/src/pages/MaterialesPage.tsx`, `web/src/pages/HistorialPage.tsx`, `web/src/index.css` (animación
nueva de barra de progreso).

### Decisiones tomadas
- La foto real de referencia del material es OBLIGATORIA para generar cualquier render, sin excepción
  — decisión explícita del fundador, cierra la Ruta A degradada (generar solo por texto) que existía
  antes como opción válida.
- El "antes" de la comparación antes/después vive solo en el navegador del asesor (nunca se reenvía al
  backend) — decisión de diseño propia para no romper la regla ya existente de no re-exponer la foto
  del cliente por privacidad.
- Subir + aprobar la foto de referencia se resuelve completo dentro del mismo diálogo de render (no
  hace falta ir a Catálogo aparte) — reusando los mismos 2 endpoints que ya existían para
  `MaterialesPage.tsx`, sin backend nuevo para esa parte.
- Nada de este objetivo se comiteó a git en esta sesión — decisión de esperar confirmación explícita
  del fundador antes de comitear, pushear o desplegar (regla dura del proyecto).

### Primera tarea de la próxima sesión
Decidir con el fundador: (1) si comitear/pushear/desplegar todo el objetivo de Render de cocina con IA
tal cual quedó, y (2) hacer una generación real más (con costo) para confirmar visualmente la
comparación antes/después y el nuevo estado de carga — las 2 únicas partes de esta sesión que no se
verificaron en vivo contra la API real.

---

## Sesión: 2026-09-16 (mismo día) — Corrección de voseo + 6 mejoras de diseño en Parámetros

### Qué se hizo
El fundador pidió, en un mensaje aparte, que revisara en el navegador la sección de Parámetros
recién rediseñada para encontrar oportunidades de mejora de diseño — solo revisar, sin modificar nada,
y explicar todo en lenguaje simple. Se revisó en vivo (Tarifas, las 5 pestañas de material, Adicionales,
y el modal de agregar costo) y se encontraron 6 problemas reales: montos sin separador de miles,
nombres/unidades truncados en la tabla de Adicionales, el modal de agregar sin botón de cerrar, borrado
sin confirmación, la lista de costos ya guardados sin la misma agrupación que el modal de agregar, y
ninguna señal de "cambios sin guardar". Se presentaron los 6 hallazgos sin tocar código.

En el mensaje siguiente, con `/goal`, el fundador señaló dos cosas más: el modal de agregar tenía texto
en voseo argentino ("le pagás a un oficial", "Elegí qué tipo de costo…") — una regla del proyecto ya
definida antes (para las respuestas de Cost) que volvió a aparecer, esta vez en código que yo mismo
escribí; y que yo mismo le estaba hablando en voseo en el chat, algo que calificó como falta de respeto.
Pidió implementar las 6 mejoras en un solo ciclo.

**Voseo**: grep confirmó solo 2 strings reales con voseo en `ParametrosPage.tsx` (el resto del copy ya
estaba en tuteo neutro) — corregidas ambas. Se guardó una memoria de feedback nueva
(`feedback_nunca_voseo.md`, en el índice de memoria del proyecto) documentando que la regla ya se había
corregido una vez y volvió a aparecer dos veces (código + mi propio chat), para no depender solo de
revisión manual la próxima vez.

**Las 6 mejoras**, implementadas todas en `ParametrosPage.tsx` (más un cambio chico en el `Dialog`
compartido):
1. Componente nuevo `MoneyInput` — formatea con puntos de miles ("60.000") tanto en reposo como
   mientras se edita, usado en los valores de Tarifas y en las 4 columnas de precio de Adicionales.
2. Tabla de Adicionales con `table-fixed` y columnas reproporcionadas (Concepto 36%, Unidad 8%, cada
   etapa 12%) — los nombres largos y las unidades completas ahora se leen sin truncar.
3. Botón de cerrar ("X") agregado al componente `Dialog` compartido de toda la app — decisión
   deliberada de arreglarlo ahí y no solo en esta pantalla, porque beneficia a cualquier diálogo del
   producto sin duplicar lógica; se revisaron los otros usos (`CampanaNotificaciones.tsx`, etc.) para
   confirmar que no había colisión visual, y se puso el botón AL FINAL del DOM (aunque se vea arriba a
   la derecha) para no robarle el foco automático al primer campo real de cada diálogo.
4. Confirmación antes de borrar — un `Dialog role="alertdialog"` (mismo patrón que ya usa
   `MaterialesPage.tsx` para su propio borrado) en Tarifas y en Adicionales, con el nombre real de lo
   que se va a quitar y la aclaración de que no es permanente hasta guardar.
5. La lista de costos ya guardados se reorganizó para agruparse por las mismas 4 categorías que ya
   agrupaba el modal de agregar (Mano de obra, Insumo, Sobre el material, Costo fijo) — cierra la
   inconsistencia real que había entre cómo se agrega algo y cómo se ve después.
6. Aviso "Tienes cambios sin guardar" (punto dorado + texto) junto al botón Guardar — se implementó con
   un wrapper único (`actualizarData`) que reemplazó las 7 llamadas directas a `setData` en los
   manejadores de mutación, para que ninguna edición futura se olvide de marcar el estado como sucio;
   se limpia solo tras un guardado exitoso.

**Bug real encontrado y corregido durante la verificación en vivo** (no estaba en la lista original):
el primer diseño de `MoneyInput` usaba `requestAnimationFrame` para seleccionar el texto al enfocar el
campo — con clics reales a veces el cursor quedaba sin nada seleccionado, y escribir encima insertaba
en vez de reemplazar (probado: "60000" existente + escribir "75000" → quedaba "7500060000"). Se
rediseñó el componente para seleccionar de forma síncrona dentro del propio evento `onFocus` (sin
`requestAnimationFrame` ni un estado `editando` separado) — más simple, y sin la condición de carrera
que causaba el bug. Reverificado en vivo con inspección directa del DOM (`selectionStart`/`selectionEnd`
del input) antes y después del fix.

### Archivos modificados
`web/src/pages/ParametrosPage.tsx` (voseo corregido, `MoneyInput` nuevo, tabla de Adicionales
reproporcionada, confirmación de borrado en las 2 pestañas, agrupación de la lista de Tarifas,
indicador de cambios sin guardar), `web/src/components/ui/Dialog.tsx` (botón de cerrar nuevo,
compartido por toda la app).

### Decisiones tomadas
- El botón de cerrar se agregó al `Dialog` compartido, no solo a la pantalla de Parámetros — beneficia
  a cualquier diálogo del producto, y evita duplicar la misma lógica de cierre en cada pantalla que use
  modales en el futuro.
- Seleccionar el texto del campo de dinero de forma síncrona en `onFocus`, sin `requestAnimationFrame`
  — el diseño anterior tenía una condición de carrera real que se confirmó con el clic real del
  navegador, no solo una sospecha teórica.
- Agrupar la lista de costos guardados con las MISMAS 4 categorías del modal de agregar (reusando
  `GRUPOS_INDUCTOR` e `INDUCTORES_DISPONIBLES` ya existentes) en vez de inventar una agrupación
  distinta — consistencia entre agregar y ver.

### Primera tarea de la próxima sesión
Confirmar con el fundador, en su navegador real: que el voseo ya no aparece en ningún lado de
Parámetros ni en mi forma de hablarle, y que las 6 mejoras se sienten bien en el uso real (formato de
montos al escribir números grandes, columnas de Adicionales sin truncar, cerrar el modal con la X,
confirmar un borrado real, la lista agrupada, y el aviso de cambios sin guardar apareciendo y
desapareciendo correctamente). Todo este ciclo ya está commiteado, pusheado y desplegado a producción
(solo frontend).

---


*(Entradas anteriores en SESSION_ARCHIVO.md)*
