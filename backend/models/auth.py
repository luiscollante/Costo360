from pydantic import BaseModel


class UsuarioOut(BaseModel):
    """Perfil del usuario autenticado (respuesta de GET /api/auth/me)."""
    id: str                 # UUID de auth.users
    empresa_id: str
    rol_codigo: str         # 'admin' | 'gerencia' | 'operativo'
    nombre_completo: str
    cargo_visible: str | None = None
    empresa_nombre: str | None = None
    # Capacidades del catálogo de roles (roles_catalogo)
    puede_ver_dashboard: bool
    puede_usar_modo_bi_senior: bool
    puede_pedir_datos_agregados_agente: bool
    puede_gestionar_usuarios: bool
