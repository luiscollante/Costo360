# PROGRESS.md — Estado del Proyecto Costo360

---

## ✅ Hecho

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
- **Inversión total final: $69.850.000 COP, 100% financiada por inversionista** (el fundador no aporta capital propio).
- **Sistema de usuarios y planes rediseñado por completo (2026-08-21):** `CONTEXTO_COSTO360.md` — Starter y Pro bajan a 1 usuario cada uno (Pro ya no es "hasta 5"), Enterprise se mantiene en 10. Flujo completo de creación de cuentas definido: login siempre por correo (Google OAuth o correo+contraseña, nunca por "nombre de usuario"), altas automáticas por plan, invitaciones y restablecimiento de contraseña vía enlaces nativos de Supabase Auth (nunca contraseñas enviadas por correo en texto plano — riesgo de seguridad detectado y corregido). Admin de Enterprise único e intransferible, con cargos decorativos (Gerente/Supervisor/Asesor/Otro) para los 9 usuarios restantes sin que cambien permisos. Recuperación de contraseña en autoservicio para cualquier usuario, en cualquier plan.

---

## 🔄 En progreso

- Nada a medio camino — todas las decisiones de esta sesión quedaron documentadas y comiteadas en git.
- Estado real de `web/` (la otra IA) sin verificar por esta sesión — si se retoma el trabajo técnico, primero hay que leer el código actual, no asumir el de la última vez que esta sesión lo tocó (2026-08-09).

---

## 📋 Siguiente

### Modelo financiero / negocio
- El modelo financiero está completo, con todas las cifras respaldadas por precios reales o cálculos justificados (ninguna pendiente de verificar).
- El usuario decidió explícitamente NO revisar la proyección de Ingresos (171 clientes en el Año 1) — se mantiene tal como está en el Excel.
- **Nota abierta, no bloqueante:** falta definir un plan de sucesión del Admin único de Enterprise si esa persona deja de estar disponible — probablemente resuelto vía soporte de Costo360, no autogestionable.
- **Nota abierta, no bloqueante:** el Agente Legal debería confirmarse con un abogado real (alcance: solo documentos propios de Costo360, nunca asesoría a talleres clientes) antes de construirlo.

### Migración técnica (pausada mientras el otro modelo trabaja en `web/`)
1. ✅ **Fase 1:** Frontend + Supabase Auth (construido por esta sesión)
2. ⚠️ **Fase 2-4:** Backend, 11 módulos y deploy — construidos por el otro modelo, estado real sin verificar por esta sesión
3. ⚠️ **Fase 5 (Android):** el otro modelo ya agregó `capacitor.config.ts` y una carpeta `android/` — no confirmado si está completa
4. ⬜ **Fase 6:** Corte de Streamlit Cloud — pendiente
5. ⬜ **Agentes de operación (Capa B):** arquitectura y costos completamente definidos, construcción del código aún no ha empezado — el primero a construir es Atención al Cliente

### PENDIENTE — Bugs de producción en la versión Streamlit (legado)
- CTA del hero — `index.html` cambiar `href="#"` → URL real
- PIN en texto plano — `app.py` hashear PIN + migración de datos existentes
- Número de cotización con `random.randint(100,999)` — riesgo de colisión
- Configuración de empresa no alimenta los defaults del wizard

### PENDIENTE DE SIEMPRE
- Mantener `CONTEXTO_COSTO360.md` alineado con el estado real del código conforme avance cada fase

---

*Última actualización: 2026-08-21*
