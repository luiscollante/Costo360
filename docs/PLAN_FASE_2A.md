# Plan — Fase 2.A del roadmap Costo360

**Ciclo `/goal` — documento vivo de ejecución.** Autor: Claude (sesión 2026-08-27).
Estado: **Fase 4 (ejecución) en curso.** Fase 1 (plan) ✅ · Fase 2 (auditoría Security
Engineer + Database Optimizer, "APRUEBA CON CAMBIOS", incorporados en la Parte II) ✅ ·
Fase 3 (aprobación del fundador + 3 decisiones) ✅.

> La fuente de verdad para la ejecución es la **Parte II** (revisión tras auditoría). La
> Parte I es el plan original; donde discrepen, manda la Parte II.

## Registro de ejecución (bloques)

- **B0 — Preflight** ✅ (2026-08-27)
  - Rama `goal/fase-2a-multitenant-auth` creada desde `master`.
  - Verificado en `hrmpyhixhbnkkpvxtuit` (ver II.5b): `postgres` con `BYPASSRLS` + miembro
    de `authenticated`; `authenticated` con DML en las 11 tablas; esquema `0001`/`0002`
    aplicado con RLS forzado; BD vacía; `empresa_actual()` `PARALLEL UNSAFE` (a corregir en
    `0003`); `pg_cron` NO instalado (confirma heartbeat sin cron); `jwt_exp`=3600.
  - Higiene git: **todos los `.env*` y `.vercel/*` están git-ignored y NUNCA fueron
    commiteados** (`git log --all --full-history` vacío) → no hay secretos que rotar.
  - Config de Supabase Auth (signup OFF, signing keys, Redirect URLs) = acción de dashboard
    pendiente antes de B6; no bloquea B1–B5.
  - Menor: 2 archivos vacíos de 0 bytes en la raíz (`(CURRENT_DATE`, `NOW()`) — restos de un
    redirect de shell; untracked; pendiente de borrar.
- **B1 — SQL `0003`/`0004`** ✅ (2026-08-27)
  - `0003_aprovisionamiento_sesion.sql` aplicado y probado end-to-end (DO block con
    rollback): C1 aprovisionamiento por invitación crea `usuarios` + marca invitación
    aceptada; C2 el trigger de cupo bloquea el 2º usuario en plan starter; C3 metadatos sin
    invitación válida → aborta; C4 OAuth sin metadatos → `auth.users` sin perfil (acceso
    cero). BD quedó limpia.
  - Contenido: `empresa_actual()` → `PARALLEL SAFE` + `search_path=''` cualificado; tabla
    `invitaciones` (+ índice único de invitación pendiente por email/empresa); trigger
    `on_auth_user_provisioned` (`handle_new_user`, fail-closed ruidoso, lee `raw_app_meta_data`);
    trigger `trg_usuarios_cupo_check` (`FOR UPDATE` sobre `empresas` para serializar);
    `sesion_activa` +5 columnas (`estado`+CHECK, `device_actual`, `retador`, `retador_desde`,
    `resuelto_en`) + storage params; tabla `folio_seq` (contador atómico de folios) + RLS.
  - `0004_revocar_execute_triggers.sql`: revoca `EXECUTE` de las 2 funciones de disparador
    (el linter las marcaba como RPC-invocables). Linter final: 1 sola advertencia esperada
    (`empresa_actual()` ejecutable por `authenticated`, intencional, documentada en `0002`).
  - **Cambio vs. plan:** el catálogo de materiales NO se siembra por migración —
    `seed_materiales.json` tiene 10 pares `(categoría, referencia)` duplicados en 255 filas,
    así que no admite `UNIQUE` sin una decisión de datos del fundador. Se hará con un script
    de recarga autoritativa (`backend/seed_catalogo.py`) en B3/B8. No hay `0004` de seed.
- **B2 — Backend auth core** ✅ (2026-08-27)
  - `db/client.py`: `db_service()` (rol postgres/BYPASSRLS — solo auth/aprovisionamiento/
    admin/sesión) y `db_rls(user=Depends(get_current_user))` (fija `request.jwt.claims` +
    `SET LOCAL ROLE authenticated`, **asertando** `current_user='authenticated'` o aborta 500
    — hallazgo C2). Alias temporal `db_conn = db_service` para routers no migrados (B3 lo quita).
  - `middleware/auth.py`: `get_current_user` verifica el JWT por **JWKS ES256**
    (`PyJWKClient`, `algorithms=["ES256"]`, `aud='authenticated'`, `iss=<SUPABASE_URL>/auth/v1`,
    `leeway=30`, `require exp+sub`, `sub` validado como UUID). Carga el perfil (empresa_id,
    rol_codigo, 4 capacidades, activo, nombre) vía `db_service`, **sin caché**. Sin fila → 403;
    `activo=false` → 403. Verificado contra el JWKS real del proyecto (kid `8c000f0f…`, ES256).
  - `models/auth.py`: `UsuarioOut` con `id: str`, `empresa_id`, `rol_codigo`, capacidades.
    Quitados `LoginRequest`/`TokenOut`.
  - `routers/auth.py`: reducido a `GET /api/auth/me`. `routers/admin.py`: stub (B4 lo rehace).
  - `services/auth_service.py`: **eliminado** (PIN/hash/sesiones propias).
  - `main.py`: `lifespan` sin `_CREATE_TABLES_SQL` ni seeds — ahora corre `_self_test_rls()`
    (conectividad + `rolbypassrls` del rol de conexión + `SET LOCAL ROLE authenticated` real
    + `cotizaciones` = 0 filas sin claims + rechazo de `:6543`). CORS: `allow_credentials=False`,
    orígenes solo localhost, header `X-Device-Id` (quitado `X-Session-Token`). `finanzas.router`
    desregistrado.
  - `requirements.txt`: `+pyjwt[crypto]`. `backend/ENV_SETUP.md`: nuevo (variables + checklist
    de dashboard de Supabase Auth).
  - Import-check OK de los 12 routers + helpers con Python 3.14/venv. La verificación en vivo
    (self-test contra la BD) necesita `backend/.env` con la cadena del proyecto nuevo +
    `SUPABASE_SERVICE_ROLE_KEY` → **acción del fundador antes de B8**.
- **B3 — Routers a `db_rls` + capacidades + atomicidad** ✅ (2026-08-27)
  - `db/config_helpers.py`: `cfg_get(conn, empresa_id, key)` con typecheck (no `json.loads`
    sobre jsonb — hallazgo D2); `cfg_set(conn, empresa_id, key, val)` UPSERT sobre
    `(empresa_id, clave)` vía `psycopg2.extras.Json`, **sin `commit()`** (D7).
  - `services/audit_service.py`: `log_accion(..., *, empresa_id, usuario_id, ip)` con
    **SAVEPOINT** y sin tocar commit/rollback de la conexión compartida (D1).
  - `db/deps.py`: reescrito a capacidades — `require_gestion_usuarios`, `require_dashboard`,
    `require_datos_agregados_agente`, y `scope_propio(usuario)` que centraliza el aislamiento
    jerárquico interno (Regla 2 / S17).
  - `db/client.py`: eliminado el alias `db_conn`.
  - Routers migrados a `db_rls` y sin `commit()` intermedios: `cotizacion`, `dashboard`,
    `retales`, `inventario`, `parametros`, `config`, `materiales`, `agente`. `nesting` (no
    usa BD) — se le quitó la dependencia de conexión. `calculos` sin cambios (no BD).
  - `_siguiente_numero` → contador atómico `folio_seq` (`INSERT ... ON CONFLICT DO UPDATE
    ... RETURNING`), scope por empresa (D4). Todos los `INSERT` de datos incluyen ahora
    `empresa_id` (obligado por `WITH CHECK` de RLS).
  - `dashboard` pasa a estar gateado por `require_dashboard` (Regla 6: Operativo no accede);
    se eliminó la rama "solo lo propio" de ahí. `historial`/`retales listar` conservan
    `scope_propio` (Regla 2). `parametros`/`config` de escritura → `puede_ver_dashboard`
    (admin+gerencia).
  - Quitados los defaults del taller piloto (`"Mármoles Collante & Castro Ltda"`,
    `"Barranquilla"`) de `config.py` — cada empresa parte de valores vacíos.
  - `finanzas.py` desconectado con nota de cabecera (no lo importa `main.py`; no compila
    contra el `db/*` nuevo, se conserva como referencia — R7).
  - Import-check + `py_compile` OK de los 12 routers + core con Python 3.14/venv.
- **B4 — Aprovisionamiento + gestión de usuarios** ✅ (2026-08-27)
  - `services/supabase_admin.py`: cliente `httpx` de la Admin API de GoTrue
    (`crear_usuario` con `app_metadata` en un paso → dispara `handle_new_user`;
    `generar_enlace` recovery; `eliminar_usuario`; `cerrar_sesiones` best-effort).
  - `routers/bootstrap.py`: `POST /api/bootstrap/empresa` protegido por
    `X-Bootstrap-Secret` (comparación en tiempo constante, 503 si la env está vacía,
    rate-limit 10/h). Secuencia con compensación: `INSERT empresas`+invitación → commit
    → `crear_usuario` → si falla, `DELETE empresas` (cascada). Registrado en `main.py`.
  - `routers/admin.py` reconstruido (`require_gestion_usuarios` = capacidad
    `puede_gestionar_usuarios`, solo `admin`):
    - `GET /usuarios` (join a `auth.users` para el email, vía `db_service` con
      `WHERE empresa_id = %s` explícito — hallazgo S2),
    - `GET /invitaciones` (pendientes, vía `db_rls`),
    - `POST /usuarios` (invitar `gerencia`/`operativo` — nunca `admin`; pre-chequeo de
      cupo + el trigger como enforcement real; rate-limit 20/h; compensación si la
      Admin API falla),
    - `PATCH /usuarios/{uid}` (nombre/cargo/rol/activo; nunca sobre el `admin` ni la
      propia cuenta; al desactivar o degradar → `cerrar_sesiones` best-effort, S14),
    - `DELETE /usuarios/{uid}` (borra el `auth.users` → cascada; nunca el `admin`).
  - `models/admin.py`: **eliminado** (modelos viejos con `id:int`).
  - `seed_catalogo.py`: nuevo — recarga autoritativa de `catalogo_materiales` desde el
    JSON (se ejecuta en B8).
  - Import-check OK. 13 routers registrados.
  - Pendiente/nota: scripts sueltos de `backend/` (`check_schema.py`, `seed_parametros.py`,
    `download_pdf.py`, `fix_c.py`, `refactor_pdf.py`, `test_pdf.py`) quedan obsoletos o
    con imports rotos contra el `db/*` nuevo — no se limpian en esta fase (no los usa
    la app).
- **B5 — Backend sesión única (Regla 5)** ✅ (2026-08-27)
  - `middleware/auth.py`: `_PERFIL_SQL` con `LEFT JOIN sesion_activa` → `get_current_user`
    devuelve `_session_device_id` y `_session_estado` (sin conexión extra — misma query).
  - `db/deps.py`: `verificar_dispositivo(usuario, X-Device-Id)` — dependencia **pura**
    (sin BD): sin fila de sesión → permite (recién logueado); coincide → permite (incluye
    al titular durante `takeover_pendiente`); no coincide → **409 `SESSION_SUPERSEDED`**.
    Aplicada a nivel de router en los 11 routers de datos + `admin` (NO en `auth`/`session`/
    `bootstrap`).
  - `routers/session.py` (`/api/auth/session/*`, todo por `db_service`, transiciones con
    `UPDATE ... WHERE estado=<esperado>` + `rowcount`, `FOR UPDATE` en `claim` — S6/D10):
    - `POST /claim` (`{device}`, `?force=`): crea la sesión / la reafirma / inicia
      `takeover_pendiente` / permite forzar tras `GRACE`=30 s / cede el relevo si el retador
      anterior venció (`TIMEOUT`=90 s) / `busy` en el caso de 3 dispositivos.
    - `POST /keep` — el titular conserva y rechaza el intento.
    - `POST /handoff` — el titular cede al retador.
    - `POST /heartbeat` — polling del cliente: resuelve el timeout perezoso (cede a B si el
      titular nunca respondió), refresca `ultimo_uso` con throttle 60 s, devuelve el estado
      (`mine`, `am_i_retador`, etiquetas) para que el frontend muestre el aviso.
    - `POST /logout` — borra la fila.
  - **Limitación documentada (S5):** la expulsión se hace cumplir con el 409 de
    `verificar_dispositivo` (GoTrue no revoca la sesión de UN dispositivo). El `device.id`
    es de 128 bits y nunca se loguea → el 409 no es evadible en la práctica. "Sesión única
    cooperativa": con el titular offline, la cesión a B es silenciosa por diseño.
  - Import + `py_compile` OK. 14 routers registrados.
- **B6 — Frontend auth** ✅ (2026-08-27)
  - `@supabase/supabase-js@2.112` instalado.
  - `lib/supabaseClient.ts`: cliente Supabase, `flowType:'pkce'`, storage adapter a
    `@capacitor/preferences` en el APK. `lib/deviceId.ts`: id de dispositivo de 128 bits
    (`crypto.getRandomValues`), persistente, nunca en logs.
  - `store/auth.ts` reescrito: `session` (bool) + `usuario` (de `/api/auth/me`) + `refresh()`;
    ya no guarda token (lo tiene supabase-js).
  - `api/client.ts`: interceptor pone `Authorization: Bearer <access_token de supabase>` +
    `X-Device-Id`; en 401 reintenta 1 vez con `refreshSession()`; en 409
    `SESSION_SUPERSEDED` emite un evento de ventana.
  - `api/auth.ts`: `Usuario` con `id:string`, `empresa_id`, `rol_codigo`, 4 capacidades.
  - `pages/LoginPage.tsx`: correo+contraseña (`signInWithPassword`), "Continuar con Google"
    (`signInWithOAuth`), "¿Olvidaste tu contraseña?" (`resetPasswordForEmail`).
  - `pages/ResetPasswordPage.tsx`: nuevo — define contraseña tras el enlace de
    invitación/recuperación (`updateUser({password})`). Ruta `/reset-password` añadida.
  - `PrivateRoute`/`AdminRoute` sobre `session`+`usuario` (`puede_gestionar_usuarios`).
  - `App.tsx`: `onAuthStateChange` → `refresh()`; `getDeviceId()` al arrancar.
  - `api/admin.ts` + `pages/AdminPage.tsx` reescritos al modelo de invitación
    (email + `rol_codigo` `gerencia`/`operativo` + `cargo_visible` + `activo`; muestra el
    enlace de "define tu contraseña"; lista invitaciones pendientes).
  - Ajustes: `Sidebar.tsx` (`puede_gestionar_usuarios`, logout con `supabase.auth.signOut`),
    `ParametrosPage.tsx` (`puede_ver_dashboard`), `DashboardPage.tsx` (sin `username`).
  - `web/ENV_SETUP.md`: nuevo (vars + checklist de dashboard).
  - **`tsc -b` limpio + `npm run build` OK.**
- **B7 — Frontend sesión única** ✅ (2026-08-27)
  - `api/session.ts`: `claim`/`keep`/`handoff`/`heartbeat`/`logout` con payload de
    dispositivo (id + label + plataforma).
  - `components/SessionGuard.tsx`: montado en el área privada. Reclama la sesión al entrar;
    poll de `heartbeat` cada 15 s; overlay con los estados: reclamando · esperando (con
    "Forzar" tras 30 s de gracia) · aviso al titular ([Mantener aquí]/[Permitir]) ·
    expulsado (cierra sesión). Escucha el evento `costo360:session-superseded` de `client.ts`.
  - `App.tsx`: `<SessionGuard />` dentro de `Private` y de la ruta `/admin`.
  - **`tsc -b` limpio + `npm run build` OK.**
- **B8 — Verificación en vivo (bloqueante)** ⬜

---

---

## 0. Objetivo (según las 3 decisiones del fundador, 2026-08-27)

1. **Migrar la autenticación del prototipo `web/`+`backend/` a Supabase Auth** (correo + Google,
   enlaces nativos de invitación/restablecimiento, `id` de usuario = UUID de `auth.users`).
   Se retira por completo el login propio (usuario+contraseña, tabla `sesiones`, PIN,
   header `X-Session-Token`).
2. **El backend del prototipo pasa a apuntar al proyecto Supabase nuevo** (`hrmpyhixhbnkkpvxtuit`,
   organización "Costo360", el que ya tiene el esquema multi-tenant `0001`+`0002`). Sin migrar
   datos. Se siembra **una empresa de prueba + su Admin**.
3. **`backend/db/client.py`**: las consultas de datos de negocio corren bajo el JWT del usuario
   para que RLS aísle de verdad por empresa; las operaciones de aprovisionamiento/gestión de
   usuarios corren con rol de servicio.
4. **Disparador de aprovisionamiento**: cuando nace un `auth.users`, se crea su fila en
   `public.usuarios` con `empresa_id` + `rol_codigo` desde los metadatos de la invitación/alta.
5. **Regla 5 (sesión única con aviso real) — implementación completa**: detectar segundo
   dispositivo, avisar al que ya tenía la sesión, y dejar que el usuario legítimo elija cuál
   conserva.

**Fuera de alcance de esta fase:** rediseño visual (es la Fase 2.A siguiente del roadmap),
integración de checkout/pagos real, migrar la app Streamlit legada (no se toca — sigue en
producción sobre el proyecto Supabase viejo `dilskbvmvywqohtswzdw`).

---

## 1. Estado actual verificado en código (2026-08-27)

### Backend (`backend/`)
- **Auth propio.** `routers/auth.py`: `POST /api/auth/login` (username + password PBKDF2),
  `POST /api/auth/recover` (PIN 4–6 díg., bloqueo a los 5 fallos/hora), `GET /api/auth/me`,
  `POST /api/auth/logout`, `POST /api/auth/logout-all`.
- **Sesión.** `services/auth_service.py`: token UUID4 en tabla `sesiones`, expiración 48 h,
  ventana deslizante de 8 h. `middleware/auth.py::get_current_user` lee `X-Session-Token`,
  valida contra `sesiones` + `usuarios`, actualiza `ultimo_uso` (throttle 1 min).
- **`usuarios.id` es `SERIAL` (int)** en todo el código actual. `sesiones.usuario_id`,
  `cotizaciones.usuario_id`, `inventario_*.usuario_id`, `inventario_retales.usuario_id`,
  `audit_log.usuario_id` → todos `INTEGER`.
- **Conexión BD.** `db/client.py`: un solo `create_engine(DATABASE_URL, pool_size=5, ...)`;
  `db_conn()` entrega `engine.raw_connection()` (psycopg2 crudo) como dependencia FastAPI.
  Un solo rol de conexión. Apunta al proyecto viejo (mismo `DATABASE_URL` que el legado).
- **`main.py::lifespan`** ejecuta `_CREATE_TABLES_SQL` (CREATE TABLE IF NOT EXISTS de `usuarios`
  int-id, `sesiones`, `audit_log` int-id, `cotizaciones`, `app_config` singleton,
  `inventario_*`, `catalogo_materiales` con default `'Gramar'`, **`facturas_compra`,
  `correos_procesados`** — las dos que el fundador confirmó que NO son de Costo360), siembra
  `catalogo_materiales` desde `seed_materiales.json`, siembra parámetros, y crea un admin por
  defecto (`username='admin'`, `rol='Admin'`).
- **Roles en código:** cadenas `"Admin"` / `"Gerente"` / `"Operario"`.
  `db/deps.py::require_admin` (`rol != "Admin"` → 403), `require_admin_or_gerente`.
  Checks de rol dispersos en `cotizacion.py` (filtra por `usuario_id` si `rol == "Operario"`;
  permite borrar de otros si `rol in ("Admin","Gerente")`), `dashboard.py` (`solo_propio` si
  Operario), `retales.py` (idem), `parametros.py` (`set` solo Admin/Gerente).
- **`admin.py`** CRUD de usuarios con `uid: int` en el path, escribe `username`/`password_hash`/
  `pin_recuperacion`/`rol` directo en `usuarios`, borra `sesiones` del usuario.
- **`cotizacion.py::_siguiente_numero`** cuenta `cotizaciones` global por año+prefijo
  (`COT-2026-0001`). Sin scope por empresa.
- **`app_config`** es singleton global (`clave` PK). `db/config_helpers.py::cfg_get` lo lee.
  Lo usan `config.py`, `parametros.py`, `cotizacion.py`.
- **Sin ninguna referencia a Supabase ni JWT** en `backend/*.py` (solo dentro de `venv/`).
- `requirements.txt`: no tiene `pyjwt`, `supabase`, ni `python-jose`.
- Hay varios `.env*` en `backend/` (`.env`, `.env.local`, `.env.prod.vercel`, `.env.vercel`,
  `.vercel/.env.production.local`) — no se leyeron (secretos). Todos apuntan hoy al proyecto viejo.

### Frontend (`web/`)
- `src/api/client.ts`: axios, interceptor pone `X-Session-Token` desde `useAuthStore`.
  En 401 → `clearSession()` + redirect `/login`.
- `src/api/auth.ts`: `login(username,password)`, `logout()`, `getMe()`. `Usuario.id: number`.
- `src/store/auth.ts` (zustand): `token` + `usuario` en `sessionStorage` (web) o
  `@capacitor/preferences` (APK Android). `setSession`/`clearSession`/`hydrate`.
- `src/pages/LoginPage.tsx`: formulario usuario+contraseña, sin Google, sin "olvidé mi contraseña".
- `src/components/PrivateRoute.tsx`: gate por `token`. `AdminRoute.tsx`: gate por
  `usuario?.rol !== 'Admin'`.
- `src/App.tsx`: `<AuthGate>` (hidrata Preferences en APK) → `<BrowserRouter>` con 11 rutas
  privadas + `/admin` (AdminRoute) + `/` (landing) + `/login`.
- `package.json`: **no** tiene `@supabase/supabase-js`. Sí tiene Capacitor, react-query,
  react-hook-form+zod, `qrcode.react`.

### Esquema nuevo (ya aplicado en Supabase `hrmpyhixhbnkkpvxtuit`)
- `backend/migrations/0001_esquema_multitenant.sql` + `0002_revocar_anon_empresa_actual.sql`.
- `usuarios.id uuid PRIMARY KEY REFERENCES auth.users(id)`, `empresa_id uuid NOT NULL`,
  `rol_codigo text REFERENCES roles_catalogo(codigo)` (`admin`/`gerencia`/`operativo`),
  `cargo_visible`, `nombre_completo`, `activo`.
- `roles_catalogo` con 4 capacidades booleanas: `puede_ver_dashboard`,
  `puede_usar_modo_bi_senior`, `puede_pedir_datos_agregados_agente`, `puede_gestionar_usuarios`.
- RLS `FORCE` en todas; políticas usan `empresa_actual()` = `SELECT empresa_id FROM usuarios
  WHERE id = auth.uid()` (SECURITY DEFINER, STABLE, `search_path=public`).
- **Sin policy de UPDATE/INSERT/DELETE en `usuarios` y `empresas` para usuarios normales** —
  a propósito (anti-autoescalación). Esas escrituras van por rol de servicio.
- `cotizaciones`: `unique (empresa_id, numero)` (ya no global).
- `app_config`: PK `(empresa_id, clave)`, `valor jsonb`.
- `audit_log`: `empresa_id uuid NOT NULL`, `usuario_id uuid`.
- `sesion_activa (usuario_id uuid PK, device_hint text, iniciada_en, ultimo_uso)` — placeholder.
- Sección 9 del `0001`: el trigger de aprovisionamiento está marcado como pendiente (esta fase).

---

## 2. Arquitectura objetivo

### 2.1 Autenticación
- **Frontend** usa `@supabase/supabase-js`: `supabase.auth.signInWithPassword`,
  `signInWithOAuth({provider:'google'})`, `resetPasswordForEmail`, `onAuthStateChange`.
  El `access_token` (JWT) de la sesión de Supabase se guarda vía el cliente supabase-js
  (localStorage por defecto; en APK, adaptador a `@capacitor/preferences`).
- `client.ts` cambia el interceptor: `Authorization: Bearer <supabase access_token>`
  (obtenido de `supabase.auth.getSession()`), y auto-refresh cuando expira.
- **Backend** `middleware/auth.py::get_current_user`:
  1. Lee `Authorization: Bearer`.
  2. Verifica el JWT con el secreto del proyecto (HS256) — `exp`, `aud='authenticated'`.
     (Se contempla también el modo de claves asimétricas/JWKS como alternativa — decisión en
     Fase 3; por defecto, secreto HS256 `SUPABASE_JWT_SECRET`.)
  3. `sub` = UUID del usuario. Con una **conexión de rol de servicio**, carga de `usuarios`
     JOIN `roles_catalogo`: `empresa_id`, `rol_codigo`, `nombre_completo`, `activo`, y las 4
     capacidades. Si no hay fila (`activo=false` o no aprovisionado) → 401/403.
  4. Devuelve un dict con `id` (uuid str), `empresa_id`, `rol_codigo`, capacidades,
     `nombre_completo`, y `jwt_claims` (para el path RLS).
- Se **elimina**: `routers/auth.py` login/recover/logout-all propios, `services/auth_service.py`
  (hash/pin/sesiones), `middleware/auth.py` viejo, tabla `sesiones` (no se recrea).
  `routers/auth.py` queda con: `GET /api/auth/me` (perfil enriquecido) y los endpoints de
  sesión única (§2.4).

### 2.2 Conexión a BD y enforcement de RLS
`db/client.py` expone **dos** dependencias:

- **`db_service()`** — conexión del pool tal cual (rol `postgres`/service, `BYPASSRLS`).
  Uso: `get_current_user` (cargar perfil), aprovisionamiento, gestión de usuarios (`admin.py`),
  alta de empresas, lógica de `sesion_activa`. El código valida el permiso en Python
  (`puede_gestionar_usuarios`) antes de escribir.

- **`db_rls(user=Depends(get_current_user))`** — conexión del pool + al entrar:
  ```sql
  BEGIN;
  SELECT set_config('request.jwt.claims', :claims_json, true);  -- claims con sub, role, empresa_id opcional
  SET LOCAL ROLE authenticated;
  ```
  se hace `yield conn`; al salir `COMMIT` (o `ROLLBACK` en excepción). Como `SET LOCAL` y
  `set_config(..., is_local=true)` son de transacción, la conexión vuelve limpia al pool.
  Uso: **todos** los routers de datos de negocio (cotizacion, dashboard, historial, retales,
  inventario, parametros, config, materiales, nesting, agente, finanzas).

- Requisito duro: **todo el trabajo de BD de un request bajo `db_rls` ocurre en UNA sola
  transacción.** Hoy varios routers llaman `conn.commit()` a mitad de request → hay que
  quitar esos commits intermedios y dejar que la dependencia haga el commit final.
  Lista de routers a revisar por esto: `cotizacion.py` (múltiples `cur`/`commit`),
  `retales.py`, `inventario.py`, `nesting.py`, `parametros.py`, `config.py`.

- `empresa_actual()` sigue resolviendo porque `auth.uid()` lee el GUC `request.jwt.claims`,
  independiente del rol; tras `SET LOCAL ROLE authenticated` la conexión pierde `BYPASSRLS`
  y las políticas aplican.

- `DATABASE_URL` en `backend/.env*` → cadena del proyecto nuevo (`hrmpyhixhbnkkpvxtuit`),
  rol `postgres` vía pooler de sesión (no el transaction pooler — necesitamos `SET LOCAL`
  y transacciones multi-statement, el transaction pooler de Supabase no lo garantiza).

### 2.3 Aprovisionamiento (`0003_aprovisionamiento.sql`)
- Función `public.handle_new_user()` `SECURITY DEFINER`, `search_path=public`:
  lee `NEW.raw_user_meta_data->>'empresa_id'` y `->>'rol_codigo'`; si ambos presentes,
  `INSERT INTO public.usuarios (id, empresa_id, rol_codigo, nombre_completo)
   VALUES (NEW.id, ..., ..., NEW.raw_user_meta_data->>'nombre_completo')`.
  Si faltan metadatos → no inserta (el usuario queda sin fila → acceso CERO, fail-closed,
  ya contemplado en el `0001`).
- Trigger `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW`.
- Índice único `ux_un_admin_por_empresa` ya existe → si se intenta un segundo admin, el
  INSERT falla; el flujo de invitación nunca pasa `rol_codigo='admin'`.
- **Alta de empresa** (operada por el fundador, prototipo): endpoint
  `POST /api/bootstrap/empresa` protegido por `X-Bootstrap-Secret` (env `BOOTSTRAP_SECRET`),
  con `db_service`:
  1. `INSERT INTO empresas (nombre, nit, plan_codigo) RETURNING id`.
  2. Llama a la Admin API de Supabase (`auth.admin.createUser` / `inviteUserByEmail`) con
     `user_metadata = {empresa_id, rol_codigo:'admin', nombre_completo}`.
  3. El trigger crea la fila en `usuarios`.
  Requiere `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` en el backend.
- **Invitar usuarios de una empresa** (Admin, dentro de la app): `POST /api/admin/usuarios`
  con `db_service`, valida `puede_gestionar_usuarios`, valida cupo del plan
  (`SELECT cupo_usuarios FROM planes` vs `COUNT(*) usuarios WHERE empresa_id`), llama
  `inviteUserByEmail` con metadatos `{empresa_id, rol_codigo}` (`gerencia`/`operativo`).
- **Semilla de prueba** (`backend/migrations/0004_seed_prueba.sql` o script):
  1 `empresas` ("Taller Demo", plan `pro`) + 1 `auth.users` admin vía Admin API +
  siembra `catalogo_materiales` (mover `seed_materiales.json` a un seed idempotente).

### 2.4 Sesión única con aviso real (Regla 5) — `0003` agrega columnas a `sesion_activa`
Nuevas columnas: `estado text NOT NULL DEFAULT 'activa'` (`'activa'|'takeover_pendiente'`),
`device_actual jsonb` (label, user agent, plataforma, id aleatorio de dispositivo generado
en el cliente y guardado en storage local), `retador jsonb`, `retador_desde timestamptz`,
`resuelto_en timestamptz`.

Máquina de estados (todo vía `db_service`, backend valida contra `sub` del JWT):

1. **Login en dispositivo B** → `POST /api/auth/session/claim` con `{device}`.
   - No hay fila / fila del mismo `device.id` → `UPSERT estado='activa', device_actual=B`.
     Respuesta `{status:'active'}`.
   - Hay fila `activa` de A (device distinto) → `UPDATE estado='takeover_pendiente',
     retador=B, retador_desde=now()`. Respuesta `{status:'pending', prev_device:A.label}`.
     B queda en pantalla "Esperando confirmación del otro dispositivo…" con opción
     "Forzar cierre" tras `GRACE` (p. ej. 30 s).
2. **Dispositivo A** está suscrito por **Supabase Realtime** a su fila de `sesion_activa`
   (frontend añade supabase-js, canal `postgres_changes` filtrado por `usuario_id`).
   Al ver `estado='takeover_pendiente'` muestra modal:
   "Se intentó iniciar sesión en «B». ¿Qué quieres hacer?" → [Mantener aquí] / [Permitir «B»].
   Con cuenta regresiva visible de `GRACE+timeout`.
   - **[Mantener aquí]** → `POST /api/auth/session/keep` → `UPDATE estado='activa',
     retador=NULL`. B, al hacer polling / recibir realtime, ve `denied` → `signOut()` +
     mensaje "El otro dispositivo mantuvo la sesión".
   - **[Permitir «B»]** o **timeout** → `POST /api/auth/session/handoff` (o el job de
     expiración) → `UPDATE estado='activa', device_actual=B, retador=NULL`.
     A recibe realtime → `signOut()` + "Tu sesión se movió a “B”".
3. **Forzar desde B** (tras `GRACE`, si A no respondió) → `POST
   /api/auth/session/claim?force=true` → si `retador_desde` + `GRACE` ya pasó y sigue
   `takeover_pendiente` → `UPDATE device_actual=B, estado='activa'`. A recibe realtime → signOut.
4. **Dependencia `verificar_dispositivo`** (se compone dentro de `get_current_user` o como
   dependency aparte en las rutas de datos): compara un header `X-Device-Id` del cliente
   contra `sesion_activa.device_actual->>'id'`. Si no coincide y `estado='activa'` → 409
   `SESSION_SUPERSEDED`; el `client.ts` intercepta 409 con ese código → `signOut()` + redirect.
5. `ultimo_uso` se refresca con throttle (1 min) igual que hoy.
6. `POST /api/auth/logout` → `supabase.auth.signOut()` en el cliente + `DELETE FROM
   sesion_activa WHERE usuario_id = sub` en el backend.

**Nota de diseño para auditar:** el "timeout" que resuelve el takeover si A nunca responde
necesita un actor. Opción propuesta: resolución **perezosa** en el propio endpoint
`claim?force=true` / en cada request de B (si `now() > retador_desde + TIMEOUT` y sigue
pendiente → handoff automático a B). Evita un cron. Alternativa: `pg_cron`. Decisión en Fase 3.

### 2.5 Mapeo de roles y capacidades
- `get_current_user` devuelve `rol_codigo` (`admin`/`gerencia`/`operativo`) + capacidades.
- Se reescriben los checks:
  - `db/deps.py::require_admin` → `require_gestion_usuarios` (`puede_gestionar_usuarios`).
  - `require_admin_or_gerente` → `require_dashboard` (`puede_ver_dashboard`) para finanzas/BI.
  - `cotizacion.py` / `dashboard.py` / `retales.py`: "ver solo lo propio" cuando
    `rol_codigo == 'operativo'`; "ver todo de la empresa" cuando `puede_ver_dashboard`.
    (El aislamiento por empresa ya lo garantiza RLS; este check es el aislamiento
    jerárquico **dentro** de la empresa — Regla 2.)
  - `parametros.py::set` → permitir a `admin`+`gerencia` (o crear capacidad
    `puede_editar_parametros` en `roles_catalogo` — decisión menor, Fase 3).

### 2.6 `usuarios.id` int → uuid (arrastre)
- Backend: `usuario["id"]` pasa a ser str UUID; psycopg2 lo inserta en las columnas `uuid`
  sin cambios. `admin.py`: `uid: int` → `uid: str` (validar formato UUID con pydantic).
- Modelos: `models/auth.py::UsuarioOut.id: int` → `str`; `models/admin.py` igual.
- Frontend: `api/auth.ts::Usuario.id: number` → `string`; `AdminRoute` compara
  `rol` → `rol_codigo === 'admin'`; `AdminPage` tipos.

### 2.7 `main.py`
- **Quitar** `_CREATE_TABLES_SQL` entero y el bloque de seed de admin/parámetros/catálogo del
  `lifespan` (el esquema lo gobiernan las migraciones de Supabase, no la app).
  Verificado: nada en runtime depende de que `lifespan` cree tablas — solo era bootstrap.
- El seed de `catalogo_materiales` pasa a `0004_seed_prueba.sql` (idempotente,
  `INSERT ... WHERE NOT EXISTS`).
- CORS: quitar `X-Session-Token` de `allow_headers`; añadir `X-Device-Id`. Mantener
  `Authorization`. Revisar la lista de `allow_origins` (quitar dominios del legado si aplica —
  decisión menor).
- `finanzas.py` / `etl_service` / `ia_facturas` operan sobre `facturas_compra` (tabla que NO
  es de Costo360). **Decisión Fase 3:** desregistrar `finanzas.router` del prototipo nuevo
  (queda muerto contra el proyecto nuevo, que no tiene esa tabla) o dejarlo aislado. Propuesta:
  desregistrarlo de `main.py` en esta fase y anotarlo.

### 2.8 Dependencias nuevas
- Backend `requirements.txt`: `pyjwt[crypto]`, `supabase` (para la Admin API; o usar `httpx`
  directo contra `/auth/v1/admin` — decisión menor, propongo `httpx` para no sumar SDK).
- Frontend `package.json`: `@supabase/supabase-js`.

---

## 3. Orden de ejecución (bloques, un micro-commit por bloque)

> Cada bloque compila (`tsc -b` / import de FastAPI) aunque el sistema completo no sea
> desplegable hasta el bloque 6. El prototipo NO está en producción → sin impacto externo.

- **B0 — Preparación y verificación.**
  Verificar (Supabase MCP) que `0001`/`0002` están aplicados en `hrmpyhixhbnkkpvxtuit` y que
  `auth` está habilitado (Google provider + email). Crear rama git. Anotar en
  `PATRONES_DE_ERROR.md` si aparece algo. Micro-commit: rama + notas.

- **B1 — Migración SQL `0003` (aprovisionamiento + columnas de `sesion_activa`) y `0004`
  (seed de prueba).** Escribir los `.sql`, aplicarlos vía Supabase MCP, verificar.
  Commit `wip(goal): 0003 aprovisionamiento + 0004 seed`.

- **B2 — Backend auth core.** `db/client.py` (dos dependencias), `middleware/auth.py`
  (verificación JWT + carga de perfil), `models/auth.py`, `routers/auth.py` (dejar `/me`),
  borrar `services/auth_service.py`, quitar `_CREATE_TABLES_SQL` de `main.py`, CORS,
  `requirements.txt`. Commit.

- **B3 — Backend routers a `db_rls` + capacidades.** Reescribir `db/deps.py`; pasar todos los
  routers de datos a `db_rls`; quitar `commit()` intermedios; reemplazar checks de rol por
  capacidades; `usuario_id` uuid; `_siguiente_numero` con scope de empresa;
  `app_config` con `empresa_id` (via RLS ya filtra, pero las queries que hacen `WHERE clave=`
  necesitan también `empresa_id` en el INSERT/UPSERT). Desregistrar `finanzas.router`. Commit.

- **B4 — Backend aprovisionamiento + gestión de usuarios.** `POST /api/bootstrap/empresa`,
  `routers/admin.py` reescrito (invitar/editar/desactivar vía Admin API + `db_service`,
  validación de cupo por plan). Commit.

- **B5 — Backend sesión única.** Endpoints `session/claim|keep|handoff|logout`, dependencia
  `verificar_dispositivo`, resolución perezosa del timeout. Commit.

- **B6 — Frontend auth.** `@supabase/supabase-js`, `lib/supabaseClient.ts` (con adaptador de
  storage para APK), `store/auth.ts` reescrito sobre la sesión de Supabase, `api/client.ts`
  (Bearer + refresh + intercept 409), `api/auth.ts`, `LoginPage.tsx` (correo+contraseña +
  botón Google + "olvidé mi contraseña"), página de restablecimiento, `PrivateRoute`/
  `AdminRoute`/`App.tsx` (`rol_codigo`). Commit.

- **B7 — Frontend sesión única.** Suscripción Realtime a `sesion_activa`, modal de takeover,
  pantalla "esperando confirmación" en el dispositivo retador, generación/almacenamiento del
  `device.id`, header `X-Device-Id` en `client.ts`. Commit.

- **B8 — Verificación en vivo.** Levantar backend contra el proyecto nuevo + frontend;
  probar: alta de empresa demo, login por correo, login Google, invitar un `operativo`,
  aislamiento (usuario de empresa A no ve datos de empresa B — crear 2 empresas de prueba),
  jerarquía interna (operativo solo ve lo suyo), sesión única (2 navegadores), restablecer
  contraseña. Commit de ajustes.

---

## 4. Riesgos identificados

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | `SET LOCAL ROLE authenticated` + `set_config` requiere que **todo el request** vaya en una transacción; hoy hay `commit()` intermedios. Si se omite alguno, o el pooler es el "transaction pooler", RLS puede no aplicarse o romper el request. | Auditar router por router (lista en §2.2). Usar el **session pooler** (puerto 5432), no el transaction pooler. Test explícito en B8: un usuario de empresa A intentando leer una cotización de empresa B debe recibir 0 filas. |
| R2 | Si `get_current_user` carga el perfil con `db_service` (BYPASSRLS) y por error alguna query de datos también usa `db_service`, se filtra entre empresas sin aviso. | Regla: `db_service` SOLO en auth/aprovisionamiento/admin/sesión. Revisión de la Fase 5 (agentes distintos) enfocada en esto. Grep de `db_service` en routers de datos = debe ser vacío. |
| R3 | El JWT de Supabase expira (~1 h). Si el front no refresca, el usuario "se cae" a mitad de trabajo. | supabase-js hace auto-refresh; `client.ts` reintenta 1 vez tras `getSession()` con refresh forzado antes de propagar el 401. |
| R4 | La máquina de estados de sesión única con "el dispositivo activo decide" necesita que A esté online para responder; si A está cerrado, B queda bloqueado. | `GRACE` (30 s) + `TIMEOUT` (p. ej. 60 s) con resolución perezosa → handoff automático a B si A no responde. Nunca deja a B bloqueado indefinidamente. |
| R5 | Quitar `_CREATE_TABLES_SQL` deja el arranque sin red de seguridad si el proyecto nuevo pierde una tabla. | El esquema vive en migraciones versionadas (`0001`–`0004`) aplicadas y verificables vía Supabase MCP. `index_status` + `list_tables` en B0 y B8. |
| R6 | APK Android: supabase-js guarda la sesión en `localStorage`, que en el WebView de Capacitor puede no persistir igual que `@capacitor/preferences`. | Adaptador de storage custom para supabase-js que use `Preferences` cuando `Capacitor.isNativePlatform()`. Ya hay precedente en `store/auth.ts`. |
| R7 | `finanzas.py` y su ETL quedan huérfanos contra el proyecto nuevo (sin `facturas_compra`). | Desregistrar `finanzas.router` en B3 y anotar en `ARQUITECTURA_MAESTRA.md`. No se borra código todavía (puede haber señal útil para los agentes de operación). |
| R8 | Google OAuth necesita configurar el proveedor en el dashboard de Supabase (client id/secret) + URLs de redirect. Sin eso, el botón Google falla. | Tarea explícita de B0/B6; si el fundador no tiene credenciales de Google Cloud OAuth a mano, B6 entrega correo+contraseña funcionando y Google queda como sub-tarea. |
| R9 | El prototipo queda no-desplegable entre B2 y B6. | Aceptado explícitamente por el fundador (no está en producción). Los micro-commits permiten retomar exacto. |
| R10 | `audit_service.log_accion` inserta en `audit_log` que ahora exige `empresa_id NOT NULL`. | `log_accion` pasa a recibir `empresa_id` (del `usuario`) y va por `db_rls` (la policy de INSERT ya exige `empresa_id = empresa_actual()`), o por `db_service` con `empresa_id` explícito. Definir en B3. |

---

## 5. Decisiones que quedan para la Fase 3 (aprobación del fundador)

1. **Verificación del JWT**: secreto compartido HS256 (`SUPABASE_JWT_SECRET`) vs. claves
   asimétricas/JWKS. Propongo HS256 por simplicidad; JWKS si el fundador ya migró a las
   claves nuevas del proyecto.
2. **Resolución del timeout de sesión única**: perezosa (sin cron, propuesta) vs. `pg_cron`.
3. **`finanzas.router`**: desregistrar ahora (propuesta) vs. dejarlo.
4. **Permiso para editar Parámetros**: reutilizar `puede_ver_dashboard` (admin+gerencia) vs.
   nueva capacidad `puede_editar_parametros`.
5. **Alta de empresa**: endpoint `bootstrap` protegido por secreto (propuesta, sirve para el
   prototipo) vs. solo script de seed.
6. **`allow_origins` de CORS**: ¿el prototipo nuevo tendrá dominio propio en Vercel distinto
   al del legado? (afecta qué orígenes dejar).
7. **Google OAuth**: ¿el fundador tiene credenciales de Google Cloud OAuth para configurarlo
   en Supabase en esta fase, o Google queda para después?

---

---

# PARTE II — Revisión tras auditoría (v2, 2026-08-27)

> Fase 2 del ciclo `/goal`. Auditores independientes: **Security Engineer** y **Database
> Optimizer**. Ambos: **APRUEBA CON CAMBIOS**. Ningún rechazo. Arquitectura de fondo validada
> (RLS que re-deriva `empresa_id` de la tabla y no del token; sin policies de escritura en
> `usuarios`/`empresas`; session pooler; retiro del auth propio). Esta Parte II **sustituye**
> las partes de la Parte I con las que entre en conflicto y es la fuente de verdad para la
> ejecución.

## II.1 Hallazgos críticos convergentes (los dos auditores)

### C1 — Verificar que el rol de conexión realmente omite RLS, o abortar el arranque
`db_service` asume rol con `BYPASSRLS`. Si el rol `postgres` del pooler NO lo tiene:
`empresa_actual()` (SECURITY DEFINER) entra en **recursión infinita** con la policy
`usuarios_select` → lockout total; y los `INSERT` de aprovisionamiento fallan siempre.
Si SÍ lo tiene y un router de datos usa `db_service` por error → fuga total entre empresas,
silenciosa.
**Acción:**
- B0: `SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname IN
  ('postgres','authenticator','service_role','anon','authenticated');` + probar
  `empresa_actual()` como `authenticated`.
- Si `postgres` no omite RLS: crear un rol dedicado con `BYPASSRLS` (concedido por
  `supabase_admin`) + `GRANT authenticated TO ese_rol`, y usarlo en `DATABASE_URL`.
- **Self-test de arranque (`lifespan`)**: (a) confirmar `rolbypassrls` del rol conectado;
  (b) abrir una tx, `SET LOCAL ROLE authenticated` sin claims, `SELECT count(*) FROM
  cotizaciones` → debe dar 0; si no, `raise` y **abortar el arranque**.
- Aserción de que `DATABASE_URL` usa el puerto **5432** (session pooler), no 6543.

### C2 — `SET LOCAL` es un no-op silencioso fuera de transacción → aserción obligatoria
En `db_rls`, tras `set_config('request.jwt.claims', :json, true)` + `SET LOCAL ROLE
authenticated`, ejecutar:
```sql
select current_user, current_setting('request.jwt.claims', true)
```
Si `current_user != 'authenticated'` o los claims están vacíos → `raise HTTPException(500)`.
Convierte una fuga silenciosa en un fallo ruidoso.

### C3 — Una transacción por request, de verdad (es seguridad, no solo corrección)
Un `conn.commit()` a mitad de request revierte `SET LOCAL`/claims → las sentencias
siguientes corren como el rol base (posible `BYPASSRLS`) → fuga entre empresas.
**Acción:** quitar todos los `commit()` intermedios (inventario completo en II.4/H9);
el commit final lo hace la dependencia. Test de aislamiento **por cada router de datos**
como bloqueante de la fase (no solo uno).

## II.2 Hallazgos críticos de seguridad

### S1 — El aprovisionamiento NO puede confiar en `raw_user_meta_data` (lo escribe el cliente)
`user_metadata` es escribible por el cliente (`signUp({options:{data}})`,
`updateUser({data})`). Un atacante podría registrarse con
`data={empresa_id:<víctima>, rol_codigo:'gerencia'}` y el trigger lo mete en el tenant
víctima. Los `empresas.id` no son secretos (URLs, PDFs).
**Acción:**
- **Desactivar el registro público** en Supabase Auth ("Allow new users to sign up" = OFF).
  Alta 100% por invitación. Esto también hace fail-closed a un usuario de Google no invitado.
- El trigger lee **`raw_app_meta_data`** (`app_metadata`), que solo se fija con la
  service-role key. Para invitaciones: `generateLink({type:'invite'})` + `createUser({
  app_metadata})` o `admin.updateUserById(id,{app_metadata})` tras `inviteUserByEmail`.
- Defensa en profundidad: tabla `invitaciones` (correo, empresa_id, rol_codigo, token,
  estado, expira) escrita por el backend; el trigger valida `NEW.email` contra ella e
  ignora cualquier metadato que no coincida.

### S2 — `admin.py` sin scope por `empresa_id`, sobre la conexión que omite RLS
Hoy `SELECT ... FROM usuarios ORDER BY id` y `UPDATE usuarios SET rol=... WHERE id=%s`
sin filtro de tenant. Bajo `db_service` = enumerar/modificar usuarios de **todas** las
empresas.
**Acción en B4:** cada SELECT/UPDATE/DELETE con `WHERE empresa_id = %s` (el del solicitante,
de `get_current_user`). Antes de cualquier llamada a la Admin API sobre un usuario objetivo:
confirmar `target.empresa_id == caller.empresa_id`. Prohibir `rol_codigo:='admin'` desde
este endpoint (solo bootstrap). Prohibir que el admin edite su propio rol. Respetar
`ux_un_admin_por_empresa`.
- **CI/lint**: falla el build si `db_service` aparece fuera de la allowlist
  (`middleware/auth.py`, `routers/admin.py`, router de bootstrap, módulo de sesión única).

## II.3 Hallazgos críticos de base de datos

### D1 — `log_accion` rompe la atomicidad y descarta el trabajo real del endpoint
Tres problemas juntos: (a) no pasa `empresa_id` → viola `NOT NULL`; (b) ante el fallo hace
`conn.rollback()` sobre la conexión compartida → **borra el DELETE/UPDATE que el endpoint
ya hizo** (p. ej. `eliminar_cotizacion`), y el endpoint devuelve 200; (c) un INSERT fallido
deja la transacción en estado *aborted* → todo lo que siga también falla.
**Acción:** patrón SAVEPOINT, recibir `empresa_id` como kwarg, **nunca** tocar
commit/rollback de la conexión compartida:
```python
def log_accion(conn, accion, metadata=None, *, empresa_id, usuario_id=None, ip=None):
    try:
        with conn.cursor() as cur:
            cur.execute("SAVEPOINT sp_audit")
            cur.execute(
                "INSERT INTO audit_log (empresa_id, usuario_id, accion, metadata, ip) "
                "VALUES (%s,%s,%s,%s,%s)",
                (empresa_id, usuario_id, accion, Json(metadata or {}), ip))
            cur.execute("RELEASE SAVEPOINT sp_audit")
    except Exception:
        try:
            with conn.cursor() as cur:
                cur.execute("ROLLBACK TO SAVEPOINT sp_audit")
        except Exception:
            pass
```
Camino de aprovisionamiento (`db_service`, actor sin fila aún): `usuario_id = actor real o
NULL`, `empresa_id = empresa destino`; el SAVEPOINT absorbe el fallo de FK.

### D2 — `cfg_get` hace `json.loads()` sobre columna `jsonb` → toda la config guardada "desaparece"
psycopg2 ya devuelve `dict`/`list` para `jsonb`. `json.loads(dict)` → `TypeError` →
`except: return default`. `cfg_get` devuelve `None` **siempre** → todo cae a los defaults
del motor sin error visible (parámetros personalizados, datos de empresa, logo).
**Acción:**
```python
val = row[0]
return json.loads(val) if isinstance(val, (str, bytes, bytearray)) else val
```
+ pasar `empresa_id` explícito y `WHERE empresa_id=%s AND clave=%s`.

### D3 — Los `GRANT` de DML a `authenticated` no están en ninguna migración
`0001` solo crea policies; las policies **no otorgan privilegios**. Si `authenticated` no
tiene `SELECT/INSERT/UPDATE/DELETE` sobre las tablas → `permission denied` en cada consulta
bajo `db_rls`. Supabase suele traer `ALTER DEFAULT PRIVILEGES ... TO anon, authenticated,
service_role`, pero **hay que verificarlo**.
**Acción B0:** `SELECT has_table_privilege('authenticated','cotizaciones','INSERT');` (y las
demás). Si falta, en `0003`:
```sql
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
```
Verificar que el rol de login es miembro de `authenticated` (para `SET ROLE`).

### D4 — `_siguiente_numero`: la carrera pasa a 500 duro + bug preexistente tras DELETE
`SELECT COUNT(*)+1`: dos guardados concurrentes de la misma empresa generan el mismo
`numero` → viola `unique(empresa_id,numero)` → aborta la transacción del perdedor → 500.
Además `COUNT(*)` tras borrar una cotización intermedia genera un número ya usado.
**Acción — elegir una (decisión del fundador, ver II.6):**
- **(a) mínima:** `pg_advisory_xact_lock(hashtext(empresa_id||prefijo||anio))` + derivar de
  `MAX(split_part(numero,'-',3)::int)+1`.
- **(b) robusta (recomendada):** tabla `folio_seq(empresa_id, prefijo, anio, ultimo)` con
  `INSERT ... ON CONFLICT DO UPDATE SET ultimo = folio_seq.ultimo + 1 RETURNING ultimo`
  (atómico, sin lock, sin carrera) + su policy RLS.

## II.4 Hallazgos altos / medios incorporados al plan

**Auth / JWT (S8, D):**
- `jwt.decode(..., algorithms=["HS256"], audience="authenticated", issuer=ISS,
  leeway=30)`. Nunca leer `alg` del header; nunca `alg:none`.
- **Validar `iss`** = `https://hrmpyhixhbnkkpvxtuit.supabase.co/auth/v1`. Crítico mientras
  coexisten los dos proyectos Supabase: si el `SUPABASE_JWT_SECRET` se reutiliza entre
  legado y nuevo, sin `iss` un token de uno vale en el otro.
- Verificar que `sub` es UUID antes de usarlo.
- Construir `request.jwt.claims` como **reconstrucción mínima**
  `json.dumps({"sub": sub, "role": "authenticated"})`. NO inyectar `empresa_id` en los
  claims. NO pasar el payload decodificado crudo (así `user_metadata` nunca llega a una
  policy / función `SECURITY DEFINER`).
- Fijar el GUC de claims **antes** de `SET LOCAL ROLE authenticated`.
- Preferir **JWKS asimétrico** si el proyecto ya migró a signing keys (una fuga de la clave
  pública no permite forjar). Si se adopta: fijar `algorithms` solo al algoritmo asimétrico
  (evitar confusión de algoritmo), cachear JWKS con TTL+`kid`, fail-closed si no refresca.
- Procedimiento de rotación del secreto documentado (rotarlo invalida todas las sesiones →
  ventana de mantenimiento).

**Sesión única (S5, S6, D10):**
- `device.id` = 128 bits de `crypto.getRandomValues`, en el storage más persistente por
  origen; **nunca** escrito en `audit_log` ni en logs.
- Cada transición de estado = **un solo `UPDATE ... WHERE usuario_id=%s AND estado=<esperado>
  AND retador->>'id'=<esperado> [AND retador_desde + GRACE < now()]`** + comprobar `rowcount`
  (0 ⇒ ya se resolvió → 409, el cliente re-sincroniza). O `SELECT ... FOR UPDATE` de la fila
  (lookup por PK, contención solo entre los 2 dispositivos del mismo usuario — justo lo que
  se quiere serializar).
- La resolución perezosa del timeout **sale del hot path de datos**: endpoint dedicado
  `POST /api/auth/session/heartbeat` que el cliente hace polling (p. ej. cada 20-30 s). No
  se hace como efecto colateral en cada request de datos (chocaría con C3 y con la higiene
  de roles de conexión).
- En `handoff`/`force`: el backend llama a la Admin API para **revocar la sesión/refresh
  token** del dispositivo saliente (no basta el header 409, que es spoofeable). Para `force`,
  exigir re-autenticación fresca, no solo posesión de token.
- El dispositivo expulsado, al volver a foreground, consulta `sesion_activa`; si
  `device_actual.id != mío` → pantalla "tu sesión se movió a «X»" (aunque haya perdido el
  evento Realtime).
- `CHECK (estado in ('activa','takeover_pendiente'))` en la tabla.
- Documentar honestamente: es **sesión única cooperativa**. El dueño de la cuenta siempre
  puede compartir su propia sesión; con A offline el handoff a B es silencioso por diseño
  (R4). "No se cierra en silencio" se cumple solo con A en línea.
- `alter table sesion_activa set (fillfactor=80, autovacuum_vacuum_scale_factor=0.0,
  autovacuum_vacuum_threshold=50)` (updates HOT frecuentes de `ultimo_uso`).
- Verificar autorización de **Realtime** sobre `sesion_activa` (que un usuario no pueda
  suscribirse a la fila de otro; RLS/channel authorization habilitado).

**Cupo por plan (S7):**
- El enforcement real = **trigger `BEFORE INSERT ON usuarios`** que cuenta filas de la
  empresa contra `planes.cupo_usuarios` y `raise exception` si excede (mismo patrón que
  `ux_un_admin_por_empresa`). Tapa también la ruta de self-signup. El check en Python +
  `SELECT ... FOR UPDATE` sobre `empresas` es defensa adicional, no la principal.

**Conexión / pooler (D5, D11, D12):**
- **No** mandar `BEGIN` textual (psycopg2 con `autocommit=False` abre la tx en el primer
  `execute`). Ejecutar directamente `set_config` + `SET LOCAL ROLE` y al final
  `conn.commit()`/`conn.rollback()`.
- `finally` de `db_rls`: `try: conn.rollback() except: pass` incondicional antes de
  `conn.close()` (cinturón y tirantes). SQLAlchemy hace `rollback` en el checkin por
  defecto; con `SET LOCAL` no hace falta `RESET ROLE`/`DISCARD ALL`.
- `get_current_user` (perfil vía `db_service`) y `db_rls` toman **conexiones distintas** del
  pool. No compartir.
- Session pooler (5432) **obligatorio** — motivo real: `SET LOCAL` no sobrevive a un
  `commit()` en el transaction pooler (6543). Bonus: IPv4.
- `db_service` **también** una transacción por request (para `SELECT ... FOR UPDATE` de
  sesión única y atomicidad del aprovisionamiento). Sin `SET ROLE`, sin `set_config`.
- Secuencia de aprovisionamiento con compensación: `INSERT empresas` → `commit` →
  `createUser` (Admin API, no transaccional) → (trigger crea `usuarios`). Si `createUser`
  falla → `DELETE FROM empresas WHERE id=...` de compensación. (Alternativa: crear la
  empresa después del `createUser` — decisión en II.6.)

**Trigger `handle_new_user` (D8):**
- `SECURITY DEFINER` + `set search_path = ''` + **cualificar todo**
  (`public.usuarios`, `public.empresas`, `public.roles_catalogo`). Owner = `postgres`.
- Validar `empresa_id` con regex de UUID antes del cast; `raise exception` con mensaje claro
  si es inválido (no silenciar).
- `insert ... on conflict (id) do nothing` (idempotencia ante replay/reintento).
- El choque contra `ux_un_admin_por_empresa` **sí** debe aflorar ("esta empresa ya tiene
  admin").
- Documentar: cualquier excepción no capturada del trigger **revierte la creación del
  `auth.users`** (mismo tx que GoTrue). Es *fail-closed* aceptable (metadatos los controla
  el backend), pero se escribe como decisión.
- OAuth Google sin invitación → sin `app_metadata` → el trigger no inserta → acceso cero.
  Correcto; el front ya maneja "autenticado sin perfil".

**`cfg_set` (D7):**
```sql
insert into app_config (empresa_id, clave, valor) values (%s,%s,%s)
on conflict (empresa_id, clave) do update
    set valor = excluded.valor, actualizado = now()
```
+ **quitar el `conn.commit()` interno**; el commit lo da `db_rls`. `set_parametros` escribe
`tarifas` y `adicionales` → ahora atómicas. `empresa_logo_b64` (string base64) → `Json("...")`
= jsonb string, válido (sin `CHECK` que exija objeto — decisión en II.6).

**CORS (S10):**
- `allow_credentials=False` (tokens Bearer no lo necesitan).
- Podar `allow_origins` al origen real del prototipo (los nombres Vercel placeholder son
  re-registrables → riesgo si el proyecto se borra). Depende de II.6 punto 6.
- No añadir `*` a `allow_headers`. Añadir `X-Device-Id`, quitar `X-Session-Token`.

**Rate limiting (S15):**
- `slowapi` sobre `/api/bootstrap/empresa`, `/api/admin/usuarios` (invitar — + tope de
  invitaciones pendientes por empresa), `/api/auth/session/*`. Verificar que el limiter lee
  `X-Forwarded-For` detrás de Vercel.

**Bootstrap endpoint (S9):**
- `hmac.compare_digest`, secreto ≥32 bytes aleatorios, nunca logueado, rate-limited,
  allowlist de IP, feature flag **OFF por defecto** en el entorno desplegado. Medio plazo:
  tabla `platform_admins` + sesión Supabase real.

**"Cerrar sesión en todos los dispositivos" (S14):**
- Borrar `sesion_activa` no revoca tokens de Supabase → regresión frente a hoy. Mantener un
  endpoint solo-admin "revocar todas las sesiones" vía Admin API `signOut`, llamado al poner
  `activo=false` y al degradar `rol_codigo`.
- La re-lectura de `usuarios.activo` por request vía `db_service` en `get_current_user`
  **se conserva sin caché** (mejor que hoy).

**Config del proyecto Supabase Auth (S12) — checklist B0/B6:**
- Signup público OFF · rotación de refresh token + detección de reuso · TTL access token
  ≤ 1h · allowlist **exacta** de Redirect URLs (sin comodines) · `flowType:'pkce'`
  (imprescindible para el APK) · protección de contraseñas filtradas · confirmación de
  cambio de correo en ambas direcciones · Google OAuth provider (client id/secret) si aplica.

**`empresa_actual()` (D14):**
- Añadir `PARALLEL SAFE` a la firma (SECURITY DEFINER es PARALLEL UNSAFE por defecto → mata
  planes paralelos en las agregaciones del dashboard).
- Coste actual aceptable para escala de taller. Optimización futura (no esta fase): `db_rls`
  fija `set_config('app.empresa_id', <uuid>, true)` y las policies leen
  `coalesce(current_setting('app.empresa_id',true)::uuid, (select empresa_actual()))`.

**`_CREATE_TABLES_SQL` / lifespan (D13):**
- Quitar la creación de tablas y el seed de admin/parámetros. **Conservar** un `SELECT 1` de
  arranque (un `DATABASE_URL` mal configurado debe fallar al boot, no en el primer request).
- **Eliminar por completo** el bloque que imprime la contraseña del admin generado a logs.
- `catalogo_materiales`: añadir `UNIQUE (categoria, referencia)` en `0003` y seed con
  `ON CONFLICT DO NOTHING` (verificar antes que `seed_materiales.json` no tiene pares
  duplicados).

**Regla 2 / Agente (S17):**
- Centralizar el filtro jerárquico en un helper `scope_for(user)` (evita que un endpoint
  nuevo olvide el filtro y exponga datos de toda la empresa a un `operativo`).
- `agente.py`: validar `puede_pedir_datos_agregados_agente` antes de devolver agregados;
  correr bajo `db_rls`.

**Higiene de secretos / git (S11, D):**
- B0: `git check-ignore` sobre cada `.env*` y `.vercel/*`; `git log --all --full-history --
  '*.env*' '.vercel/*'`. **Cualquier secreto que haya estado commiteado se rota.** Asegurar
  `.vercel/` ignorado por completo.
- Fijar versiones exactas + lockfiles: `pyjwt[crypto]`, `httpx` (o `supabase`),
  `@supabase/supabase-js`; mantener `cryptography` al día.

## II.5 Plan de bloques revisado

- **B0 — Preflight (ampliado).** Verificaciones C1 (roles/`BYPASSRLS`), D3 (GRANTs), D3
  (membresía de `authenticated`), puerto 5432, `.env`/git (S11), checklist de config de
  Supabase Auth (S12), ¿HS256 legacy o JWKS? (II.6-2), ¿secreto JWT compartido? (II.6-3).
  Rama git. Commit: notas de preflight.
- **B1 — SQL `0003` + `0004`.** `0003`: trigger `handle_new_user` (endurecido, D8/S1),
  trigger de cupo por plan (S7), columnas de `sesion_activa` + CHECK + storage params (D10),
  GRANTs si faltan (D3), `UNIQUE(categoria,referencia)` + `PARALLEL SAFE` en
  `empresa_actual()` (D13/D14), tabla `invitaciones` (S1), `folio_seq` si se elige la
  opción robusta (D4/II.6-6). `0004`: seed empresa demo + catálogo (`ON CONFLICT`). Aplicar
  vía Supabase MCP y verificar. Commit.
- **B2 — Backend auth core.** `db/client.py` (`db_service` y `db_rls`, ambos transaccionales,
  con las aserciones C1/C2, mecánica psycopg2 de D5), `middleware/auth.py` (verificación JWT
  de II.4, perfil enriquecido vía `db_service` sin caché, `activo` re-check), `models/auth.py`,
  `routers/auth.py` (deja `/me` + endpoints de sesión), borrar `services/auth_service.py`,
  `main.py` (quitar `_CREATE_TABLES_SQL` + seeds, dejar `SELECT 1` + self-test, CORS de II.4,
  desregistrar `finanzas.router`), `requirements.txt`. Self-test de arranque. Commit.
- **B3 — Routers a `db_rls` + capacidades + atomicidad.** `db/deps.py` reescrito;
  `audit_service.log_accion` (SAVEPOINT + `empresa_id`, D1); `db/config_helpers.py` (D2 +
  `empresa_id` + `cfg_set` UPSERT sin commit, D7); todos los routers de datos a `db_rls`;
  quitar `commit()` intermedios (inventario H9); checks de rol → capacidades + `scope_for()`
  (S17); `_siguiente_numero` (D4); `usuario_id` uuid. Test de aislamiento por router. Commit.
- **B4 — Aprovisionamiento + gestión de usuarios.** `POST /api/bootstrap/empresa`
  (endurecido S9, compensación D12), `routers/admin.py` reescrito (scope por `empresa_id`
  S2, cupo, Admin API vía `httpx`, `app_metadata`), tabla `invitaciones`. Rate limits.
  Commit.
- **B5 — Backend sesión única.** `session/claim|keep|handoff|heartbeat|logout`, transiciones
  con `UPDATE ... WHERE estado=` condicional (D10/S6), revocación de token vía Admin API en
  handoff/force (S5), `verificar_dispositivo`. Commit.
- **B6 — Frontend auth.** `@supabase/supabase-js`, `lib/supabaseClient.ts` (storage adapter
  APK, `flowType:'pkce'`), `store/auth.ts`, `api/client.ts` (Bearer + refresh + intercept
  401/409), `api/auth.ts`, `LoginPage.tsx` (correo+contraseña + Google + "olvidé mi
  contraseña"), página de reset, `PrivateRoute`/`AdminRoute`/`App.tsx` (`rol_codigo`). Commit.
- **B7 — Frontend sesión única.** Suscripción Realtime a `sesion_activa`, modal de takeover,
  pantalla "esperando confirmación", `device.id` (128 bits), header `X-Device-Id`, polling
  de `heartbeat`, pantalla "tu sesión se movió". Commit.
- **B8 — Verificación en vivo (bloqueante).** 2 empresas demo. Tests: alta de empresa,
  login correo, login Google, invitar `operativo`, **aislamiento por cada router** (A no ve
  nada de B), jerarquía interna (`operativo` solo lo suyo), sesión única (2 navegadores:
  aviso, mantener, handoff, timeout, force, expulsión con revocación de token), reset de
  contraseña, self-test de arranque falla si se rompe RLS a propósito. Commit de ajustes.

## II.5b — Verificado en el proyecto `hrmpyhixhbnkkpvxtuit` (2026-08-27, solo lectura)

- **`postgres` tiene `rolbypassrls = true` Y es miembro de `authenticated`.** → `DATABASE_URL`
  conecta como `postgres` (session pooler 5432). `db_service` = conexión `postgres` tal cual
  (BYPASSRLS). `db_rls` = conexión `postgres` + `SET LOCAL ROLE authenticated` (funciona
  porque es miembro). **C1 resuelto sin crear rol nuevo.**
- **`empresa_actual()`**: owner `postgres` (BYPASSRLS) → **sin recursión** con `usuarios_select`.
  SECURITY DEFINER, `search_path=public`, **`PARALLEL UNSAFE`** → `0003` le añade
  `PARALLEL SAFE`. El linter marca que `authenticated` puede llamarla vía RPC (`WARN`); las
  policies la necesitan, así que se mantiene para `authenticated` y se revoca de `anon`/`public`.
- **`authenticated` ya tiene DML completo (SELECT/INSERT/UPDATE/DELETE) sobre las 11 tablas**
  por los privilegios por defecto de Supabase. **D3/H4 resuelto — no hacen falta GRANTs
  extra.** RLS es lo único que filtra. (`usuarios`/`empresas` tienen el grant pero **sin
  policy de escritura** → RLS niega toda escritura de `authenticated` = anti-escalación OK.)
- **Esquema `0001`+`0002` confirmado aplicado**: 11 tablas, RLS `on` + `forced` en todas,
  `planes` (starter/pro/enterprise) y `roles_catalogo` (admin/gerencia/operativo) sembrados.
  **BD vacía**: 0 `auth.users`, 0 `usuarios`, 0 `empresas` — arranque limpio confirmado.
- **Proyecto creado hoy, Postgres 17.6** → casi con certeza usa las **signing keys
  asimétricas** nuevas de Supabase (ECC/RSA) por defecto. → El backend verifica el JWT por
  **JWKS** (`/auth/v1/.well-known/jwks.json`), no por secreto HS256 compartido. Confirmar en
  el dashboard; si aún hubiera secreto legacy, es el fallback. **Decisión 2 resuelta (JWKS).**
- **El proyecto legado (`dilskbvmvywqohtswzdw`) no está en esta organización/cuenta de
  Supabase** → proyectos separados, claves separadas. **Decisión 3 resuelta: el secreto no se
  comparte.** Validar `iss` igual (barato y correcto).

## II.6 Decisiones que necesita el fundador (Fase 3)

**Resueltas por inspección (II.5b):** #2 (JWKS asimétrico), #3 (secreto no compartido).

**Recomendaciones que se aplican salvo objeción del fundador:**
- #5 Fallo del trigger de aprovisionamiento = **fail-closed ruidoso** (aborta la creación del
  usuario con error claro).
- #6 Número de cotización = **tabla contador `folio_seq`** (sin carreras).
- #7 Timeout de sesión única = **endpoint `heartbeat` con polling** (sin `pg_cron`).
- #8 **Desregistrar `finanzas.router`** del prototipo nuevo (ambos auditores de acuerdo).
- #9 Al expulsar un dispositivo, **revocar su token vía Admin API** (Regla 5 bien hecha).
- #10 `app_config.valor` = **permitir escalares** (sin `CHECK` de objeto; más simple).

**Respondidas por el fundador (2026-08-27, Fase 3):**
- #1 **Backend = servidor pequeño siempre encendido** (proceso long-lived), no serverless.
  → pool de conexiones estable; `db_service`/`db_rls` con el pool actual (5+5) sirve;
  `pool_recycle` moderado; la lógica de sesión única no pelea con arranques en frío.
  Actualizar `ARQUITECTURA_MAESTRA.md` sección 3.4 (deja de estar "a confirmar").
- #4 **Acceso 100% por invitación.** "Allow new users to sign up" = OFF en Supabase Auth.
  Alta de `auth.users` solo vía Admin API (bootstrap de empresa + invitación de usuarios).
  OAuth Google de un no invitado → sin `app_metadata` → sin fila en `usuarios` → acceso cero.
- #12 **Google OAuth queda para después.** B6 entrega correo+contraseña + enlaces de
  invitación y restablecimiento. El botón de Google es una sub-tarea corta posterior.

**Pendiente (no bloquea la ejecución):**
- #11 **CORS `allow_origins`**: el prototipo nuevo aún no tiene dominio Vercel propio
  definido. B2 deja `allow_origins` restringido a `localhost:5173`/`127.0.0.1:5173` (dev);
  cuando haya dominio de despliegue se añade ahí. `allow_credentials=False`.

## II.7 ¿Re-auditar la v2?

Lectura estricta del ciclo `/goal`: tras ajustar el plan se repite la Fase 2. Los cambios de
la v2 son correcciones concretas sobre una arquitectura que **ambos** auditores validaron, no
un rediseño. Propuesta: incorporadas ya, ejecutar sin otra ronda completa de auditoría de
plan — y en su lugar reforzar la **Fase 5** (validación de la ejecución con agentes distintos)
sobre el código real. El fundador decide si quiere la ronda extra de auditoría de plan.

---

## 6. Qué NO se toca

- App Streamlit legada (raíz del repo) — producción real sobre `dilskbvmvywqohtswzdw`.
- `motor/calculos.py`, `motor/parametros.py`, `motor/generador_pdf.py`, `motor/motor_planos.py`
  — la lógica de cálculo está validada; esta fase es solo auth + aislamiento + sesión.
- El esquema `0001`/`0002` ya aplicado (solo se le añade `0003`/`0004`).
- El rediseño visual (es la siguiente fase, después de esta).
