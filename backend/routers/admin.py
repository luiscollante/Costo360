from fastapi import APIRouter, Depends, HTTPException
from backend.db.client import db_conn
from backend.db.deps import require_admin
from backend.models.admin import UsuarioCreate, UsuarioUpdate, UsuarioListItem
from backend.services.auth_service import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])

_ROLES_VALIDOS = {"Admin", "Gerente", "Operario"}


@router.get("/usuarios", response_model=list[UsuarioListItem])
def listar_usuarios(conn=Depends(db_conn), _=Depends(require_admin)):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, username, rol, nombre_completo FROM usuarios ORDER BY id"
        )
        rows = cur.fetchall()
    return [
        UsuarioListItem(id=r[0], username=r[1], rol=r[2], nombre_completo=r[3] or "")
        for r in rows
    ]


@router.post("/usuarios", status_code=201)
def crear_usuario(body: UsuarioCreate, conn=Depends(db_conn), _=Depends(require_admin)):
    if body.rol not in _ROLES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Rol inválido. Valores aceptados: {', '.join(sorted(_ROLES_VALIDOS))}",
        )
    pw_hash = hash_password(body.password)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO usuarios (username, password_hash, pin_recuperacion, pin_hash_version, rol, nombre_completo) "
                "VALUES (%s, %s, %s, 1, %s, %s) RETURNING id",
                (body.username, pw_hash, hash_password(body.pin), body.rol, body.nombre_completo),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    except Exception as exc:
        conn.rollback()
        msg = str(exc).lower()
        if "unique" in msg or "duplicate" in msg:
            raise HTTPException(status_code=409, detail="El nombre de usuario ya existe")
        raise HTTPException(status_code=500, detail="Error al crear usuario")
    return {"ok": True, "id": new_id}


@router.put("/usuarios/{uid}")
def editar_usuario(
    uid: int,
    body: UsuarioUpdate,
    conn=Depends(db_conn),
    usuario=Depends(require_admin),
):
    if usuario["id"] == uid:
        raise HTTPException(
            status_code=400, detail="No puedes editar tu propia cuenta desde aquí"
        )
    sets, values = [], []
    if body.nombre_completo is not None:
        sets.append("nombre_completo = %s")
        values.append(body.nombre_completo)
    if body.rol is not None:
        if body.rol not in _ROLES_VALIDOS:
            raise HTTPException(status_code=400, detail="Rol inválido")
        sets.append("rol = %s")
        values.append(body.rol)
    if body.password is not None:
        sets.append("password_hash = %s")
        values.append(hash_password(body.password))
    if not sets:
        return {"ok": True}
    values.append(uid)
    with conn.cursor() as cur:
        cur.execute(f"UPDATE usuarios SET {', '.join(sets)} WHERE id = %s", values)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    conn.commit()
    return {"ok": True}


@router.delete("/usuarios/{uid}")
def eliminar_usuario(
    uid: int,
    conn=Depends(db_conn),
    usuario=Depends(require_admin),
):
    if usuario["id"] == uid:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    with conn.cursor() as cur:
        cur.execute("DELETE FROM sesiones WHERE usuario_id = %s", (uid,))
        cur.execute("DELETE FROM usuarios WHERE id = %s", (uid,))
        deleted = cur.rowcount
    if deleted == 0:
        conn.rollback()
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    conn.commit()
    return {"ok": True}


@router.post("/usuarios/{uid}/reset-pin-lock")
def reset_pin_lock(uid: int, conn=Depends(db_conn), _=Depends(require_admin)):
    """Desbloquea el PIN de recuperación de un usuario (solo Admin)."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE usuarios SET pin_bloqueado = FALSE WHERE id = %s",
            (uid,),
        )
        if cur.rowcount == 0:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    conn.commit()
    return {"ok": True}
