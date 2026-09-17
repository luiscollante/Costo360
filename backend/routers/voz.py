"""
Voz de Cost (ElevenLabs) — texto-a-voz y voz-a-texto. Proxy simple contra la
API de ElevenLabs: la clave (`ELEVENLABS_API_KEY`) nunca sale del backend, el
navegador nunca la ve.

Decisión del fundador (2026-09-16): con solo 10.000 créditos, "hablar" es
manual por defecto — un botón de reproducir por mensaje en el frontend — con
una excepción explícita: si el turno empezó por micrófono, el frontend
reproduce la respuesta sola (`CostChat.tsx`). Ese límite se aplica en la
interfaz, no aquí; este router solo expone las 2 operaciones y sus topes
anti-abuso (texto/audio máximo, rate limit) — mismo patrón que
`routers/nesting.py`.

Antes de mandar el texto a ElevenLabs se normaliza con
`services/voz_service.normalizar_para_voz` — sin esto, el markdown crudo que
genera el modelo (negritas, listas, "$1.339.000", "m²", "%"...) se lee mal o
directamente mal (hallazgo real del fundador, 2026-09-16: un monto con más de
un punto de miles se leía como si fuera mil veces menor). Ver ese módulo para
el detalle completo de cada regla.

`model_id` es `eleven_flash_v2_5` (no `eleven_multilingual_v2`) — es el
modelo que ElevenLabs recomienda para uso conversacional en vivo, con
latencia bastante menor; el mismo motor de pronunciación de base, así que las
reglas de `voz_service` le sirven igual. `voice_settings.speed` más bajo que
el default (1.0) porque el fundador reportó que las respuestas largas se oían
demasiado rápido.
"""
import os

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response

from backend.db.client import db_rls
from backend.db.deps import verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limiter import limiter
from backend.models.voz import HablarIn
from backend.services import consumo_service
from backend.services.voz_service import normalizar_para_voz

router = APIRouter(prefix="/api/voz", tags=["voz"],
                   dependencies=[Depends(verificar_dispositivo)])

_TIMEOUT = 30.0
_BASE = "https://api.elevenlabs.io/v1"
_MODEL_ID = "eleven_flash_v2_5"
_VOICE_SETTINGS = {
    "speed": 0.92,
    "stability": 0.55,
    "similarity_boost": 0.75,
    "style": 0.1,
    "use_speaker_boost": True,
}
_MAX_CARACTERES = 2000  # ya lo topa HablarIn, doble candado si cambia el modelo — sobre el texto CRUDO, antes de normalizar
# La normalización puede EXPANDIR el texto (deletrea montos en palabras: "$2.914.000"
# de 11 caracteres pasa a "dos millones novecientos catorce mil pesos", 44) — tope
# aparte sobre el resultado ya normalizado, para no mandarle a ElevenLabs algo
# desproporcionado si un mensaje viene cargado de montos.
_MAX_CARACTERES_NORMALIZADO = 4000
_MAX_BYTES_AUDIO = 10 * 1024 * 1024  # 10 MB — un mensaje de voz no debería pasar de esto


def _recortar_en_oracion(texto: str, limite: int) -> str:
    """Nunca cortar a mitad de palabra (y menos a mitad de un monto recién
    deletreado en palabras) — recorta en el último punto completo antes del
    límite."""
    if len(texto) <= limite:
        return texto
    corte = texto.rfind(".", 0, limite)
    return texto[:corte + 1] if corte != -1 else texto[:limite]


def _api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="La voz de Cost no está configurada en este entorno.")
    return key


def _voice_id() -> str:
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "")
    if not voice_id:
        raise HTTPException(status_code=503, detail="No hay una voz elegida para Cost todavía.")
    return voice_id


@router.post("/hablar")
@limiter.limit("30/hour")
def hablar(request: Request, body: HablarIn, conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Convierte el texto de un mensaje de Cost a voz. Devuelve el audio (mp3) directo."""
    consumo_service.verificar_tope_voz(conn, usuario)
    api_key = _api_key()
    voice_id = _voice_id()
    texto_crudo = body.texto.strip()[:_MAX_CARACTERES]
    if not texto_crudo:
        raise HTTPException(status_code=400, detail="No hay texto para leer")
    texto = normalizar_para_voz(texto_crudo)
    texto = _recortar_en_oracion(texto, _MAX_CARACTERES_NORMALIZADO)
    if not texto:
        raise HTTPException(status_code=400, detail="No hay texto para leer")
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_BASE}/text-to-speech/{voice_id}",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={"text": texto, "model_id": _MODEL_ID, "voice_settings": _VOICE_SETTINGS},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="ElevenLabs no pudo generar el audio")
    consumo_service.registrar_consumo_voz(conn, usuario, segundos_audio=consumo_service.estimar_segundos_tts(texto))
    return Response(content=r.content, media_type="audio/mpeg")


@router.post("/escuchar")
@limiter.limit("30/hour")
async def escuchar(request: Request, file: UploadFile = File(...), conn=Depends(db_rls), usuario=Depends(get_current_user)):
    """Transcribe un audio grabado en el navegador (el micrófono) a texto."""
    consumo_service.verificar_tope_voz(conn, usuario)
    api_key = _api_key()
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="No se recibió audio")
    if len(audio) > _MAX_BYTES_AUDIO:
        raise HTTPException(status_code=400, detail="El audio es demasiado largo")
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_BASE}/speech-to-text",
            headers={"xi-api-key": api_key},
            data={"model_id": "scribe_v1"},
            files={"file": (file.filename or "audio.webm", audio, file.content_type or "audio/webm")},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="ElevenLabs no pudo transcribir el audio")
    consumo_service.registrar_consumo_voz(conn, usuario, segundos_audio=consumo_service.estimar_segundos_stt(len(audio)))
    return {"texto": r.json().get("text", "")}
