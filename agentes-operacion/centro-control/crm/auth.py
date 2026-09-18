import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy import delete, select

from .db import Session, User, now

COOKIE = 'costo360_crm_session'


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(password):
    if not 12 <= len(password) <= 256:
        raise ValueError('La contraseña debe tener entre 12 y 256 caracteres.')
    salt = secrets.token_bytes(16)
    value = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return salt.hex() + ':' + value.hex()


def verify(password, stored):
    try:
        salt, expected = stored.split(':')
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError):
        return False


DUMMY = password_hash(secrets.token_urlsafe(24))


class RateGate:
    """Límite local por proceso. Reiniciar reinicia el contador; producción requiere almacén compartido."""
    def __init__(self):
        self.lock = threading.Lock()
        self.items = defaultdict(deque)

    def check(self, key, limit=10, window=900):
        with self.lock:
            now_ts = time.monotonic()
            events = self.items[key]
            while events and events[0] <= now_ts - window:
                events.popleft()
            if len(events) >= limit:
                raise HTTPException(429, 'Demasiados intentos. Espera unos minutos.')
            events.append(now_ts)


def create_user(db, email, name, password, role='fundador'):
    if role not in ('fundador', 'comercial', 'lectura'):
        raise ValueError('Rol inválido.')
    if '@' not in email or not name.strip():
        raise ValueError('Nombre y correo válidos requeridos.')
    with db.transaction(write=True) as session:
        if session.scalar(select(User).where(User.email == email.strip().lower())):
            raise ValueError('El usuario ya existe; no se sobrescribirá.')
        user = User(email=email.strip().lower(), name=name.strip(), password=password_hash(password), role=role)
        session.add(user)
        session.flush()
        return user


def login(db, email, password):
    with db.transaction(write=True) as session:
        user = session.scalar(select(User).where(User.email == email.strip().lower()))
        ok = verify(password, user.password if user else DUMMY)
        if not user or not ok or not user.active:
            raise HTTPException(401, 'Correo o contraseña incorrectos.')
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        session.execute(delete(Session).where(Session.expires <= now()))
        session.add(Session(token_hash=digest(token), user_id=user.id, csrf=csrf,
                            expires=(datetime.now(timezone.utc) + timedelta(hours=8)).isoformat()))
        return token, csrf, user


def public_user(user):
    return {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}


def current_user(request: Request):
    token = request.cookies.get(COOKIE, '')
    with request.app.state.db.transaction() as session:
        auth = session.get(Session, digest(token)) if token else None
        if not auth or auth.expires <= now():
            raise HTTPException(401, 'Inicia sesión para continuar.')
        user = session.get(User, auth.user_id)
        if not user or not user.active:
            raise HTTPException(401, 'Tu acceso no está activo.')
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            if not hmac.compare_digest(request.headers.get('X-CSRF-Token', ''), auth.csrf):
                raise HTTPException(403, 'Solicitud no autorizada. Vuelve a iniciar sesión.')
        request.state.csrf = auth.csrf
        return user
