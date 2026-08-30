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
