# SESSION.md — Registro de Sesiones

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
