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
- **Arquitectura de agentes de operación definida (2026-08-15 a 18):** `ARQUITECTURA_AGENTES_OPERACION.md` — 5 agentes (Ventas, Marketing, Atención, Diseño, Contabilidad) que operan Costo360 S.A.S. como empresa, con LangGraph + Claude Sonnet 5 + Gemini 3.5 Flash-Lite (cascada de costos con caché), separados en dos capas (producto vs. operación de la empresa) para no salirse del alcance de "cotizador, no ERP".
- **Estructura de costos completa investigada y definida (2026-08-16 a 18):** `PLAN_COSTOS_COMPLETO_COSTO360.md` — costos variables, infraestructura del producto y de los agentes, monitoreo (Sentry/PostHog), herramientas del fundador (Claude Max, Google AI Ultra), operación general, y costos legales de arranque. Incluye precios reales investigados (no estimados) de Vercel, Supabase, Railway, Anthropic, Gemini, Alegra, Pipedrive, Higgsfield, Resend, Sentry, Google Workspace, Claude Max, Google AI Ultra.
- **Modelo financiero de la universidad completado (2026-08-16 a 18):** `C:\Users\wases\Desktop\Universidad\Opción de grado\Costo360\Modelo Financiero - Costo360.xlsx` — hojas Costos, Gastos e Inversión llenadas con datos reales y justificados (antes en $0 o con placeholders genéricos). Inversión total requerida: $41.910.000 COP, 100% financiado por inversionista (el fundador no aporta capital propio). Respaldo del archivo original guardado en la misma carpeta.

---

## 🔄 En progreso

- Modelo financiero listo para presentar — pendiente que el usuario lo revise en Excel y confirme que no falta nada antes de la entrega/sustentación.
- Estado real de `web/` (la otra IA) sin verificar por esta sesión — si se retoma el trabajo técnico, primero hay que leer el código actual, no asumir el de la última vez que esta sesión lo tocó (2026-08-09).

---

## 📋 Siguiente

### Modelo financiero / negocio
- Revisar con el usuario si la proyección de Ingresos (crecimiento a 171 clientes en el Año 1) sigue pareciendo realista o se ajusta — quedó señalado varias veces, nunca resuelto.
- Si se solicita, seguir afinando cifras del modelo financiero antes de la entrega a la universidad.

### Migración técnica (pausada mientras el otro modelo trabaja en `web/`)
1. ✅ **Fase 1:** Frontend + Supabase Auth (construido por esta sesión)
2. ⚠️ **Fase 2-4:** Backend, 11 módulos y deploy — construidos por el otro modelo, estado real sin verificar por esta sesión
3. ⚠️ **Fase 5 (Android):** el otro modelo ya agregó `capacitor.config.ts` y una carpeta `android/` — no confirmado si está completa
4. ⬜ **Fase 6:** Corte de Streamlit Cloud — pendiente

### PENDIENTE — Bugs de producción en la versión Streamlit (legado)
- CTA del hero — `index.html` cambiar `href="#"` → URL real
- PIN en texto plano — `app.py` hashear PIN + migración de datos existentes
- Número de cotización con `random.randint(100,999)` — riesgo de colisión
- Configuración de empresa no alimenta los defaults del wizard

### PENDIENTE DE SIEMPRE
- Mantener `CONTEXTO_COSTO360.md` alineado con el estado real del código conforme avance cada fase

---

*Última actualización: 2026-08-18*
