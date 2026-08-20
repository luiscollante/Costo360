# SESSION.md — Registro de Sesiones

---

## Sesión: 2026-08-18 a 2026-08-19 — Afinamiento final del modelo financiero

### Qué se hizo
- **Límites de usuario por plan actualizados:** Starter 1 usuario único, Pro hasta 5, Enterprise hasta 10 (antes 3/7/10). Se aclaró que la unidad de venta en el Excel sigue siendo la suscripción por taller, no el usuario individual — el control del límite es lógica simple del producto (Panel Admin), no tarea de un agente de IA.
- **Verificación de un cambio manual del usuario:** el usuario editó directamente en Excel el % de crecimiento anual de precio y cantidad en la hoja Ingresos (precio Año 5: 3,5%→3,6%; cantidad Año 2-5: 35/45/55/65%→40/48/60/68%). Se confirmó que ya quedó guardado correctamente, sin necesidad de acción adicional.
- **Fusión con investigación propia del usuario:** el usuario aportó `web/Costo360 - Modelo Financiero e Infraestructura de Costos.xlsx`, con una simulación de consumo de tokens mucho más rigurosa (por request/agente real) y un stack de infraestructura más completo que el propio. Se reconciliaron ambas fuentes, resolviendo 7 puntos con el usuario: Claude Max y Google AI Ultra se presupuestan al plan completo (no al plan económico que traía su archivo); sin GitHub; Plan Enterprise se mantiene en $600.000 (no $850.000); se mantiene la proyección de 171 clientes ya cargada (no la de 100 clientes, más conservadora, de su archivo); Alegra y Pipedrive se mantuvieron en los planes ya elegidos por decisión propia; Google Workspace se mantiene en 1 cuenta. Se detectó y explicó al usuario un doble conteo real en la hoja "Resumen Ejecutivo" del archivo del usuario (no fue una confusión de USD/COP, se demostró con la aritmética exacta).
- Se adoptaron piezas nuevas y valiosas del archivo del usuario: simulación de tokens por 6 agentes ($663.117 COP/mes con colchón del 50%), Railway más realista ($187.719, cubre Docker+WeasyPrint+agentes — ambos gratis, el costo es el servidor), cuentas de desarrollador Apple/Google Play ($32.319/mes) y Tavily/Serper para prospección web ($78.216/mes).
- **Investigación de 12 portátiles potentes** (32-64GB RAM) con precios reales y enlaces, separados en Top 3 recomendado vs. el resto, con precios en COP. Se descartaron Razer y Framework por no tener garantía oficial en Colombia (el usuario pidió explícitamente "garantías para los inversionistas").
- El usuario pidió específicamente un ASUS con AMD + 64GB + GPU de última generación — se identificó el **ASUS ROG Zephyrus G14 (2026), AMD Ryzen AI 9 370HX, RTX 5080, 64GB**, y se confirmó que se vende oficialmente en Colombia (Falabella, vendedor Atmósfera Tecnológica) — precio de la variante exacta de 64GB quedó como estimado, pendiente de verificación directa por el usuario.
- Se llenó "Equipos y maquinaria" (laptop + monitor + UPS + router de respaldo + celular de prueba + SSD externo, todo con justificación de continuidad operativa, no por lujo) y "Otro" (reserva discrecional de $3.000.000, la "carta de navidad" del usuario, separada de los Imprevistos).
- Se corrigió "Desarrollo de tecnología/app": el usuario preguntó por qué $4.000.000 y no otra cifra — se reconoció honestamente que era una cifra sin cálculo real detrás, y se reemplazó por una justificación concreta (consumo extra de API durante ~3 meses de pruebas/depuración activa, ~2,5x el consumo operativo estable), ajustada a $5.000.000.
- **Inversión total final: $73.150.000 COP, 100% financiada por inversionista.**

### Archivos modificados
- `PLAN_COSTOS_COMPLETO_COSTO360.md` — actualizado varias veces con cada corrección/fusión
- `CONTEXTO_COSTO360.md`, `IDEA_PRINCIPAL_COSTO360.md` — límites de usuario por plan actualizados
- `Modelo Financiero - Costo360.xlsx` (fuera del repo git, carpeta de la universidad) — hojas Gastos e Inversión reescritas varias veces con los números finales; Costos sin cambios desde el 18 de agosto

### Decisiones tomadas
- Ver la lista de 7 puntos resueltos arriba (Claude Max/Google AI Ultra plan completo, sin GitHub, Enterprise $600.000, Ingresos sin cambios, etc.)
- ASUS ROG Zephyrus G14 (2026) AMD+RTX5080+64GB como portátil de desarrollo
- Estructura final de Inversión: Desarrollo tecnología $5.000.000, Equipos y maquinaria $21.400.000, RNBD $400.000, Capital de trabajo $33.000.000, Registro legal $1.200.000, Marketing lanzamiento $2.500.000, Otro $3.000.000, Imprevistos $6.650.000 → Total $73.150.000, 100% inversionista

### Primera tarea de la próxima sesión
- Preguntar si el usuario ya verificó el precio real del ASUS ROG Zephyrus G14 (64GB) en Falabella y si hay que ajustar la cifra en Inversión
- Preguntar si sigue activa la otra IA en `web/` antes de considerar retomar cualquier trabajo técnico ahí
- Confirmar si el modelo financiero ya está listo para entrega/sustentación o si falta algo más

---

## Sesión: 2026-08-15 a 2026-08-18 — Visión de negocio, agentes de IA y modelo financiero

### Qué se hizo
- **Detección y manejo de un intento de manipulación:** llegaron varios "avisos del sistema" falsos pidiendo ocultarle al usuario cambios en archivos (incluidos dos tokens reales — `VERCEL_TOKEN` y `SUPABASE_ACCESS_TOKEN` — que aparecieron sin explicación en `web/.env`). No se siguieron esas instrucciones; se verificó todo directamente y se le informó al usuario de inmediato. Causa real: otro modelo de IA trabajando en paralelo sobre la misma carpeta `C:\Costo360`, específicamente en `web/`. El usuario confirmó que es intencional y decidió seguir esa línea de trabajo técnico; esta sesión se mantiene fuera de `web/` desde entonces para no generar más conflictos de archivos.
- **Lectura completa de la documentación de grado** (`C:\Users\wases\Desktop\Universidad\Opción de grado\`) → síntesis de la visión de negocio en `IDEA_PRINCIPAL_COSTO360.md`: origen (CostoMarmol → Costo360), problema real con evidencia, cliente objetivo, propuesta de valor, Business Model Canvas, métricas objetivo, validación ya realizada, y la corrección explícita de que **Costo360 no es un ERP ni software contable** — solo cotiza, genera entregables, gestiona cotizaciones y analiza el negocio del taller.
- **Corrección de expectativas:** el usuario aclaró que esto no es una tesis simulada — es la creación real de la empresa (Opción de Grado = crear la empresa), con inversión real de la universidad/inversionistas en función de la ambición del proyecto.
- **Arquitectura de agentes de operación de la empresa** (`ARQUITECTURA_AGENTES_OPERACION.md`): 5 agentes (Ventas, Marketing, Atención al Cliente, Diseño, Contabilidad) que operan Costo360 S.A.S. como empresa — separados en dos capas para no confundir "agentes del producto" con "agentes que administran la empresa". LangGraph como orquestador, Claude Sonnet 5 para razonamiento, Gemini 3.5 Flash-Lite como filtro barato (cascada de costos con prompt caching). Se corrigió que Evolution API para WhatsApp viola los términos de Meta — se usa WhatsApp Cloud API oficial. Se corrigió que el Agente de Contabilidad no factura a nombre de los talleres clientes (eso sería salirse del alcance de "cotizador, no ERP") — solo factura la suscripción de Costo360 y gestiona lo tributario de Costo360 mismo.
- **Investigación y aterrizaje de la estructura de costos completa** (`PLAN_COSTOS_COMPLETO_COSTO360.md`): precios reales investigados (no estimados) de Vercel, Supabase, Railway, Anthropic (Claude Sonnet 5 y 4.5 — se descartó 4.5 por ser más caro y peor que 5), Gemini, Alegra, Pipedrive, Higgsfield, Resend, Sentry, PostHog, Google Workspace, Claude Max, Google AI Ultra. Se corrigió un "colchón" de consumo de API propuesto por el usuario ($7.300.000 COP/mes) por un cálculo real basado en volumen esperado (~$230.000 COP/mes con margen de seguridad). Se descartó Base44 por ser redundante con la arquitectura ya elegida (LangGraph + Claude Code). Se corrigió una fila de "Infraestructura Cloud" en los costos variables que no tenía cálculo real detrás (quedó en $0, ya cubierta como gasto fijo). Se corrigió que todos los valores deben quedar en COP, nunca mezclados con dólares.
- **Modelo financiero de la universidad completado**: se llenaron con datos reales las hojas Costos, Gastos e Inversión de `C:\Users\wases\Desktop\Universidad\Opción de grado\Costo360\Modelo Financiero - Costo360.xlsx` (antes en $0 o con placeholders genéricos de la plantilla), preservando todas las fórmulas. Se hizo respaldo del archivo original antes de editar. Financiamiento corregido a 100% inversionista (el fundador no aporta capital propio). En la escritura final (2026-08-18) se detectó y corrigió una inconsistencia real: el Capital de trabajo en el Excel seguía en un valor viejo ($21M) que no cuadraba con el financiamiento ya calculado en el chat ($30M) — quedó reconciliado para que Inversión total = Financiamiento exacto ($41.910.000). Se le dio al usuario una justificación completa línea por línea de Costos, Gastos e Inversión.

### Archivos creados
- `IDEA_PRINCIPAL_COSTO360.md`
- `ARQUITECTURA_AGENTES_OPERACION.md`
- `PLAN_COSTOS_COMPLETO_COSTO360.md`

### Archivos modificados
- `CONTEXTO_COSTO360.md` — secciones de negocio actualizadas (qué es, modelo de precios con los 3 planes reales, módulos incluyendo Panel Admin, Parámetros sin Transporte)
- `Modelo Financiero - Costo360.xlsx` (fuera del repo git, en la carpeta de la universidad) — Costos, Gastos, Inversión llenados; respaldo guardado en la misma carpeta

### Decisiones tomadas
- Costo360 no es un ERP — nunca factura ni contabiliza a nombre de los talleres clientes
- Modelo de negocio con dos capas de agentes de IA: producto (mínimo) vs. operación de la empresa (los 5 agentes)
- Stack de agentes: LangGraph + Claude Sonnet 5 + Gemini 3.5 Flash-Lite, con cascada de costos
- WhatsApp Cloud API oficial, no Evolution API (riesgo de baneo)
- Inversión total requerida: $41.910.000 COP, 100% inversionista
- Esta sesión se mantiene fuera de `web/` mientras el otro modelo de IA siga trabajando ahí

### Primera tarea de la próxima sesión
- Preguntar si el usuario ya revisó el Excel del modelo financiero y si hay ajustes pendientes
- Preguntar si sigue activo el otro modelo de IA en `web/` antes de considerar retomar cualquier trabajo técnico ahí
- Si se retoma `web/`, leer el código actual primero — no asumir el estado de la última vez que esta sesión lo tocó (2026-08-09)

---

## Sesión: 2026-08-08 (Cuarta parte — Conclusión de UI, Refinamiento y Deploy)

### Qué se hizo
- **Fase 3 (Frontend) 100% completada:** Se refinaron e implementaron todas las interfaces pendientes: `CotizacionAIUTab.jsx`, `ExpressTab.jsx`, `HistorialTab.jsx`, `RetalesTab.jsx`, `NestingTab.jsx`, copiando 1 a 1 el diseño, métricas e inputs interactivos del código en Streamlit original (`ui_*.py`).
- **Fase 4 (Deploy) 100% completada:** Se solucionaron errores con paquetes dependientes de Vite/React (`recharts` y `es-toolkit`), se ejecutó autenticación Oauth desde la CLI en la máquina local (`vercel login`) y se efectuó el despliegue final.
- El proyecto final se subió al enlace definitivo: `https://web-teal-seven-30.vercel.app/` o `https://web-94nyq6cpz-marmoles-collante-y-castro.vercel.app/`.

### Archivos modificados
- Todos los `.jsx` en `web/src/components/`.
- `PROGRESS.md`, `SESSION.md`, `task.md`, `walkthrough.md`.

### Decisiones tomadas
- Se mantuvieron las interfaces fieles a la aplicación Streamlit para validar primero la lógica.
- La Fase 4 se completó con un despliegue directo a través de Vercel CLI, debido a la ausencia de un repositorio en GitHub configurado como origin.

### Primera tarea de la próxima sesión
- Arrancar la **Fase 5**: Creación de App Android nativa con React Native + Expo, o bien iniciar la conexión del front-end con las APIs en Python de Vercel Functions para procesar cálculos de cotización.

---

## Sesión: 2026-08-08 (Tercera parte — Finalización Fase 2, Fase 3 UI y Deploy Fase 4)

### Qué se hizo
- **Fase 2 (Backend) completada:** Se migró toda la lógica de `calculos.py`, `motor_planos.py`, `asistente_ia.py` a `/api/index.py` de Vercel Functions usando FastAPI.
- **Fase 3 (Frontend) iniciada y parcialmente completada:** 
  - Se configuró la paleta de colores corporativa (Verde #1F6F54, Dorado #C9A45C, Fondos Oscuros) en `tailwind.config.js` y `index.css`.
  - Se estructuró el `App.jsx` con React Router mock y Sidebar de navegación.
  - Se reconstruyó y conectó la pestaña **Cotización Directa** (archivo `CotizadorTab.jsx`): Soporte dinámico de piezas, paneles interactivos de viáticos y logística, y precálculo de área de retal.
  - El Cotizador Directo ahora envía exitosamente el JSON al backend en Vercel y renderiza el desglose financiero nativo en React.
- **Fase 4 (Despliegue) completada:**
  - Se usó Vercel CLI para desplegar la app en producción.
  - URL Activa: `https://web-three-taupe-65.vercel.app`.
  - Se resolvieron conflictos de versiones en React/Lucide usando un `.npmrc` con `legacy-peer-deps=true`.

### Archivos modificados
- `web/src/App.jsx` — Layout principal, colores corporativos y tabs.
- `web/src/index.css` & `web/tailwind.config.js` — Identidad visual (Dark green/gold).
- `web/src/components/CotizadorTab.jsx` (Nuevo) — Integración total del cotizador B2B conectada al backend Python.
- `web/api/index.py` (Nuevo) — Entrada FastAPI para Vercel.
- `web/.npmrc` (Nuevo) — Configuración para el deploy de Vercel.
- `PROGRESS.md` & `SESSION.md`.

### Decisiones tomadas
- Se extrajeron las variables de cálculo directo de `ui_cotizacion_directa.py` (antiguo Streamlit) y se replicó su pre-agrupación en React para evitar modificar el `calculos.py` original que recibe los parámetros consolidados (`m2_real`, `zocalo_ml`, etc).
- Vercel CLI se ejecutó con éxito.
- La identidad visual estricta se debe conservar siempre en los próximos módulos.

### Primera tarea de la próxima sesión
- Continuar con la **Fase 3**: Migrar a React y conectar los módulos faltantes (Planos SVG, Banco de Retales, Historial, Copiloto IA).
- Mantener la cohesión visual del `CotizadorTab.jsx` para los nuevos componentes.

---

## Sesión: 2026-08-08 (Segunda parte — construcción Fase 1 y arranque Fase 2)

### Qué se hizo
- Se construyó la **Fase 1** completa: proyecto `web/` con Vite + React + TypeScript + Tailwind CSS v4, tokens de marca (`@theme` con verde/dorado/fondo oscuro/tipografías) en `src/index.css`
- Se instalaron `@supabase/supabase-js`, `react-router-dom`, `framer-motion`
- Se creó `src/lib/supabaseClient.ts` y la pantalla `src/pages/Login.tsx` (tabs Iniciar sesión/Registro) usando Supabase Auth, con `App.tsx` gestionando la sesión (`onAuthStateChange`)
- **Localización del proyecto Supabase real:** no estaba en la cuenta conectada por MCP; se ubicó a través de `st.secrets["DATABASE_URL"]` de la app en Streamlit Cloud. El usuario compartió la cadena de conexión completa (con contraseña) y la clave pública (`sb_publishable_...`) por chat — ambas se guardaron directo en `web/.env` (excluido de git) y nunca se repitieron en archivos versionados. Project ref real: `dilskbvmvywqohtswzdw`
- **Verificación en vivo:** se probó un login con credenciales falsas desde el navegador (Chrome vía MCP) y se confirmó, revisando la petición de red, que llegó hasta Supabase Auth real y devolvió "Invalid login credentials" — prueba de que la conexión funciona de extremo a extremo sin crear ninguna cuenta de prueba real
- Se arrancó la **Fase 2**: carpeta `web/api/` (convención de funciones serverless de Vercel) + `web/requirements.txt` con `google-genai` + función de prueba `api/ia-test.py`
- El usuario proporcionó su clave de Gemini por chat; se guardó solo en `web/.env` (nunca repetida en la respuesta ni en archivos versionados) y se **verificó en vivo** ejecutando el código Python directamente: el modelo `gemini-3.5-flash-lite` respondió correctamente
- Se decidió NO correr `vercel dev` todavía para no arriesgar disparar un login/vinculación de cuenta de Vercel sin conversarlo antes — la validación del backend se hizo ejecutando el código Python de forma directa

### Archivos creados
- `web/` (proyecto completo: `package.json`, `vite.config.ts`, `src/index.css`, `src/App.tsx`, `src/lib/supabaseClient.ts`, `src/pages/Login.tsx`, `.env.example`, `.env` [no versionado])
- `web/requirements.txt`, `web/api/ia-test.py`

### Archivos modificados
- `PROGRESS.md` — Fase 1 marcada como hecha, Fase 2 en progreso
- `SESSION.md` — este archivo

### Decisiones tomadas
- El proyecto Supabase real de Costo360 es `dilskbvmvywqohtswzdw` (no estaba en ninguna cuenta conectada por MCP)
- Las funciones serverless viven en `web/api/`, con `web/` como raíz del futuro proyecto de Vercel (frontend + backend en un mismo deploy)
- No se ejecuta ningún comando que pueda vincular o autenticar una cuenta de Vercel sin acuerdo explícito previo del usuario — queda para la Fase 4

### Riesgo detectado
- El usuario compartió en el chat la cadena de conexión completa a la base de datos (con contraseña en texto plano) y la clave de Gemini. Ambas quedaron guardadas únicamente en `web/.env` (gitignored). Vale la pena recordarle al usuario, en algún momento, no compartir contraseñas de base de datos por chat — para claves públicas (anon/publishable) no hay problema, están diseñadas para exponerse.

### Primera tarea de la próxima sesión
- Seguir la **Fase 2**: migrar la lógica real de `calculos.py` y `motor_planos.py` a funciones serverless en `web/api/`, y reemplazar `asistente_ia.py` (Claude) por una versión que use Gemini
- Cuando se quiera probar el runtime real de Vercel (`vercel dev`) o desplegar, avisar primero al usuario porque puede pedir iniciar sesión en su cuenta de Vercel

---

## Sesión: 2026-08-08

### Qué se hizo
- Se retomó la decisión pendiente de migración arquitectural (marcada como bloqueante desde 2026-06-07)
- Se presentaron y resolvieron por rondas de preguntas (siguiendo la regla de 2-4 preguntas):
  - GitHub: se elimina por completo, sin repositorio remoto
  - Backend: 100% funciones serverless Python en Vercel
  - Frontend: React + Tailwind CSS, con foco en animaciones/microinteracciones
  - App Android: nativa separada (no empaquetado de la web)
  - App Android — tecnología: React Native + Expo (recomendado por consistencia de lenguaje con el frontend web)
  - Base de datos: mantener el proyecto Supabase actual (no crear uno nuevo)
  - Autenticación: migrar a Supabase Auth (confirmado gratis hasta 50k MAU y más seguro que el sistema propio)
- **Base de datos decidida: Supabase** sobre SQL Server Express — SQL Server Express no tiene hosting gratuito nativo en la nube, lo que choca con el objetivo de "gratis, sin servidor propio"
- Usuario aprobó el enfoque completo de arquitectura
- Investigación web sobre modelo de IA: se confirmó que Gemini 3.6 Flash existe (lanzado 21 jul 2026) y que el plan "Google AI Pro" del usuario NO incluye acceso a la API (es una suscripción de consumo, separada de la API de pago por uso de Google AI Studio). Se dejó registrado **Gemini 3.5 Flash-Lite** como modelo por defecto (más económico vigente; Gemini 2.5 Flash-Lite se descontinúa el 16 oct 2026)
- Bibliotecas de UI definidas: React Aria, shadcn/ui, Kibo UI, Preline (gratuitas). Se detectó que Tailwind Plus es de pago y se dejó fuera por defecto, pendiente de confirmación del usuario si quiere pagarla
- Se detectó el archivo `apikeyglm.txt` en la raíz del proyecto (aparenta ser una clave de API) — se excluyó del git local vía `.gitignore`, sin abrir ni exponer su contenido
- Se inicializó un repositorio **git local** en `C:\Costo360` (sin remoto/GitHub), con `.gitignore` cubriendo `__pycache__`, archivos de clave/credenciales y artefactos de build futuros
- Se creó el comando `/cierre` (`.claude/commands/cierre.md`) para que, al ejecutarlo, se actualicen automáticamente `PROGRESS.md`, `SESSION.md` y la memoria del proyecto

### Archivos modificados
- `CONTEXTO_COSTO360.md` — reescrito con la arquitectura nueva aprobada, justificación de Supabase/Supabase Auth, fases de migración, y notas de riesgo
- `PROGRESS.md` — decisión de arquitectura movida a Hecho, plan de 6 fases actualizado como Siguiente
- `SESSION.md` — este archivo

### Archivos creados
- `.gitignore`
- `.claude/commands/cierre.md`

### Decisiones tomadas
- Arquitectura completa aprobada: React + Tailwind (+ React Aria/shadcn/Kibo UI/Preline + Framer Motion) · funciones Python serverless en Vercel · Supabase (DB + Auth, proyecto existente) · Gemini 3.5 Flash-Lite · React Native/Expo para Android · Vercel hosting sin GitHub · git local sin remoto
- Se mantiene el proyecto Supabase actual (no se crea uno nuevo, no se pierden datos)
- La app en Streamlit sigue siendo la única versión real para los talleres hasta completar la Fase 6 (corte)

### Primera tarea de la próxima sesión
- Empezar la **Fase 1**: levantar el proyecto React + Tailwind local y conectar el login a Supabase Auth
- Recordar al usuario que necesita generar su propia API key de Gemini en Google AI Studio antes de llegar a la Fase 2 (su plan Google AI Pro no la incluye)

---

## Sesión: 2026-06-07

### Qué se hizo
- Activación del harness y lectura de estado completo del proyecto
- Refuerzo de la regla de comportamiento: plan de tres partes SIEMPRE antes de actuar, sin excepción salvo indicación explícita del usuario — guardada en `memory/feedback_regla_preguntas.md`
- Plan detallado de **Nivel 1** (bugs de producción):
  - **Ítem 1:** CTA del hero `index.html:269` — cambio de una línea (`href="#"` → URL real) — plan listo, pendiente aprobación para ejecutar
  - **Ítem 2:** PIN en texto plano en `app.py` — 4 cambios quirúrgicos + migración de BD — plan listo, pendiente aprobación para ejecutar
- Análisis de referencias de diseño en `C:\Costo360\assets\` (4 imágenes: dashboards dark glassmorphism + dashboards verdes limpios)
- Plan completo de **migración Streamlit → FastAPI + React** en 6 fases — presentado, pendiente aprobación

### Archivos modificados
- `PROGRESS.md` — actualizado con todos los pendientes organizados
- `SESSION.md` — este archivo
- `memory/feedback_regla_preguntas.md` — regla reforzada con directiva más estricta

### Archivos de código modificados
- **Ninguno** — no se ejecutó ningún cambio de código; todo está en plan pendiente de aprobación

### Decisiones tomadas
- Regla de sesión reforzada: plan de tres partes obligatorio antes de cualquier acción, siempre
- El usuario pidió enfoque exclusivo en Costo360 (Costomarmol fuera del alcance de estas sesiones)
- La migración arquitectural es una decisión estratégica mayor — requiere aprobación fase por fase

### Primera tarea de la próxima sesión
- **Preguntar:** ¿Ejecutamos primero el Nivel 1 (bugs de producción — plan ya listo) o arrancamos directamente con la Fase 1 de la migración?
- Si elige Nivel 1: confirmar URL de la app (`https://costo360.streamlit.app` o tiene sufijo) y ejecutar los dos cambios
- Si elige migración: arrancar Fase 1 con agentes `engineering-software-architect` + `engineering-backend-architect`

---

## Sesión: 2026-06-06 (Tercera parte)

### Qué se hizo
- Consultoría completa de migración a **Microsoft 365** con 4 agentes en paralelo (estrategia, infraestructura, app interna, agente IA)
- Consultoría completa de **Google Workspace** con 4 agentes en paralelo (mismos ejes)
- Comparación objetiva Microsoft vs Google — conclusión: Google Workspace es la mejor opción para la empresa en este momento
- Preguntas puntuales resueltas: licencias compartidas, Supabase vs SQL Server, Vercel, app Python profesional vs Streamlit
- Identificación de la empresa cliente: **Mármoles Collante & Castro Ltda** (`marmolescollanteycastro.com`)
- Creación de `CONTEXTO_COSTOMARMOL.md` — archivo de contexto para el nuevo proyecto Costomarmol

### Archivos creados
- `CONTEXTO_COSTOMARMOL.md` — contexto completo del proyecto derivado (mover a `C:\costomarmol\`)

### Decisiones tomadas
- Costomarmol = Costo360 clonado y adaptado para Mármoles Collante & Castro Ltda
- Stack objetivo: Python profesional + Supabase + Vercel + Google Workspace
- Se clona todo tal como está y se evoluciona por fases
- Fase 1 de Costomarmol: cambio de identidad visual (colores azules, logo, nombre)
- Google Workspace Business Starter ($6/usuario) es la opción recomendada para la empresa
- Supabase se mantiene (no migrar a SQL Server por ahora)

### Primera tarea de la próxima sesión (Costo360)
- Pendiente de instrucción del usuario — no hay tarea activa
- Tener presente: CTA del hero roto en `index.html` (href="#")

---

## Sesión: 2026-06-06 (Segunda parte)

### Qué se hizo
- Se analizó `index.html` (landing page) antes de correr la app
- Se lanzaron 4 agentes en paralelo para auditoría técnica completa del proyecto:
  - **Codebase Onboarding:** `parametros.py`, `calculos.py`, `asistente_ia.py`, `motor_planos.py`
  - **Software Architect:** `app.py` — auth, Supabase, routing, sesiones, deuda técnica
  - **Product Manager:** todos los `ui_*.py` — flujos, UX, gaps funcionales
  - **Business Strategist:** `index.html` — posicionamiento, coherencia, vulnerabilidades
- Se sintetizó una recapitulación completa del proyecto para validación del usuario
- Se añadió regla de comportamiento permanente: preguntar antes de ejecutar (≥95% certeza), con excepciones para consultas simples/puntuales
- Se respondió consulta sobre si `CONTEXTO_COSTO360.md` es suficiente como contexto para otra IA (respuesta: no, le falta el estado real del código)

### Archivos modificados
- `CONTEXTO_COSTO360.md` — agregada sección `## Reglas de Sesión`
- `PROGRESS.md` — actualizado con hallazgos y pendientes
- `SESSION.md` — este archivo
- `memory/feedback_regla_preguntas.md` — creado (regla de preguntas)
- `memory/MEMORY.md` — actualizado con entrada de la regla

### Hallazgos críticos del análisis técnico
1. **CTA del hero roto** — `href="#"` en el botón "Empieza Gratis" del hero (`index.html` ~línea 271). Bug de producción activo.
2. **Ciclo Nesting → Retales → Cotización desconectado** — la propuesta de valor central no cierra el ciclo en código real.
3. **Número de cotización con `random.randint(100,999)`** — riesgo de colisión en talleres activos.
4. **PIN de recuperación en texto plano** — vulnerabilidad de seguridad activa en `app.py`.
5. **`app.py` monolito de ~3.500 líneas** — sin tests, CSS inyectado con selectores internos de Streamlit.
6. **Configuración de empresa no alimenta los defaults del wizard** — toggle de IVA y parámetros comerciales no se propagan.

### Decisiones tomadas
- Regla de preguntar antes de ejecutar: aplica a toda consulta no trivial; excepciones para consultas simples/puntuales
- El usuario rechazó actualizar `CONTEXTO_COSTO360.md` con el estado real del código (sesión cerrada antes de hacerlo)

### Primera tarea de la próxima sesión
- Preguntar al usuario qué quiere trabajar (no hay instrucción activa)
- Tener presente que el CTA del hero está roto y es prioritario corregirlo

---

## Sesión: 2026-06-06 (Primera parte)

### Qué se hizo
- Se leyó y activó el harness (`_harness_template/CLAUDE.md`)
- Se recibió el contexto completo del proyecto de parte del usuario
- Se crearon los tres archivos base del harness:
  - `CONTEXTO_COSTO360.md`
  - `PROGRESS.md`
  - `SESSION.md`

### Archivos creados
- `CONTEXTO_COSTO360.md`
- `PROGRESS.md`
- `SESSION.md`

### Decisiones tomadas
- Nombre del archivo de contexto: `CONTEXTO_COSTO360.md`
- Los talleres trabajan con: mármol, granito, sinterizado, Quartzstone y Quartzita
- La hoja de ruta NO está definida oficialmente todavía

### Primera tarea de la próxima sesión
- Análisis técnico del proyecto con agentes (completado en segunda parte de esta sesión)

---

*Formato: una entrada por bloque de trabajo, más reciente arriba*
