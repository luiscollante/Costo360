# PROGRESS.md — Estado del Proyecto Costo360

---

## ✅ Hecho

- **Fase 2.A ejecutada — migración a Supabase Auth + aislamiento real + sesión única (2026-08-27):**
  Ciclo `/goal` completo (Fases 0-6) en una sola sesión. 10 micro-commits en la rama
  `goal/fase-2a-multitenant-auth` (aún NO fusionada a `master`). Detalle vivo en
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

- **Fase 2.A — cierre pendiente:** el código está completo y auditado en la rama
  `goal/fase-2a-multitenant-auth` (no fusionada). Falta la prueba en vivo por HTTP (B8),
  que necesita `backend/.env` + `web/.env` + config del panel de Supabase Auth — acción del
  fundador. Ver `docs/PLAN_FASE_2A.md`, sección "B8" y "Deuda anotada".
- Hay 3 archivos vacíos de 0 bytes en la raíz del repo (`(CURRENT_DATE`, `NOW()`, `v_cupo`) —
  basura de redirects de shell, untracked, sin commitear. Borrarlos cuando se confirme.

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
- **B8:** prueba en vivo de la Fase 2.A (necesita `.env` del fundador — ver arriba), luego
  fusionar `goal/fase-2a-multitenant-auth` a `master`.
- **Después:** rediseño visual del producto (Objetivo 1 / Fase 2.A del roadmap) — el fundador
  lo pidió como el siguiente frente tras la Fase 2.A.

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

*Última actualización: 2026-08-24*
