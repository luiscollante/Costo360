# Costo360 · Harness de Inicio
### Sistema de memoria entre sesiones · v1.0
### Basado en el harness de Compliance Monitor (Sofgen Pharma) — completado para Costo360 el 2026-08-26

---

## ⚡ EJECUTA ESTO PRIMERO — Sin excepción, antes de responder

Este proyecto ya tiene historia (Ruta A). Al iniciar cualquier sesión nueva, sigue estos pasos en
orden, sin que el usuario te lo pida:

1. **Lee `ARQUITECTURA_MAESTRA.md`** — arquitectura técnica completa, esquema real de base de
   datos, guardrails obligatorios, estándar visual y planes pendientes.
2. **Lee `PROGRESS.md`** — estado actual: qué está hecho, qué está en curso, qué sigue.
3. **Lee `SESSION.md`** — qué pasó en la última sesión y dónde retomar exactamente.
4. **Lee `PATRONES_DE_ERROR.md`** — catálogo de bugs estructurales ya encontrados, para no
   repetirlos.
5. **Lee `CONTEXTO_COSTO360.md`** — contexto de negocio y decisiones de producto.
6. **Lee `docs/ROADMAP_COSTO360.md`** — los 5 objetivos activos, con fases y dependencias.
7. Si hay una herramienta de grafo de código disponible en el entorno, consúltala para tener una
   visión estructural antes de que el usuario pida algo puntual. Si no está disponible, sigue con
   lectura de archivos como siempre — este paso nunca bloquea el inicio de sesión.
8. **Responde al usuario** usando el formato de tres partes de más abajo, confirmando que
   entendiste el estado del proyecto y que estás listo para trabajar.

---

## 📋 Regla de comportamiento — Permanente durante toda la sesión

**Cada respuesta debe tener siempre esta estructura exacta:**

---

### Lo que entendí
Explica con tus propias palabras qué te está pidiendo el usuario. Esto confirma que interpretaste
correctamente el pedido antes de actuar.

### Lo que haré
Describe paso a paso qué vas a hacer, qué archivos vas a tocar y por qué. El usuario **no es
programador** — usa lenguaje intuitivo, sin jerga técnica, explicando el "para qué" de cada cambio
en términos de lo que él va a ver o poder hacer.

### Lo que sugiero
Señala oportunidades de mejora que el usuario quizás no consideró, riesgos de los cambios
propuestos, o consecuencias que debería conocer antes de aprobarte.

---

**Reglas de comportamiento adicionales — todas permanentes:**

- **Nunca** modifiques, crees ni elimines ningún archivo sin aprobación explícita del usuario.
- **Nunca** asumas que el silencio o la falta de objeción es una aprobación.
- **Siempre** termina tu propuesta con una pregunta clara de aprobación.
- Usa lenguaje intuitivo y sin jerga técnica — el usuario no es programador.
- Si detectas un riesgo o una inconsistencia en lo que te piden, señálalo antes de proceder.
- **Nunca toques la app Streamlit legada (raíz del repo) sin avisar explícitamente** — es
  producción real del negocio hoy.

---

## 🔒 ANTES DE TERMINAR LA SESIÓN — Obligatorio, sin excepción

**Frases que disparan este protocolo de inmediato:** "cierra la sesión", "actualiza los archivos de
memoria", "guarda todo" o equivalentes — ejecuta los pasos de abajo en ese mismo momento.

1. **Actualiza `PROGRESS.md`** — nueva entrada `## ✅ Hecho (fecha de hoy)` al principio del
   archivo (no al final), con la próxima tarea lógica anotada al cierre de esa entrada.
2. **Actualiza `SESSION.md`** — qué se hizo, qué archivos cambiaron, qué decisiones se tomaron y
   cuál es la primera tarea de la próxima sesión. Suficientemente específico para retomar leyendo
   ÚNICAMENTE este harness.
3. **Verifica el tamaño de `PROGRESS.md` y `SESSION.md`**. Si alguno supera 800 líneas, mueve las
   entradas más antiguas a `PROGRESS_ARCHIVO.md`/`SESSION_ARCHIVO.md`, cortando en un límite de
   sección.
4. **Actualiza `ARQUITECTURA_MAESTRA.md`** si hubo algún cambio arquitectónico (nuevo módulo,
   endpoint, tabla, regla sin excepción, o avance en el esquema multi-tenant).
5. **Actualiza `CONTEXTO_COSTO360.md`** si hubo cambios de negocio/producto.
6. **Actualiza `docs/ROADMAP_COSTO360.md`** si algún objetivo/fase avanzó o cambió de alcance.
7. **Actualiza `PATRONES_DE_ERROR.md`** solo si se corrigió un bug que sea un patrón reutilizable —
   no cada error de una sola vez.
8. **Actualiza la memoria persistente** en
   `C:\Users\wases\.claude\projects\C--Costo360\memory\` si hubo decisiones duraderas nuevas.
9. **Confirma explícitamente al usuario:** "Memoria actualizada. Si abres una sesión nueva y solo
   me mandas a leer `@HARNESS_INICIO.md`, voy a retomar exactamente donde quedamos hoy." Si algo
   quedó a medias o sin commitear, dilo explícitamente ANTES de confirmar continuidad completa.

---

## 🔁 Ciclo de trabajo opcional — `/goal` (Planear → Validar → Ejecutar → Validar → Guardar)

Para cualquier tarea no trivial (ej. resolver el aislamiento multi-tenant del Objetivo 1):

1. **Seleccionar agentes** pertinentes a la tarea (2 a 4) del catálogo disponible en el entorno.
2. **Planear** con esos agentes — plan detallado, archivos a tocar, orden, riesgos, marcado
   `[ARQUITECTÓNICO]` si aplica — y presentarlo con el formato de tres partes. Esperar aprobación.
3. **Validar el plan** con agentes DISTINTOS a los de planeación (independencia de auditoría).
4. **Ejecutar** un archivo a la vez, con un micro-commit por archivo:
   `git commit -m "wip(goal): <archivo> — <descripción breve>"`
5. **Validar la ejecución** con agentes distintos a los de validación del plan.
6. **Guardar** — repetir el protocolo de cierre de sesión de arriba, más un commit final de
   documentación.

Si algún agente rechaza en el paso 3 o 5, se vuelve al paso 2 con las observaciones como contexto
adicional.

---

## 🧭 Costo360 — Qué es y para qué sirve

SaaS B2B de cotización para talleres de transformación de piedra natural en Colombia (mármol,
granito, sinterizado, Quartzstone, cuarcita). Permite cotizar proyectos con precisión en minutos,
generar PDFs profesionales, y analizar la rentabilidad del taller. No es un ERP ni software
contable. Detalle completo: `ARQUITECTURA_MAESTRA.md` sección 1, `CONTEXTO_COSTO360.md`.

---

## 🏗️ Arquitectura — Componentes (resumen rápido — detalle completo en `ARQUITECTURA_MAESTRA.md`)

| Componente | Ruta | Estado |
|---|---|---|
| App legado (Streamlit) | raíz del repo | En producción real — no tocar sin avisar |
| Prototipo nuevo (React+FastAPI) | `web/` + `backend/` | Prototipo funcional, no desplegado a producción |
| Agentes de operación (Capa B) | `agentes-operacion/` | Sin construir — Objetivos 3 y 4 |

---

## ⚙️ Stack tecnológico aprobado (resumen rápido — detalle completo en `ARQUITECTURA_MAESTRA.md` sección 3)

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4, `react-router-dom`, `@tanstack/react-query`, `zustand`, `react-hook-form`+`zod`, `framer-motion`, `cmdk` |
| Backend | FastAPI (Python) + `psycopg2`/`SQLAlchemy` + Supabase Postgres |
| IA del producto | Gemini API (`google-genai`), modelo `gemini-3.5-flash-lite` |
| IA de operación (Capa B, futura) | Claude Sonnet 5 + Gemini 3.5 Flash-Lite (cascada), LangGraph |
| Infraestructura | Vercel (frontend), Supabase (datos), Cloudflare Pages (landing), Azure Container Apps (agentes, futuro/de pago) |

Si se necesita usar algo fuera de esta lista, avisar al usuario antes de usarlo.

---

## 🚫 Reglas que no tienen excepción (resumen rápido — detalle completo en `ARQUITECTURA_MAESTRA.md` sección 7)

- Nunca tocar la app Streamlit legada sin avisar explícitamente.
- Nunca enviar contraseñas por correo en texto plano.
- Nunca commitear `.env` ni credenciales.
- El backend se mantiene en FastAPI/Python — no se migra a Node.js.
- El Agente de Costo360 nunca hace facturación DIAN, contabilidad ni logística del taller cliente.
- Las 8 reglas de arquitectura de producto de la entrevista (aislamiento por cliente, roles,
  sesión única, etc.) — ver `ARQUITECTURA_MAESTRA.md` sección 7.1.
- Comitear con frecuencia durante la sesión, no dejar cambios grandes sin guardar.

---

## 📚 Dónde encontrar más detalle

1. `PROGRESS.md` — estado actual (ya leído al iniciar).
2. `SESSION.md` — última sesión (ya leído al iniciar).
3. `PATRONES_DE_ERROR.md` — catálogo de bugs estructurales (ya leído al iniciar).
4. `ARQUITECTURA_MAESTRA.md` — documentación técnica completa del sistema (ya leído al iniciar).
5. `docs/ROADMAP_COSTO360.md` — los 5 objetivos activos, con fases y dependencias.
6. `CONTEXTO_COSTO360.md` — contexto de negocio y decisiones de producto.
7. `PROGRESS_ARCHIVO.md` / `SESSION_ARCHIVO.md` — historial rotado (cuando exista).

---

*Harness de Costo360 · Basado en la plantilla universal (`HARNESS_TEMPLATE.md`) · Completado el
2026-08-26 con los datos reales del proyecto.*
