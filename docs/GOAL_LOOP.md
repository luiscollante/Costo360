# GOAL_LOOP.md · Ciclo autónomo `/goal`
### v1.0 · Reproduce la metodología compose de MiMo-Code (sin correr `mimo`)

---

## ⚡ Activación

- Si el mensaje del usuario **arranca con `/goal`** → entra en **modo CICLO** (este archivo).
- Si no arranca con `/goal` → comportamiento normal del harness (`CLAUDE.md`), con las 3 partes (Lo que entendí / Lo que haré / Lo que sugiero) y aprobación explícita antes de cada cambio.

En modo `/goal`, la "aprobación explícita" del harness se **reemplaza por validación con subagentes especializados** (Fase 2 y Fase 4). El usuario NO aprueba paso a paso — los subagentes auditores hacen de freno de calidad. Esa es la autorización que el usuario dio al activar este modo.

---

## 🎯 Alcance permitido en modo `/goal`

SÍ:
- Crear y modificar archivos del proyecto (especialmente del CRM `crm-creador-web/`).
- Ejecutar comandos de verificación (`npm run build`, `npm run lint`, `npm run typecheck`, etc.) y leer su output.
- Instalar paquetes npm si una implementación lo requiere (`npm install <paquete>`).
- Operaciones de git **locales** dentro de `crm-creador-web/` (`init`, `add`, `commit`, `status`, `log`, `diff` — nunca `push` ni `force`).
- Levantar el dev server (`npm run dev`) para verificación visual con `agent-browser` si hace falta.

NO:
- **NUNCA deployar a producción** (Vercel o cualquier otro) — eso solo lo hace el usuario, fuera del ciclo, con aprobación explícita separada.
- No modificar archivos de memoria (`PROGRESS.md`, `SESSION.md`, `CONTEXTO_CREADOR_WEB.md`, `GOAL_LOOP.md`, `CLAUDE.md`) salvo en la fase de Finalización del ciclo.
- No tocar el motor `ai-website-cloner-template/` ni las carpetas `leads/<negocio>/sitio/` — el ciclo trabaja el CRM, no los sitios de los negocios.

---

## 🔧 Inicialización única (solo la primera vez que entra en modo `/goal`)

Si `crm-creador-web/` no es todavía un repo git:

1. `git init` dentro de `crm-creador-web/`
2. Crear `.gitignore` si no existe (ignorar `node_modules/`, `.next/`, `.env.local`, `out/`).
3. `git add . && git commit -m "chore: baseline inicial del CRM"` (commit base antes de cualquier cambio).
4. Crear la estructura de docs compose si no existe:
   - `crm-creador-web/docs/compose/specs/`
   - `crm-creador-web/docs/compose/plans/`
   - `crm-creador-web/docs/compose/reports/`

Si ya está inicializado, saltar todo esto.

---

## 📂 Fuente de verdad entre sesiones

- **Specs:** `crm-creador-web/docs/compose/specs/<feature>.md` — qué se va a construir y por qué.
- **Plans:** `crm-creador-web/docs/compose/plans/<feature>.md` — lista de tareas (id, descripción, aceptación, archivos, dependsOn), topo-sort en batches.
- **Reports:** `crm-creador-web/docs/compose/reports/<feature>.md` — bitácora de iteraciones, errores encontrados, decisiones.

El feature name se derivan del slug del pedido del usuario (minúsculas, guiones, max 60 chars). Si el usuario no da nombre, slugify del texto del pedido.

---

## 🔄 Las 4 fases del ciclo

### Fase 0 — Recuperación (ANTES de planificar)

Siempre, al entrar al ciclo:

1. Leer `crm-creador-web/docs/compose/specs/*.md` y `crm-creador-web/docs/compose/plans/*.md` con `glob`.
2. Si existe un spec/plan cuyo nombre matchee el pedido del usuario (o un plan que no esté en estado "Done"):
   - **No regenerar desde cero.** Leer ese spec + plan.
   - Despachar un subagente `general` que compare **plan vs estado real del código** (lee los archivos del CRM que el plan dice tocar) y devuelva:
     - Qué tareas ya están hechas (marcar con estado `done` en el plan).
     - Qué tareas están a medio hacer (marcar `partial` + nota de qué falta).
     - Qué tareas no se empezaron (`pending`).
   - Retomar el ciclo en la fase que corresponda:
     - Si todo `done` pero no validado → ir a Fase 4.
     - Si hay `partial` o `pending` → ajustar el plan (Fase 1 amendment, no nueva) y seguir.
3. Si no existe spec/plan previo → Fase 1 desde cero.

### Fase 1 — Planificar (con subagentes en paralelo)

Despachar en paralelo con `task` tool:

- **Subagente A (`explore`, medium thoroughness):** investiga el CRM — lee `crm-creador-web/AGENTS.md`, `README.md`, `package.json`, estructura de `app/` y `components/`, `lib/db.ts`, `db/schema.sql`, los módulos existentes, y los patrones de código que se usan. Devuelve: projectType, conventions (estilo de código, naming), recentChanges (no aplica si no hay git aún), relevantFiles (archivos que el pedido va a tocar).
- **Subagente B (`general`):** recibe el output de A + el pedido del usuario y aplica la metodología `compose:brainstorm` — formula las preguntas que le haría a un usuario y las responde él mismo desde el contexto, propone 2-3 enfoques con tradeoffs, elige uno y lo justifica. Devuelve todo eso en texto.

Esperar a ambos. Yo sintetizo el resultado. Después:

- **Subagente C (`general`):** recibe el brainstorm + contexto de A y aplica `compose:plan` — escribe el spec (`docs/compose/specs/<feature>.md`) y el plan (`docs/compose/plans/<feature>.md`), en disco con la herramienta `write`. El plan es una lista de tareas con: `id`, `description`, `acceptance`, `files[]` (archivos que tocará esa tarea), `dependsOn[]` (ids de tareas prerequisites, sin ciclos). Una unidad de trabajo = una tarea (no partir cambios chicos en varias tareas, no duplicar tareas casi idénticas).

Después yo hago el **topo-sort** (Kahn) sobre `dependsOn` para particionar en batches: tareas del mismo batch son independientes y pueden paralelizarse; batches se ejecutan en orden.

**Commit de esta fase:** si el plan se escribió en disco (specs/ plans/), hacer `git add docs/compose/specs/<feature>.md docs/compose/plans/<feature>.md && git commit -m "plan(<feature>): spec + plan aprobados en iteración N"`.

### Fase 2 — Validar el plan (auditores)

Despachar subagente `general` como **auditor** (no el mismo que escribió el plan). Le paso el spec + plan + el contexto del subagente A. Tiene que devolver un dictamen estructurado:

| Campo | Criterio |
|---|---|
| `consistency` | ¿Las dependencias `dependsOn` referencian ids que existen? ¿Hay ciclos? ¿Los `files[]` existen o se van a crear y está claro? |
| `completeness` | ¿El plan cubre el pedido completo del usuario? ¿Falta alguna tarea para que la acceptance final se cumpla? |
| `agents_md_compliance` | ¿El plan respeta `crm-creador-web/AGENTS.md` (Next.js 16, leer docs antes de codear, etc.) y `CONTEXTO_CREADOR_WEB.md` (notas técnicas operativas)? |
| `scope` | ¿El plan se excede del pedido? ¿Tiene "while I'm here" o over-engineering? |
| `feasibility` | ¿Cada tarea es ejecutable por un subagente sin interacción del usuario? ¿Los archivos que toca son alcanzables? |
| `verdict` | `approve` o `reject` (con lista de problemas a corregir en cada campo que falló) |

- Si `verdict = approve` → ir a Fase 3.
- Si `verdict = reject` → regresar a Fase 1 pasándole las notas del auditor como `amendment`. **Máximo 2 re-planeos.** Si después de 2 no aprueba, abortar y dejar reporte en `docs/compose/reports/<feature>.md` con el veredicto del auditor para que el usuario decida.

### Fase 3 — Ejecutar (subagentes en paralelo por batch)

Por cada batch del topo-sort, en orden:

1. Si el batch tiene **1 sola tarea** → despachar 1 subagente `general` (no paralelo).
2. Si el batch tiene **2+ tareas** → desparchar todas en paralelo con `task` tool en un solo mensaje. **Asignación estricta de archivos:** cada subagente solo puede escribir en los `files[]` de su propia tarea. Si dos tareas del mismo batch listan el mimo archivo, ese batch se serializa (no paralelo) para evitar conflictos.

Cada subagente recibe en su prompt:
- La tarea específica (id, descripción, acceptance, files).
- El contexto del brainstorm (chosen approach + rationale) como "intent".
- Path al spec y plan completos por si necesita contexto adicional.
- La metadata del CRM (`AGENTS.md`, convenciones, archivo `lib/db.ts` para DB, `lib/estados.ts` para los estados del pipeline) que aplique a su tarea.
- Regla fuerte: aplicar TDD conceptual — primero entender qué prueba/criterio de aceptación validar, luego implementar lo mínimo para cumplirlo. No over-engineering. No "while I'm here".

Esperar todos los subagentes del batch. Para cada uno:
- Si devolvió éxito y tocó archivos → ok.
- Si devolvió null o error → marcar tarea como `failed` + nota.

**Commit de esta fase:** `git add <archivos tocados por el batch> && git commit -m "feat(<feature>): batch <n> — <ids de tareas>"`. Si algún subagente falla, no hacer commit de su trabajo (no hubo cambios) y registrar el fallo.

### Fase 4 — Validar la ejecución (verificación real + spec-compliance)

Despachar 2 subagentes en paralelo:

- **Subagente Verify (`general`):** corre `npm run build` dentro de `crm-creador-web/` con `bash` (es lo más cercano a `npm run check` que el package.json actual permite — typecheckea + buildea). Si más adelante el `package.json` agrega `lint` o `typecheck` o `check`, usarlos también. Devuelve: build status (ok/fail), output de error si hubo, tests count (no aplica hoy).
- **Subagente Review (`general`, auditor):** hace dos-stage review:
  - **Stage 1 — Spec compliance:** lee el spec + plan + hace `git diff HEAD~<n>..HEAD` para ver qué cambió. Por cada acceptance criterion del plan, confirma con evidencia del diff/build si se cumple. Cualquier no-cumplido = critical.
  - **Stage 2 — Code quality:** solo si Stage 1 pasa, revisa calidad (bugs, edge cases, dead code, simplificación).
  - Devuelve: critical[], important[], minor[], readyToMerge (true solo si critical vacío Y todos acceptance cumplidos).

Criterio de pase: Verify `build=ok` Y Review `readyToMerge=true`.

- Si **pasa** → ir a Finalización.
- Si **no pasa** →regresar a Fase 1 con el plan como `amendment` y las notas combinadas de Verify + Review como diagnóstico. **Máximo 3 intentos totales de ejecución.** Si después de 3 no pasa, abortar y dejar reporte en `docs/compose/reports/<feature>.md` con el diagnóstico completo.

**Commit de esta fase (solo si pasa):** `git commit --allow-empty -m "verify(<feature>): build verde + review approved, intent N"` (commit vacío con mensaje marca el hito — queda en el log para reconstruir la historia).

### Finalización

Solo si Fase 4 pasó:

1. Subagente `general` escribe el reporte final consolidado en `docs/compose/reports/<feature>.md` — secciones: Qué se construyó / Arquitectura / Decisiones de diseño / Uso / Verificación / Journey Log (máx 5 entradas) / Source Materials.
2. Commit final: `git add docs/compose/reports/<feature>.md && git commit -m "report(<feature>): cierre del ciclo /goal"`.
3. Actualizar `PROGRESS.md` (mover tarea a Hecho, actualizar En progreso y Siguiente) y `SESSION.md` (qué se hizo, archivos cambiados, decisiones, próxima tarea) — estas son excepciones al "no tocar archivos de memoria" durante el ciclo; solo se hacen al final.
4. Commit de memoria: `git add ../PROGRESS.md ../SESSION.md && git commit -m "docs: memoria actualizada tras /goal <feature>"` (si PROGRESS/SESSION están fuera del repo del CRM, hacer el commit en el repo del CRM de todos modos con rutas relativas; si no se pueden versionar porque viven fuera del repo, omitir el commit y solo actualizar los archivos).
5. Responder al usuario con resumen: feature, fases corridas, intentos, commit hash final, link a `docs/compose/reports/<feature>.md`.

---

## 🛡️ Anti-cortes (red/internet)

- **Commit al final de cada fase exitosa** — como dice la Fase 1, 3, 4 arriba. Antes de salir de cada fase, commit. Si se corta internet antes del commit, los cambios quedan en disco sin commitear; al retomar, la Fase 0 detecta el estado incompleto.
- **Reintentos de comandos de red:** si `npm install`, `npm run build` o cualquier comando de verificación falla por timeout o error de red aparente, reintentar hasta 2 veces antes de declarar fallo de esa fase.
- **Si el propio ciclo se cae a mitad por corte del usuario o de mi entorno:** la próxima vez que el usuario escriba `/goal <mismo pedido>`, Fase 0 detecta el spec/plan existente, lee el reporte si lo hay, y reconstruye el estado. No pierde nada siempre que los commits de fase se hayan hecho.

---

## 🚫 Abortos

El ciclo aborta (deja el control al usuario sin más reintentos) si:

1. Fase 2 rechaza el plan 2 veces seguidas.
2. Fase 4 falla 3 veces seguidas.
3. Un subagente devuelve error crítico irreparable (ej. `npm install` no encuentra el paquete, schema de DB inconsistente).
4. El usuario escribe `/stop` en cualquier momento (señal manual de abortar).

En aborto: escribir `docs/compose/reports/<feature>.md` con el diagnóstico, hacer commit si hubo cambios en disco, y responder al usuario explicando dónde se trabó y qué decisión falta.

---

## 📋 Convenciones de naming de commits

Todas empiezan con un tipo (conventional commits simplificado):

- `plan(<feature>): ...` — Fase 1
- `feat(<feature>): ...` — Fase 3 (implementación de tareas)
- `verify(<feature>): ...` — Fase 4 (hitos de verificación exitosa)
- `report(<feature>): ...` — Finalización (reporte)
- `docs: ...` — Finalización (memoria entre sesiones)

Todos en español, mensaje descriptivo del qué (no del cómo).

---

## 🧭 Notas de implementación (de MiMo-Code, a aplicar)

- **Iron Law de verify:** "no claim without verification evidence" — la Fase 4 siempre corre comandos reales y lee el output completo. "Debería pasar" o el auto-reporte del subagente que implementó NO cuentan como evidencia.
- **Two-stage review:** spec-compliance ANTES que code-quality. No tiene sentido pulir código que no cumple lo que se pidió.
- **Amendment:** si ya existe spec/plan para el feature, se EDITA en el mismo archivo (no se regenera desde cero). Las tareas que ya estaban hechas y no afectan el cambio se omiten del plan accionable.
- **Scope del plan = magnitud del cambio:** cambio chico → 1 tarea. Cambio mediano → tareas genuinamente distintas. Refactor grande → tantas tareas como trabaje el problema. Nunca partir un cambio chico en 5 tareas, ni fundir 3 cambios grandes en 1.
- **Subagentes son leaf workers:** cuando despacho un subagente, le paso contexto suficiente en el prompt para que no tenga que re-explorar el CRM desde cero. El resumen del brainstorm + las rutas a los archivos relevantes van en el prompt del subagente.
- **Simplicidad:** el código que produce el ciclo es lo mínimo que resuelve el problema pedido. No featuresetyendas, no abstracciones para código de un solo uso, no defensive error handling para casos que no pueden ocurrir, no "while I'm here".

---

*GOAL_LOOP.md v1.0 · Reproduce compose workflow de MiMo-Code. No editar sin aprobación del usuario.*
