from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.db.client import db_rls
from backend.middleware.auth import get_current_user
from backend.db.deps import scope_propio

router = APIRouter(prefix="/api/retales", tags=["retales"])

_COLS = (
    "id,material_categoria,referencia,m2_disponibles,m2_original,"
    "origen_numero,origen_cliente,fecha_ingreso,estado,notas,"
    "COALESCE(precio_recuperacion,0) AS precio_recuperacion,"
    "COALESCE(precio_mercado_m2,0) AS precio_mercado_m2"
)


def _row_to_dict(row) -> dict:
    return {
        "id":                  row[0],
        "material_categoria":  row[1],
        "referencia":          row[2] or "",
        "m2_disponibles":      float(row[3]),
        "m2_original":         float(row[4]),
        "origen_numero":       row[5] or "",
        "origen_cliente":      row[6] or "",
        "fecha_ingreso":       str(row[7]),
        "estado":              row[8],
        "notas":               row[9] or "",
        "precio_recuperacion": float(row[10]),
        "precio_mercado_m2":   float(row[11]),
    }


class RetalIn(BaseModel):
    material_categoria: str
    referencia:         str = ""
    m2_disponibles:     float
    m2_original:        Optional[float] = None
    notas:              str = ""
    precio_recuperacion: float = 0.0
    precio_mercado_m2:  float = 0.0


class RetalUpdate(BaseModel):
    m2_disponibles:      Optional[float] = None
    estado:              Optional[str]   = None
    notas:               Optional[str]   = None
    precio_recuperacion: Optional[float] = None
    precio_mercado_m2:   Optional[float] = None


@router.get("")
def listar_retales(conn=Depends(db_rls), usuario=Depends(get_current_user)):
    cur = conn.cursor()
    restringido, uid = scope_propio(usuario)

    if restringido:
        cur.execute(
            f"SELECT {_COLS} FROM inventario_retales "
            "WHERE usuario_id = %s ORDER BY estado ASC, fecha_ingreso DESC",
            (uid,),
        )
    else:
        cur.execute(
            f"SELECT {_COLS} FROM inventario_retales "
            "ORDER BY estado ASC, fecha_ingreso DESC"
        )

    rows = cur.fetchall()
    cur.close()
    return [_row_to_dict(r) for r in rows]


@router.post("", status_code=201)
def crear_retal(body: RetalIn, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    m2_orig = body.m2_original if body.m2_original is not None else body.m2_disponibles
    hoy = date.today().isoformat()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO inventario_retales
        (empresa_id, material_categoria, referencia, m2_disponibles, m2_original,
         fecha_ingreso, estado, notas, precio_recuperacion, precio_mercado_m2, usuario_id)
        VALUES (%s,%s,%s,%s,%s,%s,'Disponible',%s,%s,%s,%s)
        RETURNING id""",
        (
            usuario["empresa_id"],
            body.material_categoria, body.referencia,
            body.m2_disponibles, m2_orig,
            hoy, body.notas,
            body.precio_recuperacion, body.precio_mercado_m2,
            usuario["id"],
        ),
    )
    new_id = cur.fetchone()[0]
    cur.close()
    return {"id": new_id, "ok": True}


@router.put("/{retal_id}")
def actualizar_retal(
    retal_id: int,
    body: RetalUpdate,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    campos = []
    vals   = []
    if body.m2_disponibles is not None:
        campos.append("m2_disponibles = %s"); vals.append(body.m2_disponibles)
    if body.estado is not None:
        if body.estado not in ("Disponible", "Reservado", "Usado"):
            raise HTTPException(status_code=400, detail="estado inválido")
        campos.append("estado = %s"); vals.append(body.estado)
    if body.notas is not None:
        campos.append("notas = %s"); vals.append(body.notas)
    if body.precio_recuperacion is not None:
        campos.append("precio_recuperacion = %s"); vals.append(body.precio_recuperacion)
    if body.precio_mercado_m2 is not None:
        campos.append("precio_mercado_m2 = %s"); vals.append(body.precio_mercado_m2)

    if not campos:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")

    vals.append(retal_id)
    cur = conn.cursor()
    cur.execute(
        f"UPDATE inventario_retales SET {', '.join(campos)} WHERE id = %s",
        vals,
    )
    cur.close()
    return {"ok": True}


@router.delete("/{retal_id}")
def eliminar_retal(
    retal_id: int,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    cur = conn.cursor()
    cur.execute("DELETE FROM inventario_retales WHERE id = %s", (retal_id,))
    cur.close()
    return {"ok": True}
