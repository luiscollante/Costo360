import os
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from backend.db.client import db_rls
from backend.db.config_helpers import cfg_get
from backend.db.deps import verificar_dispositivo
from backend.middleware.auth import get_current_user
from backend.middleware.rate_limiter import limiter

router = APIRouter(prefix="/api/agente", tags=["agente"],
                   dependencies=[Depends(verificar_dispositivo)])

_MODELO = "gemini-3.5-flash-lite"

_SYSTEM_PROMPT = """Eres el Asistente de Parámetros de Costo360, un SaaS de cotización para talleres \
de fabricación en piedra natural (mármol, granito, sinterizado, quarztone, quarzita) en Colombia.

Tu única función es ayudar al usuario a entender y estructurar los COSTOS DIRECTOS de fabricación \
que configura en la sección de Parámetros de su empresa (mano de obra por metro lineal o por área, \
instalación de zócalos, desgaste de disco, consumibles, merma/desperdicio de material, riesgo de rotura, etc.).

Reglas:
- Responde siempre en español, de forma breve y práctica (máximo 4-5 líneas salvo que el usuario pida detalle).
- Si el usuario describe un costo que no tiene claro cómo clasificar, sugiérele cuál de estos tipos de \
inductor le queda mejor: "por_ml" (por metro lineal, típico de mano de obra en bordes), "por_m2_mano_obra" \
(mano de obra por área, para pisos/fachadas), "por_m2" (insumo o consumible cortado), "por_dia" (costo fijo \
del proyecto), "porcentaje_material" (% sobre el costo del material) o "merma_pct" (% de desperdicio).
- No inventes cifras de precios; si te preguntan cuánto cobrar, aclara que eso depende de su mercado local \
y anímalo a comparar con su costo real.
- No respondas preguntas fuera del tema de costos, cotización y parámetros de Costo360 — redirige amablemente.
- No tienes acceso a escribir ni modificar datos: solo puedes explicar y sugerir.

Este es el estado actual de las tarifas configuradas por la empresa (JSON, puede estar vacío si aún no ha \
personalizado nada):
"""


class MensajeHistorial(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    mensaje: str
    historial: list[MensajeHistorial] = []


def _client():
    api_key = os.getenv("GEMINI_AGENTE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    from google import genai
    return genai.Client(api_key=api_key)


@router.post("/chat")
@limiter.limit("20/minute")
def chat_agente(
    request: Request,
    body: ChatIn,
    conn=Depends(db_rls),
    usuario=Depends(get_current_user),
):
    mensaje = (body.mensaje or "").strip()
    if not mensaje:
        raise HTTPException(status_code=400, detail="Mensaje vacío")
    if len(mensaje) > 2000:
        raise HTTPException(status_code=400, detail="Mensaje demasiado largo")

    client = _client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="El asistente de IA no está configurado en este entorno.",
        )

    from google.genai import types

    tarifas = cfg_get(conn, usuario["empresa_id"], "tarifas") or {}
    system_instruction = _SYSTEM_PROMPT + json.dumps(tarifas, ensure_ascii=False)

    contents = []
    for turno in body.historial[-10:]:
        rol = "model" if turno.role == "assistant" else "user"
        contents.append(types.Content(role=rol, parts=[types.Part.from_text(text=turno.content[:2000])]))
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=mensaje)]))

    try:
        response = client.models.generate_content(
            model=_MODELO,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=500,
                temperature=0.4,
            ),
        )
        respuesta = (response.text or "").strip()
    except Exception as e:
        print(f"[agente] ERROR llamando a Gemini: {e}", flush=True)
        raise HTTPException(status_code=502, detail="El asistente no pudo responder. Intenta de nuevo.")

    if not respuesta:
        raise HTTPException(status_code=502, detail="El asistente no pudo responder. Intenta de nuevo.")

    return {"respuesta": respuesta}
