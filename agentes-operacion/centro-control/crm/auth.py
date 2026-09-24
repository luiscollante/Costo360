import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy import delete, select

from . import security
from .db import RecoveryCode, Session, User, now

COOKIE = 'costo360_crm_session'          # modo local (piloto de siempre)
COOKIE_ONLINE = '__Host-c360_session'    # en línea: Secure, path=/, sin dominio
_SESION_HORAS_LOCAL = 8
_SESION_HORAS_ONLINE = 12                # vida máxima absoluta en línea
_INACTIVIDAD_MIN = 30                    # en línea: cierre por inactividad
_PENDIENTE_MIN = 5                       # sesión a medio camino (falta el código)


def cookie_name(settings):
    return COOKIE_ONLINE if settings.online else COOKIE


def cookie_path(settings):
    return '/' if settings.online else '/api'


def set_cookie(response, settings, token, horas):
    response.set_cookie(cookie_name(settings), token, httponly=True, samesite='strict',
                        secure=settings.online, max_age=horas * 3600, path=cookie_path(settings))


def delete_cookie(response, settings):
    response.delete_cookie(cookie_name(settings), path=cookie_path(settings),
                           secure=settings.online, httponly=True, samesite='strict')


def _en(minutos=0, horas=0):
    return (datetime.now(timezone.utc) + timedelta(minutes=minutos, hours=horas)).isoformat()


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


def login(db, email, password, settings=None, ip='local'):
    """Local: igual que siempre (sesión completa). En línea: la sesión nace
    SIN segundo factor (mfa=False, 5 min) y solo sirve para verificar el código."""
    online = bool(settings and settings.online)
    email = email.strip().lower()
    fallo = None
    fallidos = 0
    with db.transaction(write=True) as session:
        if online:
            security.purgar(session)
            security.limitar(session, 'login-ip:' + ip, 20, 900)
            if security.contar(session, 'fail:' + email, 1800) >= 5:
                security.bitacora(session, 'login_bloqueado', ip=ip)
                fallo = 'bloqueado'
        if not fallo:
            user = session.scalar(select(User).where(User.email == email))
            ok = verify(password, user.password if user else DUMMY)
            if not user or not ok or not user.active:
                fallo = 'credenciales'
                if online:
                    security.registrar(session, 'fail:' + email)
                    security.bitacora(session, 'login_fallido', user.id if user else None, ip=ip)
                    fallidos = security.contar(session, 'fail:' + email, 1800) + 1
        if not fallo:
            if online and not user.totp_secret:
                raise HTTPException(403, 'Tu cuenta no tiene configurado el código de verificación. Pídele al administrador activarlo.')
            token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            session.execute(delete(Session).where(Session.expires <= now()))
            session.add(Session(token_hash=digest(token), user_id=user.id, csrf=csrf, mfa=not online,
                                last_seen=now(),
                                expires=_en(minutos=_PENDIENTE_MIN) if online else _en(horas=_SESION_HORAS_LOCAL)))
    # Fuera de la transacción: el fallo ya quedó guardado (no se revierte).
    if fallo == 'bloqueado':
        security.avisar(settings, f'⛔ Cuenta bloqueada 30 min por intentos fallidos: {email}')
        raise HTTPException(429, 'Demasiados intentos fallidos. La cuenta quedó bloqueada 30 minutos.')
    if fallo:
        if online and fallidos >= 3:
            security.avisar(settings, f'⚠️ {fallidos} intentos fallidos de inicio de sesión para {email} (IP {ip}).')
        raise HTTPException(401, 'Correo o contraseña incorrectos.')
    return token, csrf, user


def verificar_codigo(db, token, codigo, settings, ip='local'):
    """Segundo factor: código de la app autenticadora o de recuperación. Si es
    válido, descarta la sesión pendiente y emite un token NUEVO (rotación)."""
    ok = False
    with db.transaction(write=True) as session:
        auth = session.get(Session, digest(token)) if token else None
        if not auth or auth.mfa or auth.expires <= now():
            raise HTTPException(401, 'Tu sesión expiró. Vuelve a ingresar tu contraseña.')
        user = session.get(User, auth.user_id)
        security.limitar(session, 'totp:' + user.id, 5, 300)
        secreto = security.descifrar(user.totp_secret, settings.totp_key)
        paso = security.verificar_totp(secreto, codigo, user.totp_last_step)
        if paso is not None:
            user.totp_last_step = paso
            ok = True
        else:
            rec = session.scalar(select(RecoveryCode).where(
                RecoveryCode.user_id == user.id, RecoveryCode.used.is_(False),
                RecoveryCode.code_hash == security.hash_recuperacion(codigo or '')))
            if rec:
                rec.used = True
                ok = True
                security.bitacora(session, 'codigo_recuperacion_usado', user.id, ip=ip)
        if ok:
            session.delete(auth)
            nuevo, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            session.add(Session(token_hash=digest(nuevo), user_id=user.id, csrf=csrf, mfa=True,
                                last_seen=now(), expires=_en(horas=_SESION_HORAS_ONLINE)))
            security.bitacora(session, 'login_ok', user.id, ip=ip)
        else:
            security.bitacora(session, 'codigo_fallido', user.id, ip=ip)
    if not ok:
        raise HTTPException(401, 'Código incorrecto o ya usado. Espera el siguiente código de la app.')
    security.avisar(settings, f'✅ Inicio de sesión de {user.email} (IP {ip}). Si no fuiste tú, activa el interruptor de apagado.')
    return nuevo, csrf, user


def configurar_totp(db, email, settings):
    """Activa (o reemplaza) el código de verificación de una cuenta. Solo se
    ejecuta desde la consola (crm.manage), nunca por la web: así nadie que
    adivine la contraseña puede registrar SU propio celular. Devuelve el
    secreto (para el QR) y 10 códigos de recuperación, que se muestran UNA vez."""
    secreto = security.nuevo_secreto()
    codigos = security.nuevos_codigos_recuperacion()
    with db.transaction(write=True) as session:
        user = session.scalar(select(User).where(User.email == email.strip().lower()))
        if not user:
            raise ValueError('No existe esa cuenta.')
        user.totp_secret = security.cifrar(secreto, settings.totp_key)
        user.totp_last_step = None
        session.execute(delete(RecoveryCode).where(RecoveryCode.user_id == user.id))
        for c in codigos:
            session.add(RecoveryCode(user_id=user.id, code_hash=security.hash_recuperacion(c)))
        # Cambiar el 2º factor invalida todas las sesiones abiertas.
        session.execute(delete(Session).where(Session.user_id == user.id))
        security.bitacora(session, 'totp_configurado', user.id)
    return secreto, security.uri_totp(secreto, user.email), codigos


def cerrar_todas(db, user_id):
    with db.transaction(write=True) as session:
        session.execute(delete(Session).where(Session.user_id == user_id))


def public_user(user):
    return {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role}


def current_user(request: Request):
    settings = request.app.state.settings
    token = request.cookies.get(cookie_name(settings), '')
    with request.app.state.db.transaction() as session:
        auth = session.get(Session, digest(token)) if token else None
        if not auth or auth.expires <= now() or not auth.mfa:
            raise HTTPException(401, 'Inicia sesión para continuar.')
        if settings.online:
            limite = (datetime.now(timezone.utc) - timedelta(minutes=_INACTIVIDAD_MIN)).isoformat()
            if not auth.last_seen or auth.last_seen < limite:
                session.delete(auth)
                session.commit()
                raise HTTPException(401, 'Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.')
            if auth.last_seen < (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat():
                auth.last_seen = now()
        user = session.get(User, auth.user_id)
        if not user or not user.active:
            raise HTTPException(401, 'Tu acceso no está activo.')
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            if not hmac.compare_digest(request.headers.get('X-CSRF-Token', ''), auth.csrf):
                raise HTTPException(403, 'Solicitud no autorizada. Vuelve a iniciar sesión.')
        request.state.csrf = auth.csrf
        return user
