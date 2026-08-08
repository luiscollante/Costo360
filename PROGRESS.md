# PROGRESS.md — Estado del Proyecto Costo360

---

## ✅ Hecho

- App funcional desplegada en Streamlit Cloud
- Rediseño visual completo (tema oscuro, glassmorphism, colores de marca)
- Corrección de bug de navegación (`radio_ui`)
- Landing page con logo real (9 secciones)
- Prototipo interactivo HTML (11 pantallas navegables)
- Configuración del harness de sesión (CONTEXTO, PROGRESS, SESSION)
- Análisis técnico completo del proyecto con 4 agentes especializados (2026-06-06)
- Regla de comportamiento "preguntar antes de ejecutar" guardada en memoria y contexto (reforzada 2026-06-07)
- Consultoría completa Microsoft 365 vs Google Workspace (2026-06-06)
- Creación de `CONTEXTO_COSTOMARMOL.md` para el proyecto derivado Costomarmol
- **Decisión de arquitectura nueva APROBADA (2026-08-08):** React + Tailwind + Supabase (Auth incluido) + funciones Python serverless en Vercel + Gemini API + React Native/Expo para Android + Git local sin GitHub
- **Git local inicializado** en `C:\Costo360` (2026-08-08) — sin repositorio remoto
- **Comando `/cierre` creado** — actualiza harness y memoria al final de cada sesión (2026-08-08)
- `CONTEXTO_COSTO360.md` actualizado con la arquitectura nueva completa (2026-08-08)

---

## 🔄 En progreso

- Ninguna decisión pendiente de arquitectura — lista para empezar Fase 1 de construcción
- **Pendiente del usuario:** crear su propia API key de Gemini en Google AI Studio (su plan Google AI Pro no la incluye)

---

## 📋 Siguiente

### PROYECTO MAYOR — Migración arquitectural (arquitectura aprobada 2026-08-08, plan de 6 fases)
1. **Fase 1:** Frontend React + Tailwind local, conectado al Supabase actual, login migrado a Supabase Auth
2. **Fase 2:** Backend — migrar `calculos.py`, `motor_planos.py`, `asistente_ia.py` (Claude → Gemini 3.5 Flash-Lite) a funciones serverless Python en `/api`
3. **Fase 3:** Reconstrucción de los 11 módulos como componentes React (React Aria + shadcn/ui + Kibo UI + Preline + Framer Motion), con identidad de marca
4. **Fase 4:** Deploy en Vercel (plan gratuito), sin GitHub, vía Vercel CLI
5. **Fase 5:** App Android nativa con React Native + Expo
6. **Fase 6:** Corte de Streamlit Cloud — la app en Streamlit sigue siendo la única versión en uso real hasta completar esta fase

### PENDIENTE — Bugs de producción en la versión Streamlit (legado, plan ya listo, no se ha tocado)
- CTA del hero — `index.html` cambiar `href="#"` → URL real
- PIN en texto plano — `app.py` hashear PIN al crear usuario + verificar con función segura + migración de datos existentes
- Número de cotización con `random.randint(100,999)` — riesgo de colisión
- Configuración de empresa no alimenta los defaults del wizard

**Nota:** estos bugs viven en el código legado de Streamlit. Falta decidir si vale la pena arreglarlos ahí o si se dan por superados al migrar cada pantalla en la Fase 3.

### PENDIENTE DE SIEMPRE
- Mantener `CONTEXTO_COSTO360.md` alineado con el estado real del código conforme avance cada fase

---

*Última actualización: 2026-08-08*
