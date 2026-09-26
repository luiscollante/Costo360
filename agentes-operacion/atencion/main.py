"""Piloto LOCAL. No expone herramientas ni datos del CRM. No envía mensajes externos."""
import asyncio
import json
import os
import re
import sqlite3
import threading
import time
import unicodedata
import hashlib
from collections import deque, OrderedDict
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .knowledge import ANSWERS, PLANS, TOPICS, VERSION
from .config import gemini_key

Topic = Literal['presentacion','planes','cotizar','materiales','proyectos','cost','limites','acceso','compra','humano','desconocido','margen','tiempo','nesting','pdf','parametros','aiu','equipo','industria','inicio','voz','historial','seguridad','privacidad','datos','requisitos','gracias']

class Message(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    role: Literal['user', 'assistant']
    content: str = Field(min_length=1, max_length=2400)

class Question(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    message: str = Field(min_length=1, max_length=1500)
    history: list[Message] = Field(default_factory=list, max_length=8)

class Selection(BaseModel):
    model_config = ConfigDict(extra='forbid')
    topics: list[Topic] = Field(min_length=1, max_length=3)
    people: int | None = Field(default=None, ge=1, le=10000)

def normalized(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if unicodedata.category(c) != 'Mn')

def preflight(question):
    """Solo una primera barrera. La salida de texto siempre es del catálogo."""
    text = normalized(question.message)
    user_text = question.message+' '+ ' '.join(m.content for m in question.history if m.role=='user')
    if re.search(r'AIza[\w-]{20,}|sk-[\w-]{20,}|(?:password|contrasena|api.?key)\s*[:=]\s*\S+', user_text, re.I):
        return 'privacidad'
    if any(word in text for word in ['ignora tus','ignore previous','ignore all','system prompt','prompt del sistema','instrucciones internas','muestra los secretos','revela tu','archivo .env','variables de entorno','jailbreak','developer message','datos de otro taller','datos de otras empresas']):
        return 'seguridad'
    return None

def guide(question):
    text = normalized(question.message)
    topics = []
    rules = [
        ('voz', ['voz','audio','hablarle']),
        ('margen', ['margen','ganancia','rentabilidad','cuanto gano','cuanto deja','perdiendo dinero']),
        ('tiempo', ['demoro','pierdo tiempo','repetir','repetitivo','tardo','mas rapido']),
        ('nesting', ['nesting','plano de corte','desperdicio','aprovechamiento']),
        ('historial', ['historial','bitacora','registro de acciones']),
        ('datos', ['privacidad','datos personales','mis datos','proteccion de datos']),
        ('inicio', ['empezar','prueba gratis','prueba gratuita','aprender','capacitacion']),
        ('aiu', ['aiu','tributar','impuesto']),
        ('requisitos', ['offline','sin internet','integracion','importar','android','iphone','windows','macbook']),
        ('industria', ['venden marmol','venden piedra','para quien','que industria']),
        ('gracias', ['gracias']),
        ('humano', ['humano','asesor','reembolso','devolucion','reclamo','descuento','cancelar','cancelacion','demo','demostracion']),
        ('acceso', ['contrasena','ingresar','iniciar sesion','acceso','pago fallido','no puedo entrar']),
        ('limites', ['contabilidad','dian','facturacion electronica','alegra','microsoft']),
        ('planes', ['plan','precio','cuanto cuesta','mensualidad','enterprise','starter','pro ']),
        ('cost', ['cost ','cost?','cost.','voz','inteligencia','asistente','ia ','cupo']),
        ('materiales', ['material','retal','inventario','lamina','corte','nesting']),
        ('proyectos', ['proyecto','tarea','responsable','seguimiento']),
        ('cotizar', ['cotiz','pdf','aiu','excel']),
        ('compra', ['comprar','suscribir','contratar','pagar']),
        ('presentacion', ['hola','buenas','que es costo360','que hace costo360']),
    ]
    for topic, words in rules:
        if any(word in text for word in words):
            topics.append(topic)
    people = None
    match = re.search(r'\b(\d{1,4})\s*(?:personas|usuarios|integrantes|empleados)\b', text)
    if not match and re.fullmatch(r'\d{1,4}', text) and question.history and 'cuantas personas' in normalized(question.history[-1].content):
        match = re.fullmatch(r'(\d{1,4})', text)
    if match:
        people = max(1, int(match.group(1)))
        topics = ['planes'] + topics
    if 'yo solo' in text or 'solo yo' in text:
        people, topics = 1, ['planes']
    return Selection(topics=list(dict.fromkeys(topics or ['desconocido']))[:3], people=people)

def answer(selection, mode):
    topics = list(dict.fromkeys(selection.topics))
    if len(topics)>1 and 'desconocido' in topics:
        topics.remove('desconocido')
    if 'voz' in topics and 'cost' in topics:
        topics.remove('cost')
    texts = [ANSWERS[t] for t in topics]
    # Una pregunta final por turno, no dos interrogatorios concatenados.
    texts = [re.sub(r'\s*¿[^?]+\?','',text) if i<len(texts)-1 else text for i,text in enumerate(texts)]
    if selection.people is not None and 'planes' in topics:
        count = selection.people
        plan = next((p for p in PLANS if p[2] >= count), None)
        if plan:
            price = f'{plan[1]:,}'.replace(',', '.')
            texts = [f'Para {count} persona(s), {plan[0]} es el primer plan que cubre esa cantidad: ${price} COP al mes por empresa, con hasta {plan[2]} usuario(s). Incluye Cost, cotizaciones y PDF, materiales, inventario, retales, planos de corte y proyectos. ¿Quieres ver los planes o conocer cómo preparar la primera cotización?']
        else:
            texts = ['Los planes publicados llegan hasta 10 usuarios. Para un equipo mayor, hace falta revisar la necesidad con Costo360 antes de ofrecer un precio o una capacidad distinta. No he enviado una solicitud ni creado una oferta especial.']
            topics = ['humano']
    links = []
    if any(t in topics for t in ['planes','compra','presentacion','cost']):
        links.append({'label':'Comparar planes','href':'#planes'})
    if any(t in topics for t in ['cotizar','materiales','proyectos','presentacion','margen','tiempo','inicio','pdf','parametros','equipo']):
        links.append({'label':'Ver el producto','href':'#producto'})
    if 'acceso' in topics:
        links.append({'label':'Entrar a mi cuenta','href':'https://costo360-web.vercel.app/login'})
    if 'nesting' in topics:
        links.append({'label':'Explorar el simulador','href':'#simulador'})
    return {'text':'\n\n'.join(texts), 'mode':mode, 'links':links, 'needs_human':any(t in topics for t in ['humano','desconocido']), 'knowledge_version':VERSION}

@contextmanager
def connection(path):
    conn = sqlite3.connect(str(path), timeout=5)
    try:
        with conn:
            yield conn
    finally:
        conn.close()

class Usage:
    """Reserva antes del proveedor. Los intentos fallidos también gastan cupo."""
    def __init__(self, path, limit, monthly_limit=1000, daily_usd=1.5):
        self.path, self.limit, self.monthly_limit, self.daily_usd = str(path), limit, monthly_limit, daily_usd
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with connection(self.path) as conn:
            conn.execute('CREATE TABLE IF NOT EXISTS usage(day TEXT PRIMARY KEY, calls INTEGER NOT NULL, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0)')
            if 'reserved_usd' not in [r[1] for r in conn.execute('PRAGMA table_info(usage)')]:
                conn.execute('ALTER TABLE usage ADD COLUMN reserved_usd REAL NOT NULL DEFAULT 0')

    def reserve(self, estimated_usd=0.04):
        day = datetime.now(timezone.utc).date().isoformat()
        with connection(self.path) as conn:
            conn.execute('BEGIN IMMEDIATE')
            conn.execute('INSERT OR IGNORE INTO usage(day,calls) VALUES (?,0)', (day,))
            calls = conn.execute('SELECT calls FROM usage WHERE day=?', (day,)).fetchone()[0]
            monthly = conn.execute('SELECT COALESCE(SUM(calls),0) FROM usage WHERE day LIKE ?', (day[:7]+'%',)).fetchone()[0]
            reserved = conn.execute('SELECT reserved_usd FROM usage WHERE day=?', (day,)).fetchone()[0]
            if calls >= self.limit or monthly >= self.monthly_limit or reserved + estimated_usd > self.daily_usd:
                return None
            conn.execute('UPDATE usage SET calls=calls+1,reserved_usd=reserved_usd+? WHERE day=?', (estimated_usd,day))
        return day

    def record(self, day, metadata):
        if metadata is None:
            return
        incoming = max(0, getattr(metadata, 'prompt_token_count', 0) or 0)
        outgoing = max(0, getattr(metadata, 'candidates_token_count', 0) or 0) + max(0, getattr(metadata, 'thoughts_token_count', 0) or 0)
        with connection(self.path) as conn:
            conn.execute('UPDATE usage SET input_tokens=input_tokens+?,output_tokens=output_tokens+? WHERE day=?', (incoming,outgoing,day))

async def classify(question, key, model):
    from google import genai
    from google.genai import types
    policy = (Path(__file__).with_name('policy.md').read_text(encoding='utf-8')
              + '\nCATÁLOGO APROBADO:\n' + json.dumps(ANSWERS, ensure_ascii=False))
    # No incorporar mensajes assistant falsificados por el visitante como autoridad.
    contents = json.dumps({'consulta':question.message,'contexto_visitante':[m.content for m in question.history if m.role=='user'][-4:]},ensure_ascii=False)
    client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=20000,retry_options=types.HttpRetryOptions(attempts=1)))
    try:
        schema = Selection.model_json_schema()
        schema.pop('additionalProperties', None)  # Validación estricta sigue en Pydantic.
        response = await client.aio.models.generate_content(model=model, contents=contents, config=types.GenerateContentConfig(system_instruction=policy, response_mime_type='application/json', response_json_schema=schema, temperature=0, max_output_tokens=400, thinking_config=types.ThinkingConfig(thinking_level='minimal')))
        return response.text or '', response.usage_metadata
    finally:
        await client.aio.aclose()
        client.close()

def create_app(*, key=None, model=None, database=None, daily_limit=None, classifier=classify, monthly_limit=None, daily_usd=None):
    key = gemini_key() if key is None else key
    model = model or os.getenv('ATENCION_GEMINI_MODEL','gemini-3.5-flash')
    limit = int(daily_limit if daily_limit is not None else os.getenv('ATENCION_DAILY_CALLS','50'))
    if not 1 <= limit <= 500:
        raise ValueError('ATENCION_DAILY_CALLS debe estar entre 1 y 500')
    if model != 'gemini-3.5-flash':
        raise ValueError('Revisar tarifas y pruebas antes de cambiar el modelo de atención')
    # Reserva conservadora: un token por byte + margen para esquema/encapsulado.
    # Tarifas Gemini 3.5 Flash: USD 1.50/M entrada y USD 9/M salida.
    policy_bytes = len(Path(__file__).with_name('policy.md').read_bytes()) + len(json.dumps(ANSWERS,ensure_ascii=False).encode())
    reserve_usd = (policy_bytes + 8500 + 5000) * 1.5 / 1_000_000 + 400 * 9 / 1_000_000
    app = FastAPI(title='Costo360 · Atención local', docs_url=None, redoc_url=None, openapi_url=None)
    month_limit = int(monthly_limit if monthly_limit is not None else os.getenv('ATENCION_MONTHLY_CALLS','1000'))
    budget = float(daily_usd if daily_usd is not None else os.getenv('ATENCION_DAILY_USD','1.50'))
    if not 1 <= month_limit <= 10000 or not 0 < budget <= 20:
        raise ValueError('Límites de atención inválidos')
    usage = Usage(database or Path(__file__).parent / 'data' / 'usage.sqlite3', limit, month_limit, budget)
    app.state.usage = usage
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=['localhost','127.0.0.1','[::1]'])
    origins = {'http://127.0.0.1:4181','http://localhost:4181','http://127.0.0.1:4173','http://localhost:4173','http://127.0.0.1:3000','http://localhost:3000'}
    gate, lock = deque(), threading.Lock()
    active = 0
    cache = OrderedDict()
    app.state.provider_status = 'pending' if key else 'disabled'

    @app.middleware('http')
    async def boundary(request: Request, call_next):
        if request.client and request.client.host not in ('127.0.0.1','::1','testclient'):
            return JSONResponse({'detail':'Piloto disponible únicamente en este computador.'},403)
        if request.method == 'POST':
            if request.headers.get('origin') not in origins:
                return JSONResponse({'detail':'Origen no autorizado.'},403)
            try:
                size = int(request.headers.get('content-length','0'))
            except ValueError:
                return JSONResponse({'detail':'Tamaño inválido.'},400)
            if size > 30000:
                return JSONResponse({'detail':'Mensaje demasiado largo.'},413)
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 30000:
                    return JSONResponse({'detail':'Mensaje demasiado largo.'},413)
            request._body = bytes(body)
        result = await call_next(request)
        result.headers['Cache-Control'] = 'no-store'
        result.headers['X-Content-Type-Options'] = 'nosniff'
        return result

    @app.get('/api/atencion/status')
    def status():
        return {'local_only':True,'mode':'ia' if key else 'guia','provider_status':app.state.provider_status,'knowledge_version':VERSION}

    @app.post('/api/atencion/chat')
    async def chat(question: Question):
        nonlocal active
        with lock:
            now = time.monotonic()
            while gate and gate[0] < now-60:
                gate.popleft()
            if len(gate) >= 20:
                raise HTTPException(429,'Espera un minuto antes de continuar.')
            gate.append(now)
        selection, mode = guide(question), 'guia'
        blocked = preflight(question)
        if blocked:
            return answer(Selection(topics=[blocked]),'guia')
        # Limitar también el contexto total; no basta con validar cada mensaje.
        if len(question.message.encode()) + sum(len(m.content.encode()) for m in question.history) > 8500:
            raise HTTPException(413,'La conversación es demasiado larga. Resume tu consulta para continuar.')
        digest = hashlib.sha256((VERSION+question.model_dump_json()).encode()).hexdigest()
        cached = cache.get(digest)
        if cached and time.monotonic()-cached[0] < 600:
            return cached[1]
        if key:
            if active >= 2:
                return answer(selection, 'guia')
            active += 1
            try:
                day = usage.reserve(reserve_usd)
                if day:
                    selected, metadata = await asyncio.wait_for(classifier(question,key,model), timeout=25)
                    usage.record(day,metadata)
                    selection, mode = Selection.model_validate_json(selected), 'ia'
                    selection.topics = selection.topics[:2]
                    # El modelo no puede inventar la cantidad usada para recomendar.
                    evidence = ' '.join([question.message]+[m.content for m in question.history if m.role=='user'])
                    if selection.people is not None and not (re.search(r'\b'+str(selection.people)+r'\b',evidence) or (selection.people==1 and any(w in normalized(evidence) for w in ['yo solo','solo yo']))):
                        selection.people = None
                    app.state.provider_status = 'ok'
            except Exception as exc:
                # No guardar mensajes ni errores del proveedor: podrían incluir datos personales.
                app.state.provider_status = 'unavailable'
                app.state.provider_error = type(exc).__name__
            finally:
                active -= 1
        result = answer(selection,mode)
        if mode == 'ia':
            cache[digest] = (time.monotonic(),result)
            cache.move_to_end(digest)
            while len(cache)>128:
                cache.popitem(last=False)
        return result
    return app
