"""Seguridad del Centro de Control en línea (ciclo /goal 2026-09-24).

- TOTP (RFC 6238, compatible con Microsoft Authenticator): 6 dígitos, 30 s,
  ±1 paso de tolerancia, y un mismo paso nunca se acepta dos veces.
- El secreto TOTP se guarda cifrado con AES-GCM; la llave vive solo en la
  variable de entorno CRM_TOTP_KEY del servidor.
- Límites e intentos fallidos en la BD (compartidos entre instancias).
- Avisos por Telegram best-effort (timeout corto, nunca rompen la respuesta).
"""
import base64
import hashlib
import hmac
import logging
import secrets
import struct
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException
from sqlalchemy import delete, func, select

from .db import RateEvent, SecurityLog

log = logging.getLogger('crm.security')

ISSUER = 'Costo360 Centro de Control'
_PASO = 30


# ── TOTP ─────────────────────────────────────────────────────────────────────

def nuevo_secreto() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')


def _codigo(secreto: str, paso: int) -> str:
    clave = base64.b32decode(secreto + '=' * (-len(secreto) % 8))
    h = hmac.new(clave, struct.pack('>Q', paso), hashlib.sha1).digest()
    o = h[-1] & 0x0F
    return str((struct.unpack('>I', h[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000).zfill(6)


def verificar_totp(secreto: str, codigo: str, ultimo_paso: int | None, ahora: float | None = None) -> int | None:
    """Devuelve el paso aceptado (para guardarlo y bloquear su reuso) o None."""
    codigo = (codigo or '').strip().replace(' ', '')
    if len(codigo) != 6 or not codigo.isdigit():
        return None
    actual = int((ahora if ahora is not None else time.time()) // _PASO)
    for paso in (actual - 1, actual, actual + 1):
        if ultimo_paso is not None and paso <= ultimo_paso:
            continue
        if hmac.compare_digest(_codigo(secreto, paso), codigo):
            return paso
    return None


def uri_totp(secreto: str, email: str) -> str:
    return (f'otpauth://totp/{quote(ISSUER)}:{quote(email)}?secret={secreto}'
            f'&issuer={quote(ISSUER)}&algorithm=SHA1&digits=6&period={_PASO}')


# ── Cifrado del secreto ──────────────────────────────────────────────────────

def _aes(llave_b64: str) -> AESGCM:
    llave = base64.b64decode(llave_b64)
    if len(llave) != 32:
        raise ValueError('CRM_TOTP_KEY debe ser de 32 bytes.')
    return AESGCM(llave)


def cifrar(texto: str, llave_b64: str) -> str:
    nonce = secrets.token_bytes(12)
    return base64.b64encode(nonce + _aes(llave_b64).encrypt(nonce, texto.encode(), b'totp')).decode()


def descifrar(dato: str, llave_b64: str) -> str:
    crudo = base64.b64decode(dato)
    return _aes(llave_b64).decrypt(crudo[:12], crudo[12:], b'totp').decode()


# ── Códigos de recuperación ──────────────────────────────────────────────────

def nuevos_codigos_recuperacion(n: int = 10) -> list[str]:
    return ['-'.join(secrets.token_hex(3) for _ in range(2)) for _ in range(n)]


def hash_recuperacion(codigo: str) -> str:
    return hashlib.sha256(codigo.strip().lower().encode()).hexdigest()


# ── Límites e intentos (en BD) ───────────────────────────────────────────────

def _desde(segundos: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(seconds=segundos)).isoformat()


def contar(session, clave: str, ventana: int) -> int:
    return session.scalar(select(func.count()).select_from(RateEvent)
                          .where(RateEvent.key == clave, RateEvent.ts > _desde(ventana))) or 0


def registrar(session, clave: str) -> None:
    session.add(RateEvent(key=clave))


def limitar(session, clave: str, limite: int, ventana: int) -> None:
    """Cuenta y registra un evento; 429 si se supera el límite."""
    if contar(session, clave, ventana) >= limite:
        raise HTTPException(429, 'Demasiados intentos. Espera unos minutos.')
    registrar(session, clave)


def purgar(session) -> None:
    session.execute(delete(RateEvent).where(RateEvent.ts < _desde(86400)))


def bitacora(session, evento: str, user_id: str | None = None, **detalle) -> None:
    session.add(SecurityLog(user_id=user_id, event=evento, detail=detalle))


# ── Aviso por Telegram ───────────────────────────────────────────────────────

def avisar(settings, texto: str) -> None:
    if not (settings.telegram_token and settings.telegram_chat):
        return
    try:
        httpx.post(f'https://api.telegram.org/bot{settings.telegram_token}/sendMessage',
                   json={'chat_id': settings.telegram_chat, 'text': '🔐 Centro de Control\n' + texto}, timeout=3)
    except Exception as exc:  # nunca loguear la URL: lleva el token
        log.warning('Aviso de Telegram no enviado: %s', type(exc).__name__)
