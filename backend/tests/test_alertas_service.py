"""Pruebas de la lógica de avisos de consumo (sin base de datos real ni red)."""
from backend.services import alertas_service, consumo_service


class CursorFalso:
    """Simula `alerta_consumo_enviada` con su UNIQUE (ámbito, api, umbral, mes)."""

    def __init__(self):
        self.enviadas = set()
        self._ultimo = None

    def execute(self, sql, params):
        ambito, api, umbral, _detalle = params
        clave = (ambito, api, umbral)
        if clave in self.enviadas:
            self._ultimo = None           # ON CONFLICT DO NOTHING → sin RETURNING
        else:
            self.enviadas.add(clave)
            self._ultimo = (umbral,)

    def fetchone(self):
        return self._ultimo


def _capturar(monkeypatch):
    enviados = []
    monkeypatch.setattr(alertas_service, "_notificar", lambda titulo, texto: enviados.append(titulo))
    return enviados


def test_no_avisa_por_debajo_de_70(monkeypatch):
    enviados = _capturar(monkeypatch)
    alertas_service._evaluar(CursorFalso(), "empresa:1", "Taller", "gemini_cost", 60, 100, "x")
    assert enviados == []


def test_salto_de_varios_umbrales_manda_un_solo_mensaje_con_el_mas_alto(monkeypatch):
    enviados = _capturar(monkeypatch)
    cur = CursorFalso()
    alertas_service._evaluar(cur, "empresa:1", "Taller", "gemini_cost", 85, 100, "x")
    assert len(enviados) == 1 and "80%" in enviados[0]
    assert {u for (_, _, u) in cur.enviadas} == {70, 80}


def test_el_mismo_umbral_no_se_repite_en_el_mes(monkeypatch):
    enviados = _capturar(monkeypatch)
    cur = CursorFalso()
    alertas_service._evaluar(cur, "empresa:1", "Taller", "gemini_cost", 75, 100, "x")
    alertas_service._evaluar(cur, "empresa:1", "Taller", "gemini_cost", 78, 100, "x")
    assert len(enviados) == 1


def test_sigue_avisando_despues_del_100_porque_nunca_se_bloquea(monkeypatch):
    enviados = _capturar(monkeypatch)
    cur = CursorFalso()
    for gasto in (75, 105, 160, 210):
        alertas_service._evaluar(cur, "empresa:1", "Taller", "gemini_cost", gasto, 100, "x")
    assert [t.split("% ")[0].split()[-1] for t in enviados] == ["70", "100", "150", "200"]


def test_ambitos_distintos_no_se_pisan(monkeypatch):
    enviados = _capturar(monkeypatch)
    cur = CursorFalso()
    alertas_service._evaluar(cur, "usuario:a", "Ana", "elevenlabs_voz", 8, 10, "x")
    alertas_service._evaluar(cur, "usuario:b", "Beto", "elevenlabs_voz", 8, 10, "x")
    assert len(enviados) == 2


def test_tope_cero_no_divide_por_cero_ni_avisa(monkeypatch):
    enviados = _capturar(monkeypatch)
    assert consumo_service.porcentaje(50, 0) == 0.0
    alertas_service._evaluar(CursorFalso(), "empresa:1", "Taller", "gemini_cost", 50, 0, "x")
    assert enviados == []


def test_puntos_de_entrada_nunca_lanzan(monkeypatch):
    def rota():
        raise RuntimeError("sin base de datos")
    monkeypatch.setattr(alertas_service, "_conexion_servicio", rota)
    alertas_service.tras_consumo_gemini("e1")
    alertas_service.tras_consumo_voz("u1", pendiente_segundos=10)
    alertas_service.tras_consumo_render("e1", pendiente_usd=0.05)


def test_telegram_sin_configurar_no_lanza(monkeypatch):
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    assert alertas_service._enviar_telegram("hola") is False


def test_un_mensaje_de_voz_de_1000_creditos_son_60_segundos():
    assert round(consumo_service.segundos_a_mensajes_voz(60), 2) == 1.0
