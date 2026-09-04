# backend/.env — variables de entorno (Fase 2.A)

Crear `backend/.env` (está en `.gitignore`, nunca se versiona) con estas claves:

## Base de datos — proyecto Supabase NUEVO (multi-tenant)

```
DATABASE_URL=postgresql://postgres.hrmpyhixhbnkkpvxtuit:<CONTRASEÑA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

- Es la cadena del **Session pooler** (puerto **5432**), rol `postgres`.
  Dashboard de Supabase → *Project Settings → Database → Connection string → "Session pooler"*.
- **No** usar el *Transaction pooler* (puerto 6543): el aislamiento por empresa se rompe
  ahí (`SET LOCAL` no sobrevive a un `commit()`). El backend aborta el arranque si detecta `:6543`.

## Supabase Auth / Admin API

```
SUPABASE_URL=https://hrmpyhixhbnkkpvxtuit.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

- `SUPABASE_SERVICE_ROLE_KEY`: Dashboard → *Project Settings → API → `service_role`*.
  Solo vive en el backend, nunca en el frontend ni en logs.
- El JWT de los usuarios se verifica por **JWKS asimétrico (ES256)** contra
  `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` — no hace falta ningún secreto compartido.

## Aprovisionamiento de empresas (bootstrap, operado por el fundador)

```
BOOTSTRAP_SECRET=<≥ 32 bytes aleatorios>
```

- Protege `POST /api/bootstrap/empresa`. Si está vacío, ese endpoint queda desactivado.

## Barrido diario del módulo de gestión de proyectos (Objetivo 6)

```
CRON_SECRET=<≥ 32 bytes aleatorios>
```

- Protege `POST /api/proyectos/cron/barrido-diario` (desbloqueos automáticos,
  alertas de plazo/riesgo, archivado de proyectos completados > 30 días).
- Si está vacío, el endpoint responde `503` y no opera (fail-closed).
- El disparo real se cablea cuando el backend tenga hosting: un cron del proveedor,
  una GitHub Action programada, o un servicio tipo cron-job.org que haga
  `POST` diario a ese endpoint con el header `X-Cron-Secret: <CRON_SECRET>`.
  Zona horaria del cálculo de "hoy": `America/Bogota`.

## IA del producto (agente de Parámetros)

```
GEMINI_AGENTE_API_KEY=<clave de Google AI Studio>
GEMINI_API_KEY=<fallback>
```

- Actualmente vencida — el chat del agente responde con error controlado hasta renovarla.
  No bloquea la Fase 2.A.

## Configuración de dashboard pendiente antes de B6 (frontend)

En el dashboard de Supabase del proyecto nuevo:
- *Authentication → Providers → Email*: **desactivar** "Allow new users to sign up"
  (el acceso es 100% por invitación).
- *Authentication → URL Configuration*: lista **exacta** de Redirect URLs para el
  restablecimiento de contraseña y la invitación (sin comodines).
- Confirmar TTL del access token = 1h y rotación de refresh token activada.
- Google OAuth: se configura más adelante (no en esta fase).
