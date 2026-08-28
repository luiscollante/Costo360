"""
Gestión de usuarios (Admin) — Fase 2.A.

STUB: este router se reconstruye por completo en el bloque B4 sobre Supabase Auth:
- invitar usuarios (`admin.createUser` + `app_metadata` + fila en `invitaciones`),
- listar/editar/desactivar usuarios de la PROPIA empresa (filtrado por `empresa_id`,
  hallazgo S2 de la auditoría),
- validar el cupo del plan (además del trigger `trg_usuarios_cupo_check`),
- revocar sesiones de Supabase al desactivar o degradar (hallazgo S14).

Mientras tanto expone solo el prefijo, sin endpoints activos.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/admin", tags=["admin"])
