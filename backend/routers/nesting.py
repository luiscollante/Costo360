from fastapi import APIRouter, Depends, HTTPException
from backend.middleware.auth import get_current_user
from backend.db.deps import verificar_dispositivo

# motor_planos está en sys.path gracias al bloque de main.py
from motor_planos import optimizar_corte_2d

router = APIRouter(prefix="/api/nesting", tags=["nesting"],
                   dependencies=[Depends(verificar_dispositivo)])


@router.post("/generar")
def generar_nesting(
    body: dict,
    usuario=Depends(get_current_user),
):
    """
    Calcula el nesting 2D (Guillotine Best Short Side Fit + rotación) sobre una lámina
    y devuelve el SVG de resultado junto con métricas de aprovechamiento.

    Entrada esperada:
    {
        "lamina":  {"largo": 3.20, "ancho": 1.60},
        "piezas":  [{"id": "Mesón principal", "largo": 2.50, "ancho": 0.60}, ...],
        "perforaciones": []   # reservado, ignorado por el motor
    }

    Salida:
    {
        "svg": "...",
        "aprovechamiento": 78.5,
        "area_lamina": 5.12,
        "area_usada": 4.02,
        "piezas_colocadas": 2,
        "piezas_fuera": []
    }
    """
    # ── Validar lámina ────────────────────────────────────────────────────────
    lamina = body.get("lamina")
    if not isinstance(lamina, dict):
        raise HTTPException(
            status_code=422,
            detail="El campo 'lamina' es obligatorio y debe ser un objeto {largo, ancho}.",
        )

    try:
        lamina_largo = float(lamina.get("largo", 0))
        lamina_ancho = float(lamina.get("ancho", 0))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=422,
            detail="Las dimensiones de la lámina deben ser números.",
        )

    if lamina_largo <= 0 or lamina_ancho <= 0:
        raise HTTPException(
            status_code=422,
            detail="Las dimensiones de la lámina deben ser mayores que cero.",
        )

    # ── Validar piezas ────────────────────────────────────────────────────────
    piezas_raw = body.get("piezas")
    if not isinstance(piezas_raw, list) or len(piezas_raw) == 0:
        raise HTTPException(
            status_code=422,
            detail="El campo 'piezas' es obligatorio y debe contener al menos una pieza.",
        )

    # Mapear "id" → "nombre" para el motor (usa "nombre" internamente)
    lista_motor = []
    for i, p in enumerate(piezas_raw):
        if not isinstance(p, dict):
            raise HTTPException(
                status_code=422,
                detail=f"La pieza en el índice {i} debe ser un objeto.",
            )
        try:
            largo = float(p.get("largo", 0))
            ancho = float(p.get("ancho", 0))
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=422,
                detail=f"Las dimensiones de la pieza '{p.get('id', i)}' deben ser números.",
            )
        lista_motor.append({
            "nombre":   str(p.get("id", f"Pieza {i + 1}")),
            "largo":    largo,
            "ancho":    ancho,
            "cantidad": int(p.get("cantidad", 1)) or 1,
        })

    # ── Ejecutar motor de nesting ─────────────────────────────────────────────
    svg, metricas = optimizar_corte_2d(lamina_largo, lamina_ancho, lista_motor)

    area_lamina = metricas["area_placa"]
    area_usada  = metricas["area_utilizada"]
    aprovechamiento = round(
        (area_usada / area_lamina * 100) if area_lamina > 0 else 0.0,
        2,
    )

    return {
        "svg":              svg,
        "aprovechamiento":  aprovechamiento,
        "area_lamina":      round(area_lamina, 4),
        "area_usada":       round(area_usada, 4),
        "piezas_colocadas": metricas["piezas_colocadas"],
        "piezas_fuera":     metricas["piezas_no_caben"],
    }
