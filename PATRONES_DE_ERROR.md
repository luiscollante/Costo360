# PATRONES_DE_ERROR.md — Catálogo de bugs estructurales de Costo360

*Este archivo nace vacío el 2026-08-26. Se llena solo con bugs reales que ya ocurrieron y que son
un patrón reutilizable — uno que volvería a ocurrir si alguien construye algo parecido sin haber
leído esta entrada. No se inventan patrones de otro proyecto para rellenarlo.*

*Formato de cada entrada: **Síntoma** (qué se observó) / **Causa raíz** (por qué pasó, no solo el
parche) / **Checklist accionable** (qué revisar la próxima vez para no repetirlo).*

---

## 1. RLS en el backend: `SET LOCAL` es un no-op silencioso fuera de transacción, y un `commit()` intermedio lo revierte

- **Síntoma:** un endpoint que debería ver solo los datos de una empresa devuelve datos de
  todas (o de ninguna), sin ningún error. O al revés: `permission denied` intermitente.
- **Causa raíz:** el patrón para que RLS proteja al backend FastAPI es abrir una conexión,
  hacer `SELECT set_config('request.jwt.claims', ..., true)` + `SET LOCAL ROLE authenticated`,
  y correr TODO el request en esa transacción. `SET LOCAL` y `set_config(..., is_local=true)`
  son de transacción: (a) si no hay transacción abierta, Postgres solo emite un WARNING y la
  sentencia no hace nada → las queries corren como el rol base (que en Supabase es `postgres`
  con BYPASSRLS) → fuga total entre empresas; (b) un `conn.commit()` a mitad del request
  cierra la transacción y revierte el rol y los claims → las sentencias siguientes corren sin
  RLS. El transaction pooler de Supabase (puerto 6543) reproduce (b) en cada `commit`.
- **Checklist accionable:**
  - La dependencia `db_rls` debe **asertar** justo después del setup: `SELECT current_user`
    tiene que dar `authenticated` y `current_setting('request.jwt.claims', true)` no vacío —
    si no, `raise` y abortar el request (está en `backend/db/client.py`).
  - `main.py` corre `_self_test_rls()` al arrancar: comprueba BYPASSRLS del rol de conexión,
    el efecto real de `SET LOCAL ROLE`, que RLS bloquee sin claims, que `DATABASE_URL` no
    use `:6543`, y que el rol se revierta tras el `rollback`. Si falla, el backend no arranca.
  - **Ningún `conn.commit()` intermedio** en un router que use `db_rls` — el commit final lo
    hace la dependencia. Grep de `\.commit()` en `backend/routers/` debe dar vacío.
  - Helpers que escriben (`cfg_set`, etc.) **no** deben llamar `conn.commit()`.
  - `DATABASE_URL` = Session pooler (5432), nunca transaction pooler (6543).

## 2. `json.loads()` sobre una columna `jsonb` → la configuración guardada "desaparece" en silencio

- **Síntoma:** parámetros personalizados, datos de empresa o el logo dejan de leerse; todo
  cae a los valores por defecto del motor, sin error visible.
- **Causa raíz:** psycopg2 registra por defecto el typecaster de JSON/JSONB, así que
  `cur.fetchone()[0]` de una columna `jsonb` ya devuelve un `dict`/`list` de Python.
  `json.loads(dict)` lanza `TypeError`; si está envuelto en `except Exception: return default`
  (como estaba `cfg_get`), la función devuelve el default **siempre**.
- **Checklist accionable:** al leer una columna `jsonb`, comprobar el tipo antes de decodificar:
  `return json.loads(v) if isinstance(v, (str, bytes, bytearray)) else v`. Al escribir, usar
  `psycopg2.extras.Json(valor)` o un cast explícito `%s::jsonb`, no `json.dumps` a pelo en un
  `VALUES (%s)` sobre columna `jsonb`.

## 3. Un helper "que nunca lanza" haciendo `rollback()` sobre la conexión compartida borra el trabajo real del endpoint

- **Síntoma:** un `DELETE`/`UPDATE` devuelve HTTP 200 pero el cambio no se persistió.
- **Causa raíz:** `log_accion` (auditoría) atrapaba su propia excepción y hacía
  `conn.rollback()` sobre la **misma** conexión que el endpoint — revirtiendo el `DELETE` que
  el endpoint ya había ejecutado en esa transacción. Además, un `INSERT` fallido deja la
  transacción en estado *aborted*: todo lo que siga también falla.
- **Checklist accionable:** un helper que corre dentro de la transacción de un request y "no
  debe cortar el flujo" tiene que aislarse con `SAVEPOINT` / `ROLLBACK TO SAVEPOINT` y **nunca**
  tocar `commit`/`rollback` de la conexión (ver `backend/services/audit_service.py`). El
  commit/rollback de nivel de request lo maneja solo la dependencia de conexión.

## 4. Aprovisionamiento con una API externa no transaccional sin compensación completa deja huérfanos

- **Síntoma:** un correo queda "inutilizable" para invitar (siempre 502 "email exists"), o un
  usuario cuenta contra el cupo del plan aunque el admin cree que la invitación falló.
- **Causa raíz:** la secuencia `INSERT empresas + invitación → commit → Admin API createUser →
  generar enlace`. Si `createUser` tiene éxito (crea el `auth.users`, el trigger crea el
  perfil) pero un paso posterior falla, y la compensación solo borra la empresa/invitación,
  el `auth.users` queda huérfano — y la FK `usuarios.id → auth.users(id)` cascadea al revés
  (borrar el `auth.users` limpia el perfil, no al contrario).
- **Checklist accionable:** capturar el id que devuelve `createUser` y, en el `except`, hacer
  `eliminar_usuario(id)` best-effort **antes** de deshacer lo demás (ver `routers/bootstrap.py`
  y `routers/admin.py`). Nunca interpolar el error crudo de la API externa en el `detail` de
  la `HTTPException` (filtra URLs/detalles internos) — loguearlo y devolver un mensaje genérico.

## 5. CSS global sin `@layer` le gana a CUALQUIER utilidad de Tailwind, sin importar especificidad

- **Síntoma:** una regla CSS nueva y "obviamente menos específica" (p. ej. un selector de
  elemento simple como `button:not(:disabled)`) pisa una utilidad de Tailwind que debería ganar
  por estar más abajo en la cascada o ser más específica (p. ej. `.cursor-grab`).
- **Causa raíz:** Tailwind v4 organiza todo su CSS generado en capas (`@layer theme, base,
  components, utilities`). Por la especificación de CSS Cascade Layers, una declaración **sin
  capa** siempre gana sobre cualquier declaración **con capa**, sin importar especificidad ni
  orden en el archivo — no es "más específico gana", es "sin capa gana siempre". Pasó al
  agregar `button:not(:disabled) { cursor: pointer }` suelto en `index.css`: le quitaba el
  `cursor: grab` (que sí vive en `@layer utilities` vía la clase `.cursor-grab`) a las asas de
  arrastre del tablero de Proyectos.
- **Checklist accionable:** cualquier regla CSS nueva en `index.css` que deba convivir con
  utilidades de Tailwind (es decir, casi todas) va dentro de `@layer base { ... }` (o
  `components`/`utilities` según corresponda) — nunca suelta. Verificar en el navegador real
  con `getComputedStyle`, no solo leyendo el CSS fuente, porque el orden de capas no es
  visualmente obvio en el archivo compilado.

## 6. Combinar padding con shorthand (`p-4 sm:p-6`) y un lado explícito (`pt-[...]`) en el mismo elemento — el shorthand puede ganar sin avisar

- **Síntoma:** un cálculo que asume el valor de un `padding-top` explícito (p. ej. una variable
  CSS `calc(100vh - <padding real>)`) da un resultado equivocado en un rango de viewport
  específico, sin ningún error ni warning.
- **Causa raíz:** `AppLayout.tsx` combina `p-4 sm:p-6 lg:p-8` (shorthand de las 4 direcciones)
  con `pt-[calc(3.5rem+1rem)] lg:pt-20` (solo `padding-top`) en el mismo elemento. En el rango
  640-1023px, `sm:p-6` y `pt-[calc(...)]` tienen la misma especificidad (una clase), y
  `sm:p-6` sale **después** en el CSS generado por Tailwind — su `padding-top` implícito (parte
  del shorthand) gana, aunque el override explícito de `pt-` "se vea" más específico en el JSX.
- **Checklist accionable:** al construir cualquier cálculo (`calc()`, JS) que dependa del
  padding real de un elemento con mezcla de shorthand + lado explícito, **verificar contra el
  CSS compilado real** (`npx vite build` + inspeccionar el `dist/assets/*.css`, o
  `getComputedStyle` en el navegador) en cada breakpoint relevante — nunca asumir el valor
  "nominal" de la clase que se ve en el JSX. Si el elemento es compartido por toda la app (como
  `<main>` en `AppLayout.tsx`), preferir fijar el override explícito también en el breakpoint
  conflictivo (`sm:pt-[...]`) antes que ajustar cada consumidor externo al valor real.

## 7. Una función `async def` que llama código síncrono directo (SDK de IA, `psycopg2`) bloquea TODO el proceso, no solo esa petición

- **Síntoma:** con un solo usuario usando una función lenta (un turno de agente de IA con varias
  llamadas al modelo, por ejemplo), el resto de la aplicación se congela para TODOS los demás
  usuarios — cotizar, iniciar sesión, cualquier pantalla — mientras esa función está en curso.
  No hay ningún error ni excepción: todo simplemente deja de responder un rato.
- **Causa raíz:** el backend corre como un único proceso `uvicorn` (`ARQUITECTURA_MAESTRA.md`
  sección 3.4 — long-lived, no serverless, sin múltiples workers). Una función `async def` que
  llama directamente a una librería síncrona (el SDK `google-genai` con `client.models.generate_content(...)`,
  o cualquier consulta de `psycopg2`) sin envolverla en `await asyncio.to_thread(...)` bloquea el
  único hilo del event loop de `asyncio` — mientras esa llamada no retorna, ninguna otra corrutina
  del proceso entero puede avanzar, sin importar que sean requests de otros usuarios totalmente
  ajenos a esa función. Declarar la función `async def` no la vuelve asíncrona por sí sola: solo
  lo es el código que de verdad usa `await` sobre algo no bloqueante. Encontrado en el motor del
  Agente de IA (`backend/agente/runtime.py`, Objetivo 5) — la primera versión ejecutada llamaba a
  Gemini y a las conexiones RLS de forma síncrona dentro de un generador `async`.
- **Checklist accionable:** cualquier función `async def` que llame a una librería sin soporte
  nativo de `asyncio` (SDKs sin variante `.aio.*`, `psycopg2`, cualquier I/O bloqueante clásico)
  debe envolver esa llamada puntual en `await asyncio.to_thread(fn, *args)` — nunca invocarla
  directo. Verificar esto explícitamente para cualquier endpoint/generador nuevo que sea
  potencialmente lento (llamadas a modelos de IA, reportes pesados, PDFs grandes): la pregunta de
  auditoría correcta no es "¿la función es `async`?" sino "¿todo lo que hace dentro usa `await`
  sobre algo que de verdad libera el event loop?".
