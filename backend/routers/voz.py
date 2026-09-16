"""
Voz de Cost (ElevenLabs) — texto-a-voz y voz-a-texto. Proxy simple contra la
API de ElevenLabs: la clave (`ELEVENLABS_API_KEY`) nunca sale del backend, el
navegador nunca la ve.

Decisión del fundador (2026-09-16): con solo 10.000 créditos, "hablar" es
manual — un botón de reproducir por mensaje en el frontend, nunca automático
— para no agotar el saldo sin que nadie se dé cuenta. Ese límite se aplica en
la interfaz, no aquí; este router solo expone las 2 operaciones y sus topes
anti-abuso (texto/audio máximo, rate limit) — mismo patrón que
`routers/nesting.py`.
"""
import os

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response

from backend.db.deps import verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limiter import limiter
from backend.models.voz import HablarIn

router = APIRouter(prefix="/api/voz", tags=["voz"],
                   dependencies=[Depends(verificar_dispositivo)])

_TIMEOUT = 30.0
_BASE = "https://api.elevenlabs.io/v1"
_MAX_CARACTERES = 2000  # ya lo topa HablarIn, doble candado si cambia el modelo
_MAX_BYTES_AUDIO = 10 * 1024 * 1024  # 10 MB — un mensaje de voz no debería pasar de esto


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
def hablar(request: Request, body: HablarIn, usuario=Depends(get_current_user)):
    """Convierte el texto de un mensaje de Cost a voz. Devuelve el audio (mp3) directo."""
    api_key = _api_key()
    voice_id = _voice_id()
    texto = body.texto.strip()[:_MAX_CARACTERES]
    if not texto:
        raise HTTPException(status_code=400, detail="No hay texto para leer")
    with httpx.Client(timeout=_TIMEOUT) as c:
        r = c.post(
            f"{_BASE}/text-to-speech/{voice_id}",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={"text": texto, "model_id": "eleven_multilingual_v2"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="ElevenLabs no pudo generar el audio")
    return Response(content=r.content, media_type="audio/mpeg")


@router.post("/escuchar")
@limiter.limit("30/hour")
async def escuchar(request: Request, file: UploadFile = File(...), usuario=Depends(get_current_user)):
    """Transcribe un audio grabado en el navegador (el micrófono) a texto."""
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
    return {"texto": r.json().get("text", "")}
