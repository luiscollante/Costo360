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
- Regla de comportamiento "preguntar antes de ejecutar" guardada en memoria y contexto (reforzada 2026-06-07)
- Consultoría completa Microsoft 365 vs Google Workspace (2026-06-06)
- Creación de `CONTEXTO_COSTOMARMOL.md` para el proyecto derivado Costomarmol
- **Decisión de arquitectura nueva APROBADA (2026-08-08):** React + Tailwind + Supabase (Auth incluido) + funciones Python serverless en Vercel + Gemini API + React Native/Expo para Android + Git local sin GitHub
- **Git local inicializado** en `C:\Costo360` (2026-08-08) — sin repositorio remoto
- **Comando `/cierre` creado** — actualiza harness y memoria al final de cada sesión (2026-08-08)
- `CONTEXTO_COSTO360.md` actualizado con la arquitectura nueva completa (2026-08-08)
- **Fase 1 completada (2026-08-08):** proyecto `web/` creado (Vite + React + TypeScript + Tailwind CSS con tokens de marca), cliente de Supabase conectado al proyecto real (`dilskbvmvywqohtswzdw`), pantalla de Login/Registro con Supabase Auth construida y **verificada en vivo** contra la base de datos real (intento de login llegó al servidor y devolvió el error esperado)
- **Fase 2 iniciada (2026-08-08):** carpeta `web/api/` creada para funciones serverless Python; función de prueba `api/ia-test.py` con el SDK `google-genai`; **clave de Gemini verificada funcionando en vivo** (modelo `gemini-3.5-flash-lite` respondió correctamente a una llamada de prueba)

---

## 🔄 En progreso

- **Fase 2:** falta migrar la lógica real (`calculos.py`, `motor_planos.py`, `asistente_ia.py`) a funciones serverless — hasta ahora solo existe una función de prueba que confirma que la conexión a Gemini funciona
- Aún no se probó el runtime real de Vercel en local (`vercel dev`) — se evitó a propósito porque puede pedir iniciar sesión en la cuenta de Vercel del usuario o crear un proyecto en la nube; la función de prueba se verificó ejecutando el código Python directamente

---

## 📋 Siguiente

### PROYECTO MAYOR — Migración arquitectural (arquitectura aprobada 2026-08-08, plan de 6 fases)
1. ✅ **Fase 1:** Frontend React + Tailwind local, conectado al Supabase actual, login migrado a Supabase Auth
2. 🔄 **Fase 2 (en curso):** Backend — migrar `calculos.py`, `motor_planos.py`, `asistente_ia.py` (Claude → Gemini 3.5 Flash-Lite) a funciones serverless Python en `/api`
3. ⬜ **Fase 3:** Reconstrucción de los 11 módulos como componentes React (React Aria + shadcn/ui + Kibo UI + Preline + Framer Motion), con identidad de marca
4. ⬜ **Fase 4:** Deploy en Vercel (plan gratuito), sin GitHub, vía Vercel CLI — primer momento en que se necesitará iniciar sesión en una cuenta de Vercel
5. ⬜ **Fase 5:** App Android nativa con React Native + Expo
6. ⬜ **Fase 6:** Corte de Streamlit Cloud — la app en Streamlit sigue siendo la única versión en uso real hasta completar esta fase

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
