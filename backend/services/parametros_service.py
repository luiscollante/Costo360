"""
Lógica de negocio de Parámetros (tarifas de costo y adicionales), compartida
entre el router HTTP normal y las tools del Agente de IA (Objetivo 5, Ciclo 2).

Dominio de mayor riesgo financiero de todo el ciclo: `tarifas`/`adicionales`
alimentan DIRECTAMENTE el motor de cálculo de cada cotización futura del
taller — un error aquí no afecta una fila, afecta todas las cotizaciones
hasta que alguien lo note.

Diferencia estructural frente a Cotización/Catálogo/Inventario/Retales: no
hay ningún `id` numérico de fila, y `cfg_set` (`db/config_helpers.py`)
REEMPLAZA el JSON COMPLETO de la clave (`tarifas` o `adicionales`) — no hay
UPDATE parcial de JSONB. Por eso toda función de escritura de aquí hace el
ciclo completo "leer el JSON completo fresco → mutar una fila puntual →
reescribir el JSON completo" bajo la misma conexión, nunca deja que el
caller (router o tool) arme el nuevo JSON a mano ni reciba el JSON crudo
para reconstruirlo él mismo.
"""
import copy

from fastapi import HTTPException

from backend.db.config_helpers import cfg_get, cfg_set
from backend.services.audit_service import log_accion
from parametros import PROPIEDADES_MATERIAL, TARIFAS, ADICIONALES

INDUCTORES_VALIDOS = (
    "por_ml", "por_m2_mano_obra", "por_m2", "por_dia",
    "porcentaje_material", "por_ml_zocalo", "merma_pct",
)
INDUCTORES_PORCENTAJE = {"porcentaje_material", "merma_pct"}
CATEGORIAS_MATERIAL = tuple(PROPIEDADES_MATERIAL.keys())


def _normalizar(s) -> str:
    return (s or "").strip().casefold()


def _buscar_indice(filas: list[dict], campo: str, valor_buscado: str, contexto: str) -> int:
    """Único punto de desambiguación de identidad de todo el dominio (tarifas y
    adicionales). Match EXACTO normalizado (trim + casefold) — nunca substring,
    nunca fuzzy, nunca índice de lista (un índice es un artefacto de una
    respuesta anterior y se invalida en silencio si otra fila se agrega/quita
    entre medias — el mismo problema de identidad ambigua que causó el
    incidente histórico de este proyecto). 0 o 2+ coincidencias => falla
    cerrado, nunca "adivina" ni toma la primera."""
    objetivo = _normalizar(valor_buscado)
    coincidencias = [i for i, f in enumerate(filas) if _normalizar(f.get(campo)) == objetivo]
    if not coincidencias:
        raise HTTPException(status_code=404, detail=f"No existe ningún '{campo}' llamado '{valor_buscado}' en {contexto}")
    if len(coincidencias) > 1:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Hay {len(coincidencias)} filas llamadas '{valor_buscado}' en {contexto} — "
                "ambiguo. Corrige los nombres duplicados desde la pantalla de Parámetros primero."
            ),
        )
    return coincidencias[0]


def _leer(conn, empresa_id, clave: str, default):
    valor = cfg_get(conn, empresa_id, clave)
    return valor if valor is not None else copy.deepcopy(default)


def _marca_actual(conn, empresa_id, clave: str) -> str:
    """Huella de concurrencia barata: la columna `actualizado` que `cfg_set` ya
    mantiene (`db/config_helpers.py`). Si la empresa nunca personalizó esta
    clave todavía, no existe fila — se usa un centinela fijo en su lugar, así
    que la primera personalización de otra persona entre proponer y confirmar
    también se detecta como "cambió" (deja de haber fila -> pasa a haberla)."""
    cur = conn.cursor()
    cur.execute(
        "SELECT actualizado FROM app_config WHERE empresa_id = %s AND clave = %s",
        (empresa_id, clave),
    )
    row = cur.fetchone()
    cur.close()
    return row[0].isoformat() if row else "__default__"


def _verificar_marca(conn, empresa_id, clave: str, marca_esperada: str | None) -> None:
    if marca_esperada is None:
        return  # llamador no pidió el chequeo (ej. router HTTP normal, sin ventana de espera)
    if _marca_actual(conn, empresa_id, clave) != marca_esperada:
        raise HTTPException(
            status_code=409,
            detail="Los parámetros cambiaron desde que se preparó esta propuesta — vuelve a intentar.",
        )


def _escribir(conn, empresa_id, clave: str, valor, usuario: dict, accion: str, metadata: dict) -> None:
    cfg_set(conn, empresa_id, clave, valor)
    log_accion(conn, accion, metadata, empresa_id=empresa_id, usuario_id=usuario["id"])


def obtener_parametros(conn, empresa_id) -> dict:
    return {
        "tarifas":     _leer(conn, empresa_id, "tarifas", TARIFAS),
        "adicionales": _leer(conn, empresa_id, "adicionales", ADICIONALES),
    }


def _validar_material(material: str) -> None:
    if material not in CATEGORIAS_MATERIAL:
        raise HTTPException(status_code=400, detail=f"material debe ser una de: {', '.join(CATEGORIAS_MATERIAL)}")


def obtener_fila_tarifa(conn, empresa_id, material: str, nombre_interno: str) -> tuple[dict, str]:
    """Lectura puntual para la vista previa de una propuesta — devuelve la fila
    y la marca de concurrencia vigente en ESE momento (se guarda en el payload
    de la propuesta y se vuelve a comparar al confirmar)."""
    _validar_material(material)
    tarifas = _leer(conn, empresa_id, "tarifas", TARIFAS)
    filas = tarifas.get(material, [])
    idx = _buscar_indice(filas, "nombre_interno", nombre_interno, f"la categoría {material}")
    return dict(filas[idx]), _marca_actual(conn, empresa_id, "tarifas")


def editar_tarifa(conn, usuario, *, material: str, nombre_interno: str,
                   nuevo_valor: float | None = None, nuevo_nombre_interno: str | None = None,
                   marca_esperada: str | None = None, metadata_extra: dict | None = None) -> dict:
    """`nuevo_valor` SIEMPRE en la unidad de almacenamiento real (fracción si
    el inductor de la fila es de tipo %, COP si no) — la conversión de puntos
    de % a fracción la hace el handler de la tool antes de llamar aquí, nunca
    esta función ni el modelo."""
    _validar_material(material)
    emp = usuario["empresa_id"]
    _verificar_marca(conn, emp, "tarifas", marca_esperada)
    if nuevo_valor is None and nuevo_nombre_interno is None:
        raise HTTPException(status_code=400, detail="No diste ningún campo para cambiar")

    tarifas = _leer(conn, emp, "tarifas", TARIFAS)
    filas = tarifas.get(material, [])
    idx = _buscar_indice(filas, "nombre_interno", nombre_interno, f"la categoría {material}")
    anterior = dict(filas[idx])

    if nuevo_valor is not None:
        filas[idx]["valor"] = nuevo_valor
    if nuevo_nombre_interno is not None:
        if any(_normalizar(f["nombre_interno"]) == _normalizar(nuevo_nombre_interno)
               for i, f in enumerate(filas) if i != idx):
            raise HTTPException(status_code=409, detail=f"Ya existe una tarifa '{nuevo_nombre_interno}' en {material}")
        filas[idx]["nombre_interno"] = nuevo_nombre_interno

    metadata = {
        "material": material,
        "nombre_interno_anterior": anterior["nombre_interno"], "valor_anterior": anterior["valor"],
        "inductor": anterior["inductor"],
        "nombre_interno_nuevo": filas[idx]["nombre_interno"], "valor_nuevo": filas[idx]["valor"],
    }
    if metadata_extra:
        metadata.update(metadata_extra)
    _escribir(conn, emp, "tarifas", tarifas, usuario, "PARAMETROS_TARIFA_EDITAR", metadata)
    return {"material": material, **filas[idx]}


def agregar_tarifa(conn, usuario, *, material: str, nombre_interno: str, inductor: str,
                    valor: float, etiqueta_pdf: str = "",
                    marca_esperada: str | None = None, metadata_extra: dict | None = None) -> dict:
    """`valor` YA viene en fracción si `inductor` es de tipo % (conversión ya
    hecha por el handler de la tool). Rechaza `inductor`/`etiqueta_pdf` fuera
    del catálogo cerrado y `nombre_interno` duplicado en la misma categoría —
    nunca crea una categoría nueva vía setdefault fuera de las conocidas."""
    _validar_material(material)
    if inductor not in INDUCTORES_VALIDOS:
        raise HTTPException(status_code=400, detail=f"inductor debe ser uno de: {', '.join(INDUCTORES_VALIDOS)}")
    if etiqueta_pdf not in ("c2_mano_obra", "c3_zocalos", "c4_insumos", ""):
        raise HTTPException(
            status_code=400,
            detail="etiqueta_pdf debe ser una de: c2_mano_obra, c3_zocalos, c4_insumos, o vacía",
        )
    emp = usuario["empresa_id"]
    _verificar_marca(conn, emp, "tarifas", marca_esperada)

    tarifas = _leer(conn, emp, "tarifas", TARIFAS)
    filas = tarifas.setdefault(material, [])
    if any(_normalizar(f["nombre_interno"]) == _normalizar(nombre_interno) for f in filas):
        raise HTTPException(status_code=409, detail=f"Ya existe una tarifa '{nombre_interno}' en {material} — usa editar_tarifa")

    nueva = {"nombre_interno": nombre_interno.strip(), "inductor": inductor, "valor": valor, "etiqueta_pdf": etiqueta_pdf}
    filas.append(nueva)
    metadata = {"material": material, **nueva}
    if metadata_extra:
        metadata.update(metadata_extra)
    _escribir(conn, emp, "tarifas", tarifas, usuario, "PARAMETROS_TARIFA_AGREGAR", metadata)
    return {"material": material, **nueva}


def quitar_tarifa(conn, usuario, *, material: str, nombre_interno: str,
                   marca_esperada: str | None = None, metadata_extra: dict | None = None) -> dict:
    """Bloquea (409) borrar la ÚLTIMA fila `inductor='merma_pct'` de una
    categoría — sin ella, `motor/calculos.py::_obtener_merma_pct` cae de
    vuelta a un valor de fábrica SIN ningún aviso en cada cotización futura de
    ese material (hallazgo real de la auditoría de seguridad: no es un caso
    para advertir y dejar pasar, es un caso para impedir)."""
    _validar_material(material)
    emp = usuario["empresa_id"]
    _verificar_marca(conn, emp, "tarifas", marca_esperada)

    tarifas = _leer(conn, emp, "tarifas", TARIFAS)
    filas = tarifas.get(material, [])
    idx = _buscar_indice(filas, "nombre_interno", nombre_interno, f"la categoría {material}")
    objetivo = filas[idx]

    if objetivo["inductor"] == "merma_pct" and sum(1 for f in filas if f["inductor"] == "merma_pct") == 1:
        default_pct = PROPIEDADES_MATERIAL.get(material, {}).get("merma_base", 0)
        raise HTTPException(
            status_code=409,
            detail=(
                f"'{nombre_interno}' es la única fila de % de merma de {material} — no se puede "
                f"borrar. Sin ella, el motor de cálculo usaría un {default_pct*100:.0f}% de fábrica "
                "sin ningún aviso en cada cotización futura de este material. Si de verdad quieres "
                "cambiar la merma, edítala en vez de borrarla."
            ),
        )

    borrada = filas.pop(idx)
    metadata = {"material": material, **borrada}
    if metadata_extra:
        metadata.update(metadata_extra)
    _escribir(conn, emp, "tarifas", tarifas, usuario, "PARAMETROS_TARIFA_QUITAR", metadata)
    return {"material": material, **borrada}


def obtener_fila_adicional(conn, empresa_id, concepto: str) -> tuple[dict, str]:
    adicionales = _leer(conn, empresa_id, "adicionales", ADICIONALES)
    idx = _buscar_indice(adicionales, "concepto", concepto, "los adicionales")
    return dict(adicionales[idx]), _marca_actual(conn, empresa_id, "adicionales")


def editar_adicional(conn, usuario, *, concepto: str, nuevo_concepto: str | None = None,
                      unidad: str | None = None, terminada: float | None = None,
                      acabados: float | None = None, estructura: float | None = None,
                      comercial: float | None = None,
                      marca_esperada: str | None = None, metadata_extra: dict | None = None) -> dict:
    emp = usuario["empresa_id"]
    _verificar_marca(conn, emp, "adicionales", marca_esperada)
    cambios = {k: v for k, v in {
        "unidad": unidad, "terminada": terminada, "acabados": acabados,
        "estructura": estructura, "comercial": comercial,
    }.items() if v is not None}
    if not cambios and nuevo_concepto is None:
        raise HTTPException(status_code=400, detail="No diste ningún campo para cambiar")

    adicionales = _leer(conn, emp, "adicionales", ADICIONALES)
    idx = _buscar_indice(adicionales, "concepto", concepto, "los adicionales")
    anterior = dict(adicionales[idx])

    adicionales[idx].update(cambios)
    if nuevo_concepto is not None:
        if any(_normalizar(f["concepto"]) == _normalizar(nuevo_concepto) for i, f in enumerate(adicionales) if i != idx):
            raise HTTPException(status_code=409, detail=f"Ya existe un adicional '{nuevo_concepto}'")
        adicionales[idx]["concepto"] = nuevo_concepto

    metadata = {"concepto_anterior": anterior["concepto"], "anterior": anterior, "nuevo": adicionales[idx]}
    if metadata_extra:
        metadata.update(metadata_extra)
    _escribir(conn, emp, "adicionales", adicionales, usuario, "PARAMETROS_ADICIONAL_EDITAR", metadata)
    return adicionales[idx]


def agregar_adicional(conn, usuario, *, concepto: str, unidad: str, terminada: float,
                       acabados: float, estructura: float, comercial: float,
                       marca_esperada: str | None = None, metadata_extra: dict | None = None) -> dict:
    emp = usuario["empresa_id"]
    _verificar_marca(conn, emp, "adicionales", marca_esperada)
    adicionales = _leer(conn, emp, "adicionales", ADICIONALES)
    if any(_normalizar(f["concepto"]) == _normalizar(concepto) for f in adicionales):
        raise HTTPException(status_code=409, detail=f"Ya existe un adicional '{concepto}' — usa editar_adicional")

    nuevo = {"concepto": concepto.strip(), "unidad": unidad, "terminada": terminada,
             "acabados": acabados, "estructura": estructura, "comercial": comercial}
    adicionales.append(nuevo)
    metadata = dict(nuevo)
    if metadata_extra:
        metadata.update(metadata_extra)
    _escribir(conn, emp, "adicionales", adicionales, usuario, "PARAMETROS_ADICIONAL_AGREGAR", metadata)
    return nuevo


def quitar_adicional(conn, usuario, *, concepto: str,
                      marca_esperada: str | None = None, metadata_extra: dict | None = None) -> dict:
    emp = usuario["empresa_id"]
    _verificar_marca(conn, emp, "adicionales", marca_esperada)
    adicionales = _leer(conn, emp, "adicionales", ADICIONALES)
    idx = _buscar_indice(adicionales, "concepto", concepto, "los adicionales")
    borrado = adicionales.pop(idx)
    metadata = dict(borrado)
    if metadata_extra:
        metadata.update(metadata_extra)
    _escribir(conn, emp, "adicionales", adicionales, usuario, "PARAMETROS_ADICIONAL_QUITAR", metadata)
    return borrado
