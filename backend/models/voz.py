"""
Modelos Pydantic de la voz de Cost (ElevenLabs).
"""
from pydantic import BaseModel, Field


class HablarIn(BaseModel):
    texto: str = Field(min_length=1, max_length=2000)
