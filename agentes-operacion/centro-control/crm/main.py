import asyncio
from pathlib import Path
import hmac
import logging
import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from . import agent, auth, autonomo, leads, services, sync
from .config import ROOT, Settings
from .db import Audit, Database, Message, Proposal, Session, Usage, now
from .schemas import Chat, Change, Login, PARENTS, ProposalIn, SCHEMAS

log = logging.getLogger('crm.main')

# Cabeceras de seguridad del modo en línea (el HTML estático recibe las
# mismas desde vercel.json).
_CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
        "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'; manifest-src 'self'")


class CodigoIn(BaseModel):
    codigo: str = Field(min_length=6, max_length=20)
    recordar: bool = False


def client_ip(request: Request, settings) -> str:
    # En línea, Vercel fija `x-real-ip` (no falsificable por el cliente);
    # NUNCA se confía en X-Forwarded-For.
    if settings.online:
        return request.headers.get('x-real-ip', 'desconocida')[:64]
    return request.client.host if request.client else 'local'


def create_app(settings=None):
    settings = settings or Settings()
    app = FastAPI(title='Costo360 · Centro de control interno',
                  docs_url=None if settings.online else '/api/docs', redoc_url=None, openapi_url=None if settings.online else '/openapi.json')
    app.state.settings = settings
    app.state.db = Database(settings.database)
    app.state.agent = agent.Agent(app.state.db, settings)
    gate = auth.RateGate()  # solo modo local; en línea los límites viven en la BD
    hosts = list(settings.public_hosts) if settings.online else ['127.0.0.1', 'localhost', '[::1]']
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=hosts)

    @app.middleware('http')
    async def boundary(request: Request, call_next):
        if settings.online:
            if settings.disabled:
                return JSONResponse({'detail': 'El Centro de Control en línea está apagado temporalmente.'}, 503)
        # Local: aplicación deliberadamente no publicable. No confiar en X-Forwarded-For.
        elif request.client and request.client.host not in ('127.0.0.1', '::1', 'testclient'):
            return JSONResponse({'detail': 'Este piloto solo permite conexiones locales.'}, 403)
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            if request.headers.get('origin') not in settings.origins:
                return JSONResponse({'detail': 'Origen no autorizado.'}, 403)
            if settings.online and request.headers.get('sec-fetch-site', 'same-origin') not in ('same-origin', 'none'):
                return JSONResponse({'detail': 'Origen no autorizado.'}, 403)
            try:
                size = int(request.headers.get('content-length', '0'))
            except ValueError:
                return JSONResponse({'detail': 'Tamaño inválido.'}, 400)
            if size > 65536:
                return JSONResponse({'detail': 'Solicitud demasiado grande.'}, 413)
            body = await request.body()
            if len(body) > 65536:
                return JSONResponse({'detail': 'Solicitud demasiado grande.'}, 413)
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Cache-Control'] = 'no-store'
        if settings.online:
            response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains'
            response.headers['Content-Security-Policy'] = _CSP
            response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=()'
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        fields = ', '.join('.'.join(str(x) for x in error['loc']) for error in exc.errors())
        return JSONResponse({'detail': 'Revisa los campos de la solicitud: ' + fields}, 422)

    @app.exception_handler(IntegrityError)
    async def integrity(request, exc):
        return JSONResponse({'detail': 'El cambio entra en conflicto con un registro existente. Actualiza la vista.'}, 409)

    @app.exception_handler(OperationalError)
    async def unavailable(request, exc):
        return JSONResponse({'detail': 'El almacenamiento no está disponible temporalmente. No se confirmó el cambio.'}, 503)

    @app.exception_handler(Exception)
    async def unexpected(request, exc):
        # Nunca devolver trazas ni detalles internos.
        log.exception('Error no controlado')
        return JSONResponse({'detail': 'Ocurrió un error inesperado. No se confirmó ningún cambio.'}, 500)

    @app.get('/api/health')
    def health():
        if settings.online:  # en internet no se revela configuración interna
            return {'status': 'ok', 'online': True, 'demo': False}
        return {'status': 'ok', 'local_only': not settings.online, 'online': settings.online, 'demo': settings.demo,
                'gemini_configured': bool(settings.gemini_key and settings.gemini_model)}

    @app.post('/api/login')
    def login(body: Login, request: Request, response: Response):
        ip = client_ip(request, settings)
        if not settings.online:
            gate.check('login:' + ip)
        token, csrf, user, completa = auth.login(app.state.db, body.email, body.password, settings, ip,
                                                 request.cookies.get(auth.DEVICE_COOKIE))
        if settings.online and completa:
            auth.set_cookie(response, settings, token, 12)
            return {'user': auth.public_user(user), 'csrf': csrf}
        if settings.online:
            # Falta el segundo factor: cookie de vida corta, sin datos de usuario.
            auth.set_cookie(response, settings, token, minutos=5)
            return {'mfa_required': True}
        auth.set_cookie(response, settings, token, 8)
        return {'user': auth.public_user(user), 'csrf': csrf}

    @app.post('/api/login/codigo')
    def login_codigo(body: CodigoIn, request: Request, response: Response):
        if not settings.online:
            raise HTTPException(404, 'No disponible en modo local.')
        token = request.cookies.get(auth.cookie_name(settings), '')
        nuevo, csrf, user, device = auth.verificar_codigo(app.state.db, token, body.codigo, settings,
                                                          client_ip(request, settings), body.recordar,
                                                          request.headers.get('user-agent', ''))
        auth.set_cookie(response, settings, nuevo, 12)
        if device:
            auth.set_device_cookie(response, device)
        return {'user': auth.public_user(user), 'csrf': csrf}

    @app.get('/api/me')
    def me(request: Request, user=Depends(auth.current_user)):
        return {'user': auth.public_user(user), 'csrf': request.state.csrf}

    @app.post('/api/logout')
    def logout(request: Request, response: Response, user=Depends(auth.current_user)):
        with app.state.db.transaction(write=True) as session:
            session.execute(delete(Session).where(Session.token_hash == auth.digest(request.cookies.get(auth.cookie_name(settings), ''))))
        auth.delete_cookie(response, settings)
        return {'ok': True}

    @app.post('/api/logout/todas')
    def logout_todas(response: Response, user=Depends(auth.current_user)):
        """Cierra TODAS las sesiones de esta cuenta, en todos los dispositivos."""
        auth.cerrar_todas(app.state.db, user.id)
        auth.delete_cookie(response, settings)
        response.delete_cookie(auth.DEVICE_COOKIE, path='/', secure=True, httponly=True, samesite='strict')
        return {'ok': True}

    @app.get('/api/cron/keepalive')
    def keepalive(authorization: str | None = Header(default=None)):
        """Cron diario de Vercel: toca la BD para que el proyecto gratuito de
        Supabase no se pause tras 7 días sin uso. Solo con CRON_SECRET."""
        esperado = settings.cron_secret
        recibido = authorization[7:] if authorization and authorization.startswith('Bearer ') else ''
        if not esperado or not hmac.compare_digest(recibido.encode(), esperado.encode()):
            raise HTTPException(401, 'No autorizado.')
        with app.state.db.transaction() as session:
            session.execute(text('SELECT 1'))
        sync.sincronizar_si_toca(app.state.db, settings, minutos=60)
        return {'ok': True}

    @app.get('/api/catalogue')
    def catalogue(user=Depends(auth.current_user)):
        return {kind: {'schema': cls.model_json_schema(), 'parent': PARENTS.get(kind)} for kind, cls in SCHEMAS.items()}

    @app.get('/api/consumo-ia')
    def consumo_ia(user=Depends(auth.current_user)):
        """Solo lectura: consumo del mes de la plataforma Costo360 (Cost, voz,
        renders) y los avisos enviados. El token de administración se usa aquí,
        en el servidor local — nunca llega al navegador."""
        if user.role != 'fundador':
            raise HTTPException(403, 'Solo el fundador puede ver el consumo de IA.')
        if not settings.admin_token:
            raise HTTPException(503, 'Falta configurar COSTO360_ADMIN_TOKEN en el Centro de Control.')
        try:
            r = httpx.get(settings.costo360_api.rstrip('/') + '/api/admin/consumo',
                          headers={'X-Admin-Token': settings.admin_token}, timeout=20)
        except httpx.HTTPError:
            raise HTTPException(502, 'No se pudo conectar con Costo360. Revisa tu conexión a internet.')
        if r.status_code != 200:
            raise HTTPException(502, 'Costo360 no entregó el consumo (código %s).' % r.status_code)
        return r.json()

    @app.get('/api/cron/leads')
    def cron_leads(authorization: str | None = Header(default=None)):
        """pg_cron (cada 10 min) trae los prospectos del chat de la landing al CRM."""
        esperado = settings.cron_secret
        recibido = authorization[7:] if authorization and authorization.startswith('Bearer ') else ''
        if not esperado or not hmac.compare_digest(recibido.encode(), esperado.encode()):
            raise HTTPException(401, 'No autorizado.')
        return leads.importar(app.state.db)

    @app.get('/api/cron/agente')
    async def cron_agente(r: str = Query('', max_length=20), authorization: str | None = Header(default=None)):
        """pg_cron (06:30 y 18:00 Bogotá) dispara las rutinas del agente de
        operaciones. GET con Bearer CRM_AUTO_SECRET: no necesita eximir a
        ninguna ruta del control de Origin de los POST."""
        esperado = settings.auto_secret
        recibido = authorization[7:] if authorization and authorization.startswith('Bearer ') else ''
        if not esperado or not hmac.compare_digest(recibido.encode(), esperado.encode()):
            raise HTTPException(401, 'No autorizado.')
        if r not in autonomo.RUTINAS:
            raise HTTPException(422, 'Rutina desconocida.')
        if not settings.auto_enabled:
            # Deja constancia para que la alarma de pg_cron no avise en falso.
            await asyncio.to_thread(autonomo.registrar_apagado, app.state.db, r)
            return {'rutina': r, 'apagado': True}
        return await autonomo.ejecutar(app.state.db, settings, r)

    @app.post('/api/sync/clientes')
    def sync_clientes(user=Depends(auth.current_user)):
        """Trae ya los talleres reales de Costo360 al CRM (solo el fundador)."""
        if user.role != 'fundador':
            raise HTTPException(403, 'Solo el fundador puede sincronizar los clientes.')
        return sync.sincronizar_clientes(app.state.db, settings)

    @app.get('/api/summary')
    def summary(user=Depends(auth.current_user)):
        sync.sincronizar_si_toca(app.state.db, settings)  # el CRM nunca se ve desactualizado
        with app.state.db.transaction() as session:
            return services.summary(session)

    @app.get('/api/records/{kind}')
    def records(kind: str, q: str = Query('', max_length=160), parent_id: str | None = None,
                archived: bool = False, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
                user=Depends(auth.current_user)):
        with app.state.db.transaction() as session:
            return services.list_records(session, kind, q, parent_id, archived, offset, limit)

    @app.get('/api/records/{kind}/{record_id}')
    def detail(kind: str, record_id: str, user=Depends(auth.current_user)):
        with app.state.db.transaction() as session:
            return services.snapshot(services.get_record(session, kind, record_id))

    @app.post('/api/records/{kind}', status_code=201)
    def create(kind: str, body: dict, user=Depends(auth.current_user)):
        with app.state.db.transaction(write=True) as session:
            return services.mutate(session, user, kind, 'crear', body)

    @app.patch('/api/records/{kind}/{record_id}')
    def edit(kind: str, record_id: str, body: Change, user=Depends(auth.current_user)):
        with app.state.db.transaction(write=True) as session:
            return services.mutate(session, user, kind, 'editar', body.data, record_id, body.version)

    @app.get('/api/audit')
    def audit(record_id: str | None = None, offset: int = Query(0, ge=0), user=Depends(auth.current_user)):
        with app.state.db.transaction() as session:
            query = select(Audit)
            if record_id:
                query = query.where(Audit.record_id == services.exact_id(record_id))
            rows = session.scalars(query.order_by(Audit.created_at.desc()).offset(offset).limit(50)).all()
            return [{'id': r.id, 'actor_id': r.actor_id, 'record_id': r.record_id, 'action': r.action,
                     'origin': r.origin, 'before': r.before, 'after': r.after, 'created_at': r.created_at} for r in rows]

    @app.get('/api/proposals')
    def proposals(user=Depends(auth.current_user)):
        with app.state.db.transaction() as session:
            rows = session.scalars(select(Proposal).where(Proposal.actor_id == user.id).order_by(Proposal.created_at.desc()).limit(50)).all()
            return [services.proposal_view(p) for p in rows]

    @app.post('/api/proposals', status_code=201)
    def propose(body: ProposalIn, user=Depends(auth.current_user)):
        with app.state.db.transaction(write=True) as session:
            return services.propose(session, user, body.kind, body.action, body.data,
                                    str(body.record_id) if body.record_id else None, body.version, 'manual')

    @app.post('/api/proposals/{proposal_id}/confirm')
    def confirm(proposal_id: str, user=Depends(auth.current_user)):
        with app.state.db.transaction(write=True) as session:
            result = services.resolve(session, user, proposal_id, True)
            # Hecho del servidor, no enviado por el navegador ni por el modelo.
            if not session.scalar(select(Message).where(Message.actor_id == user.id, Message.text == f"Confirmación humana registrada: propuesta {proposal_id}.")):
                session.add(Message(actor_id=user.id, role='model', text=f"Confirmación humana registrada: propuesta {proposal_id}.", evidence=[{'record_id': result['result']['id'], 'action': result['action']}]))
            return result

    @app.post('/api/proposals/{proposal_id}/reject')
    def reject(proposal_id: str, user=Depends(auth.current_user)):
        with app.state.db.transaction(write=True) as session:
            return services.resolve(session, user, proposal_id, False)

    @app.get('/api/agent/history')
    def history(user=Depends(auth.current_user)):
        return agent.history(app.state.db, user)

    @app.post('/api/agent/chat')
    async def chat(body: Chat, user=Depends(auth.current_user)):
        gate.check('chat:' + user.id, limit=12, window=60)
        return await app.state.agent.chat(user, body.message)

    @app.get('/api/agent/status')
    def agent_status(user=Depends(auth.current_user)):
        with app.state.db.transaction() as session:
            usage = session.get(Usage, now()[:10])
            return {'configured': bool(settings.gemini_key and settings.gemini_model),
                    'model': settings.gemini_model or None, 'daily_limit': settings.daily_calls,
                    'calls_today': usage.calls if usage else 0, 'tools': list(agent.catalogue(user)),
                    'policy_version': '2026-09-17.1', 'confirmation': 'Todas las escrituras requieren confirmación humana.'}

    # En línea el HTML/JS lo sirve Vercel directamente; aquí solo en local.
    dist = ROOT / 'web' / 'dist'
    if dist.exists() and not settings.online:
        app.mount('/assets', StaticFiles(directory=dist / 'assets'), name='assets')
        @app.get('/')
        def index():
            return FileResponse(dist / 'index.html')
        @app.get('/logo.png')
        def logo():
            return FileResponse(dist / 'logo.png')
    return app
