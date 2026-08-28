"""
Gestión de usuarios (Admin) — Fase 2.A, sobre Supabase Auth.

Todo filtrado por la empresa del solicitante (`usuario["empresa_id"]`) — hallazgo
S2 (las lecturas van por `db_rls`, que aísla por RLS; las que van por `db_service`
llevan `WHERE empresa_id = %s` explícito). Requiere capacidad
`puede_gestionar_usuarios` (solo `admin`). No se puede invitar ni asignar el rol
`admin` desde aquí (solo el bootstrap). El cupo del plan lo hace cumplir el trigger
`trg_usuarios_cupo_check`; aquí hay un pre-chequeo para dar un error más claro.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.db.client import db_rls, db_service
from backend.db.deps import require_gestion_usuarios, verificar_dispositivo
from backend.middleware.rate_limiter import limiter
from backend.services import supabase_admin

router = APIRouter(prefix="/api/admin", tags=["admin"],
                   dependencies=[Depends(verificar_dispositivo)])

_ROLES_INVITABLES = {"gerencia", "operativo"}


class InvitarIn(BaseModel):
    email: str
    rol_codigo: str
    nombre_completo: str = ""


class EditarUsuarioIn(BaseModel):
    nombre_completo: str | None = None
    cargo_visible: str | None = None
    rol_codigo: str | None = None
    activo: bool | None = None


@router.get("/usuarios")
def listar_usuarios(usuario=Depends(require_gestion_usuarios), conn=Depends(db_service)):
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, au.email, u.rol_codigo, u.nombre_completo, u.cargo_visible, "
        "       u.activo, u.creado_en "
        "FROM public.usuarios u JOIN auth.users au ON au.id = u.id "
        "WHERE u.empresa_id = %s ORDER BY u.creado_en",
        (usuario["empresa_id"],),
    )
    rows = cur.fetchall()
    cur.close()
    return [
        {
            "id": str(r[0]), "email": r[1], "rol_codigo": r[2],
            "nombre_completo": r[3] or "", "cargo_visible": r[4],
            "activo": r[5], "creado_en": r[6].isoformat(),
        }
        for r in rows
    ]


@router.get("/invitaciones")
def listar_invitaciones(_=Depends(require_gestion_usuarios), conn=Depends(db_rls)):
    cur = conn.cursor()
    cur.execute(
        "SELECT id, email, rol_codigo, estado, creada_en, expira_en "
        "FROM invitaciones WHERE estado = 'pendiente' ORDER BY creada_en DESC"
    )
    rows = cur.fetchall()
    cur.close()
    return [
        {
            "id": str(r[0]), "email": r[1], "rol_codigo": r[2], "estado": r[3],
            "creada_en": r[4].isoformat(), "expira_en": r[5].isoformat(),
        }
        for r in rows
    ]


@router.post("/usuarios", status_code=201)
@limiter.limit("20/hour")
def invitar_usuario(
    request: Request,
    body: InvitarIn,
    usuario=Depends(require_gestion_usuarios),
    conn=Depends(db_service),
):
    if body.rol_codigo not in _ROLES_INVITABLES:
        raise HTTPException(status_code=400, detail="Solo puedes invitar roles 'gerencia' u 'operativo'")
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Correo requerido")
    emp = usuario["empresa_id"]

    cur = conn.cursor()
    cur.execute(
        "SELECT p.cupo_usuarios, "
        "       (SELECT count(*) FROM public.usuarios WHERE empresa_id = %s) "
        "FROM public.empresas e JOIN public.planes p ON p.codigo = e.plan_codigo "
        "WHERE e.id = %s",
        (emp, emp),
    )
    cupo, actual = cur.fetchone()
    if actual >= cupo:
        cur.close()
        raise HTTPException(status_code=409, detail=f"Cupo de usuarios del plan alcanzado ({actual}/{cupo})")

    cur.execute(
        "INSERT INTO public.invitaciones (email, empresa_id, rol_codigo, creada_por) "
        "VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING RETURNING id",
        (email, emp, body.rol_codigo, usuario["id"]),
    )
    got = cur.fetchone()
    cur.close()
    if not got:
        raise HTTPException(status_code=409, detail="Ya hay una invitación pendiente para ese correo")
    conn.commit()

    user_id = None
    try:
        user = supabase_admin.crear_usuario(
            email,
            {"empresa_id": str(emp), "rol_codigo": body.rol_codigo,
             "nombre_completo": body.nombre_completo.strip()},
        )
        user_id = user.get("id") or user.get("user", {}).get("id")
        enlace = supabase_admin.generar_enlace(email, "recovery")
    except Exception as e:
        print(f"[admin] fallo al invitar {email}: {e}", flush=True)
        if user_id:
            try:
                supabase_admin.eliminar_usuario(user_id)
            except Exception:
                pass
        cur = conn.cursor()
        cur.execute(
            "UPDATE public.invitaciones SET estado = 'revocada' "
            "WHERE email = %s AND empresa_id = %s AND estado = 'pendiente'",
            (email, emp),
        )
        cur.close()
        conn.commit()
        raise HTTPException(status_code=502, detail="No se pudo crear el usuario. Intenta de nuevo.")

    return {"email": email, "enlace_para_definir_contrasena": enlace}


@router.patch("/usuarios/{uid}")
def editar_usuario(
    uid: str,
    body: EditarUsuarioIn,
    usuario=Depends(require_gestion_usuarios),
    conn=Depends(db_service),
):
    emp = usuario["empresa_id"]
    if uid == usuario["id"]:
        raise HTTPException(status_code=400, detail="No puedes editar tu propia cuenta desde aquí")

    cur = conn.cursor()
    cur.execute(
        "SELECT rol_codigo FROM public.usuarios WHERE id = %s AND empresa_id = %s",
        (uid, emp),
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        raise HTTPException(status_code=404, detail="Usuario no encontrado en tu empresa")
    rol_actual = row[0]
    if rol_actual == "admin":
        cur.close()
        raise HTTPException(status_code=403, detail="El Admin de la empresa no se edita desde aquí")

    sets, vals = [], []
    if body.nombre_completo is not None:
        sets.append("nombre_completo = %s"); vals.append(body.nombre_completo)
    if body.cargo_visible is not None:
        sets.append("cargo_visible = %s"); vals.append(body.cargo_visible)
    if body.rol_codigo is not None:
        if body.rol_codigo not in _ROLES_INVITABLES:
            cur.close()
            raise HTTPException(status_code=400, detail="rol_codigo inválido (no se puede asignar 'admin')")
        sets.append("rol_codigo = %s"); vals.append(body.rol_codigo)
    if body.activo is not None:
        sets.append("activo = %s"); vals.append(body.activo)

    if not sets:
        cur.close()
        return {"ok": True}

    vals += [uid, emp]
    cur.execute(
        f"UPDATE public.usuarios SET {', '.join(sets)} WHERE id = %s AND empresa_id = %s",
        vals,
    )
    cur.close()
    conn.commit()

    degradado = body.rol_codigo is not None and body.rol_codigo != rol_actual
    if body.activo is False or degradado:
        supabase_admin.cerrar_sesiones(uid)

    return {"ok": True}


@router.delete("/usuarios/{uid}")
def eliminar_usuario(
    uid: str,
    usuario=Depends(require_gestion_usuarios),
    conn=Depends(db_service),
):
    emp = usuario["empresa_id"]
    if uid == usuario["id"]:
        raise HTTPException(status_code=403, detail="No puedes eliminar tu propia cuenta")
    cur = conn.cursor()
    cur.execute(
        "SELECT rol_codigo FROM public.usuarios WHERE id = %s AND empresa_id = %s",
        (uid, emp),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en tu empresa")
    if row[0] == "admin":
        raise HTTPException(status_code=403, detail="El Admin de la empresa no se puede eliminar")
    try:
        supabase_admin.eliminar_usuario(uid)
    except Exception as e:
        print(f"[admin] fallo al eliminar {uid}: {e}", flush=True)
        raise HTTPException(status_code=502, detail="No se pudo eliminar el usuario. Intenta de nuevo.")
    return {"ok": True}
