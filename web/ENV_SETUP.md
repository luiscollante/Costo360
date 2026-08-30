# web/.env — variables de entorno (Fase 2.A)

`web/.env` está en `.gitignore`. Debe contener:

```
# URL del backend FastAPI (dev local)
VITE_API_URL=http://localhost:8000

# Proyecto Supabase NUEVO (multi-tenant)
VITE_SUPABASE_URL=https://hrmpyhixhbnkkpvxtuit.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_t5jOCjxELKXut05se_bgbQ_3zAk3FDJ
```

- `VITE_SUPABASE_ANON_KEY`: es la **publishable key** del proyecto. Está diseñada para ir
  embebida en el bundle del frontend — no es un secreto. (El linter de seguridad de Supabase
  no la marca; el aislamiento lo hace RLS, no el ocultamiento de esta clave.)
- No pongas aquí la `service_role` key — esa solo va en `backend/.env`.

## Configuración del proyecto en el dashboard de Supabase (antes de probar en vivo)

- **Authentication → Providers → Email**: desactivar *"Allow new users to sign up"*
  (acceso 100 % por invitación).
- **Authentication → URL Configuration**:
  - *Site URL*: `http://localhost:5173` (dev) — luego el dominio real.
  - *Redirect URLs*: añadir **exactamente** `http://localhost:5173/reset-password` y
    `http://localhost:5173/dashboard` (sin comodines).
- **Authentication → Sessions**: TTL del access token = 1 h, rotación de refresh token ON.
- Google OAuth: se configura más adelante (no en esta fase).
