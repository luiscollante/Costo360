"""Métricas del negocio: reparto de fijos por precio de plan, explicaciones y token."""
import os

import pytest
from fastapi import HTTPException

from backend.routers.metricas_admin import verificar_token_metricas
from backend.services import metricas_service as m


def _t(eid, precio, activo=True):
    return {"empresa_id": eid, "precio_plan_cop": precio, "taller_activo": activo, "costo_ia_cop_mes": 0}


def test_reparto_proporcional_al_precio_del_plan():
    talleres = [_t("a", 150000), _t("b", 875000), _t("c", 375000, activo=False)]
    r = m._reparto(talleres, 102500)
    assert set(r) == {"a", "b"}  # el inactivo no carga fijo
    assert round(r["a"]) == 15000 and round(r["b"]) == 87500
    assert round(sum(r.values())) == 102500


def test_reparto_sin_talleres_activos():
    assert m._reparto([_t("a", 150000, activo=False)], 262199) == {}


def test_explicacion_cero_talleres_dice_por_que():
    e = m._explicar_reparto(0, 262199)
    assert "ningún taller activo" in e and "$262.199" in e


def test_explicacion_pocos_talleres_advierte_que_no_es_error():
    e = m._explicar_reparto(1, 262199)
    assert "1 taller activo" in e and "no es un error" in e and "$262.199" in e and "$26.220" in e


def test_explicacion_muchos_talleres_sin_advertencia():
    assert "no es un error" not in m._explicar_reparto(12, 262199)


def test_formato_pesos():
    assert m._pesos(1234567) == "$1.234.567" and m._pesos(-500) == "-$500"


def test_token_metricas(monkeypatch):
    monkeypatch.delenv("METRICAS_API_TOKEN", raising=False)
    with pytest.raises(HTTPException) as e:
        verificar_token_metricas("x")
    assert e.value.status_code == 503
    monkeypatch.setenv("METRICAS_API_TOKEN", "correcto")
    with pytest.raises(HTTPException) as e:
        verificar_token_metricas("otro")
    assert e.value.status_code == 401
    assert verificar_token_metricas("correcto") is None


@pytest.mark.skipif(not os.environ.get("DATABASE_URL"), reason="requiere DATABASE_URL")
def test_transaccion_de_metricas_no_escribe():
    import psycopg2
    with psycopg2.connect(os.environ["DATABASE_URL"]) as conn:
        m.preparar_solo_lectura(conn)
        with pytest.raises(psycopg2.errors.ReadOnlySqlTransaction):
            conn.cursor().execute("insert into metricas.pagos_excluidos values ('x', 'y')")
