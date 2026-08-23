from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.db.client import db_conn
from backend.middleware.auth import get_current_user

router = APIRouter(prefix="/api/inventario", tags=["inventario"])

_COLS = (
    "id,material_categoria,referencia,cantidad_laminas,ancho_cm,alto_cm,espesor_cm,"
    "costo_unitario,stock_minimo,proveedor,ubicacion,notas,actualizado_en"
)


def _row_to_dict(row) -> dict:
    return {
        "id":                row[0],
        "material_categoria": row[1],
        "referencia":        row[2] or "",
        "cantidad_laminas":  row[3],
        "ancho_cm":          float(row[4]) if row[4] is not None else None,
        "alto_cm":           float(row[5]) if row[5] is not None else None,
        "espesor_cm":        float(row[6]) if row[6] is not None else None,
        "costo_unitario":    float(row[7]),
        "stock_minimo":      row[8],
        "proveedor":         row[9] or "",
        "ubicacion":         row[10] or "",
        "notas":             row[11] or "",
        "actualizado_en":    row[12].isoformat() if row[12] else None,
    }


class LaminaIn(BaseModel):
    material_categoria: str
    referencia:         str = ""
    cantidad_laminas:   int = 0
    ancho_cm:           Optional[float] = None
    alto_cm:            Optional[float] = None
    espesor_cm:         Optional[float] = None
    costo_unitario:     float = 0.0
    stock_minimo:       int = 0
    proveedor:          str = ""
    ubicacion:          str = ""
    notas:              str = ""


class LaminaUpdate(BaseModel):
    referencia:         Optional[str]   = None
    cantidad_laminas:   Optional[int]   = None
    ancho_cm:           Optional[float] = None
    alto_cm:            Optional[float] = None
    espesor_cm:         Optional[float] = None
    costo_unitario:     Optional[float] = None
    stock_minimo:       Optional[int]   = None
    proveedor:          Optional[str]   = None
    ubicacion:          Optional[str]   = None
    notas:              Optional[str]   = None


@router.get("")
def listar_inventario(conn=Depends(db_conn), _usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        f"SELECT {_COLS} FROM inventario_laminas "
        "WHERE activo = TRUE ORDER BY material_categoria, referencia"
    )
    rows = cur.fetchall()
    cur.close()
    return [_row_to_dict(r) for r in rows]


@router.post("", status_code=201)
def crear_lamina(body: LaminaIn, conn=Depends(db_conn), usuario=Depends(get_current_user)):
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO inventario_laminas
        (material_categoria, referencia, cantidad_laminas, ancho_cm, alto_cm, espesor_cm,
         costo_unitario, stock_minimo, proveedor, ubicacion, notas, usuario_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id""",
        (
            body.material_categoria, body.referencia, body.cantidad_laminas,
            body.ancho_cm, body.alto_cm, body.espesor_cm,
            body.costo_unitario, body.stock_minimo,
            body.proveedor, body.ubicacion, body.notas,
            usuario["id"],
        ),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    return {"id": new_id, "ok": True}


@router.put("/{lamina_id}")
def actualizar_lamina(
    lamina_id: int,
    body: LaminaUpdate,
    conn=Depends(db_conn),
    _usuario=Depends(get_current_user),
):
    campos = ["actualizado_en = NOW()"]
    vals = []
    for campo, valor in body.model_dump(exclude_unset=True).items():
        campos.append(f"{campo} = %s")
        vals.append(valor)

    if len(campos) == 1:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar")

    vals.append(lamina_id)
    cur = conn.cursor()
    cur.execute(
        f"UPDATE inventario_laminas SET {', '.join(campos)} WHERE id = %s",
        vals,
    )
    conn.commit()
    cur.close()
    return {"ok": True}


@router.delete("/{lamina_id}")
def eliminar_lamina(
    lamina_id: int,
    conn=Depends(db_conn),
    _usuario=Depends(get_current_user),
):
    cur = conn.cursor()
    cur.execute("UPDATE inventario_laminas SET activo = FALSE WHERE id = %s", (lamina_id,))
    conn.commit()
    cur.close()
    return {"ok": True}
