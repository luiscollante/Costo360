"""Única lógica de negocio para pantallas y herramientas. El llamador controla la transacción."""
import json
import unicodedata
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func, or_, select

from .db import Audit, Proposal, Record, now
from .schemas import PARENTS, SCHEMAS


def fail(code, message):
    raise HTTPException(code, message)


def role_guard(user, action):
    if user.role not in ('fundador', 'comercial', 'lectura'):
        fail(403, 'Rol no reconocido.')
    if user.role == 'lectura':
        fail(403, 'Tu rol solo permite consultar.')
    if action in ('archivar', 'restaurar') and user.role != 'fundador':
        fail(403, 'Solo el fundador puede archivar o restaurar.')


def check_kind(kind):
    if kind not in SCHEMAS:
        fail(404, 'Módulo no encontrado.')


def exact_id(value):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        fail(422, 'Se requiere el identificador exacto del registro.')


def normalized(value):
    return ' '.join(unicodedata.normalize('NFKC', value).casefold().split())


def snapshot(row):
    return {'id': row.id, 'kind': row.kind, 'data': row.data, 'version': row.version,
            'archived': row.archived, 'created_at': row.created_at, 'updated_at': row.updated_at}


def get_record(session, kind, record_id):
    check_kind(kind)
    record = session.get(Record, exact_id(record_id))
    if not record or record.kind != kind:
        fail(404, 'Registro no encontrado en este módulo.')
    return record


def list_records(session, kind, q='', parent_id=None, archived=False, offset=0, limit=50):
    check_kind(kind)
    if not isinstance(q, str) or len(q) > 160:
        fail(422, 'La búsqueda debe tener hasta 160 caracteres.')
    if isinstance(offset, bool) or not isinstance(offset, int) or offset < 0:
        fail(422, 'Paginación inválida.')
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 100:
        fail(422, 'El límite debe estar entre 1 y 100.')
    query = select(Record).where(Record.kind == kind, Record.archived == archived)
    if parent_id:
        query = query.where(Record.parent_id == exact_id(parent_id))
    if q.strip():
        text = '%' + q.strip().lower().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_') + '%'
        query = query.where(or_(*[func.lower(Record.data[key].as_string()).like(text, escape='\\')
                                for key in ['nombre', 'titulo', 'concepto', 'email', 'ciudad', 'nit']]))
    total = session.scalar(select(func.count()).select_from(query.subquery()))
    rows = session.scalars(query.order_by(Record.updated_at.desc(), Record.id).offset(offset).limit(limit)).all()
    items = [snapshot(x) for x in rows]
    # Nombre de la empresa/proveedor "padre" en cada fila (p. ej. de qué taller
    # es una suscripción), sin que el navegador tenga que abrir cada registro.
    padres = {x.parent_id for x in rows if x.parent_id}
    if padres:
        nombres = {r.id: r.data.get('nombre', '') for r in session.scalars(select(Record).where(Record.id.in_(padres)))}
        for item, row in zip(items, rows):
            if row.parent_id:
                item['parent_name'] = nombres.get(row.parent_id, '')
    return {'items': items, 'total': total, 'offset': offset, 'limit': limit}


def validated(session, kind, data, existing_id=None):
    check_kind(kind)
    if not isinstance(data, dict) or len(json.dumps(data, default=str)) > 16000:
        fail(422, 'Datos inválidos o demasiado extensos.')
    try:
        clean = SCHEMAS[kind].model_validate(data).model_dump(mode='json')
    except ValidationError as exc:
        fields = ', '.join('.'.join(map(str, e['loc'])) for e in exc.errors())
        fail(422, 'Revisa los campos: ' + fields)
    parent_id = None
    if kind in PARENTS:
        field, parent_kind = PARENTS[kind]
        parent_id = clean.get(field)
        if parent_id:
            parent = get_record(session, parent_kind, parent_id)
            if parent.archived:
                fail(409, 'Primero restaura la empresa o proveedor relacionado.')
    if kind == 'oportunidades' and clean['etapa'] == 'Perdida' and not clean['motivo_perdida']:
        fail(422, 'Registra el motivo de pérdida de la oportunidad.')
    if kind == 'suscripciones':
        if clean['renovacion'] < clean['inicio']:
            fail(422, 'La renovación no puede ser anterior al inicio.')
        if clean['estado'] in ('Prueba', 'Activa', 'Pausada'):
            duplicate = session.scalar(select(Record).where(
                Record.kind == kind, Record.parent_id == parent_id, Record.archived == False,
                Record.id != (existing_id or ''), Record.data['estado'].as_string().in_(['Prueba', 'Activa', 'Pausada'])))
            if duplicate:
                fail(409, 'Esta empresa ya tiene una suscripción vigente registrada.')
    identity = None
    if kind in ('empresas', 'proveedores'):
        identity = kind + ':nombre:' + normalized(clean['nombre'])
        if kind == 'empresas' and clean['nit']:
            nit = ''.join(c for c in clean['nit'] if c.isalnum()).upper()
            clean['nit'] = nit
            duplicate = session.scalar(select(Record).where(Record.kind == kind, Record.id != (existing_id or ''), Record.data['nit'].as_string() == nit))
            if duplicate:
                fail(409, 'Ya existe una empresa con este NIT, incluso en el archivo.')
    if kind == 'contactos' and clean['email']:
        identity = 'contactos:' + str(parent_id) + ':' + clean['email']
    if identity:
        duplicate = session.scalar(select(Record).where(Record.identity == identity, Record.id != (existing_id or '')))
        if duplicate:
            fail(409, 'Ya existe este registro. Revisa también los archivados.')
    return clean, parent_id, identity


def mutate(session, user, kind, action, data=None, record_id=None, version=None, origin='manual'):
    role_guard(user, action)
    check_kind(kind)
    if action not in ('crear', 'editar', 'archivar', 'restaurar'):
        fail(422, 'Acción no permitida.')
    before = None
    if action == 'crear':
        clean, parent, identity = validated(session, kind, data or {})
        row = Record(kind=kind, data=clean, parent_id=parent, identity=identity)
        session.add(row)
    else:
        row = get_record(session, kind, record_id)
        if version is None or isinstance(version, bool) or row.version != version:
            fail(409, 'El registro cambió. Actualiza la vista y vuelve a proponer.')
        before = snapshot(row)
        if action == 'restaurar':
            if not row.archived:
                fail(409, 'El registro ya está activo.')
            validated(session, kind, row.data, row.id)
            row.archived = False
        else:
            if row.archived:
                fail(409, 'El registro está archivado. Primero debes restaurarlo.')
            if action == 'archivar':
                children = session.scalar(select(func.count()).select_from(Record).where(Record.parent_id == row.id, Record.archived == False))
                if children:
                    fail(409, 'Tiene registros relacionados activos. No se archivará en cascada; revísalos primero.')
                row.archived = True
            else:
                if not isinstance(data, dict) or not data:
                    fail(422, 'Debes indicar los campos a cambiar.')
                clean, parent, identity = validated(session, kind, {**row.data, **data}, row.id)
                row.data, row.parent_id, row.identity = clean, parent, identity
        row.version += 1
        row.updated_at = now()
    session.flush()
    result = snapshot(row)
    session.add(Audit(actor_id=user.id, record_id=row.id, action=action, origin=origin, before=before, after=result))
    session.flush()
    return result


def proposal_view(p):
    return {'id': p.id, 'kind': p.kind, 'action': p.action, 'record_id': p.record_id,
            'data': p.payload, 'before': p.before, 'version': p.version, 'state': p.state,
            'expires': p.expires, 'created_at': p.created_at, 'result': p.result}


AUTO = 'agente-autonomo'


def propose(session, user, kind, action, data=None, record_id=None, version=None, origin='agente', ttl_minutes=15):
    role_guard(user, action)
    if not 1 <= ttl_minutes <= 2880:
        fail(422, 'La vigencia de una propuesta va de 1 minuto a 48 horas.')
    check_kind(kind)
    if action not in ('crear', 'editar', 'archivar', 'restaurar'):
        fail(422, 'Acción no permitida.')
    data = data or {}
    before = None
    if action == 'crear':
        if record_id or version is not None:
            fail(422, 'Una creación no acepta identificador ni versión previos.')
        clean, _, _ = validated(session, kind, data)
    else:
        row = get_record(session, kind, record_id)
        if isinstance(version, bool) or version != row.version:
            fail(409, 'La versión consultada ya no está vigente.')
        if row.archived != (action == 'restaurar'):
            fail(409, 'El estado de archivo no permite esta acción.')
        before = snapshot(row)
        if action == 'editar':
            if not data:
                fail(422, 'No hay cambios propuestos.')
            clean, _, _ = validated(session, kind, {**row.data, **data}, row.id)
            clean = {k: v for k, v in clean.items() if v != row.data.get(k)}
            if not clean:
                fail(422, 'Los valores propuestos son iguales a los actuales.')
        else:
            if data:
                fail(422, 'Archivar/restaurar no admite otros cambios.')
            clean = {}
    # Cupos separados: las del agente autónomo (10) no ocupan las 20 del fundador.
    del_auto = Proposal.origin == AUTO if origin == AUTO else Proposal.origin != AUTO
    pending = session.scalar(select(func.count()).select_from(Proposal).where(
        Proposal.actor_id == user.id, Proposal.state == 'pendiente', Proposal.expires > now(), del_auto))
    if pending >= (10 if origin == AUTO else 20):
        fail(409, 'Revisa las propuestas pendientes antes de crear más.')
    p = Proposal(actor_id=user.id, kind=kind, action=action, record_id=record_id,
                 payload=clean, before=before, version=version, origin=origin,
                 expires=(datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)).isoformat())
    session.add(p)
    session.flush()
    return proposal_view(p)


def resolve(session, user, proposal_id, accept):
    p = session.get(Proposal, exact_id(proposal_id))
    if not p or p.actor_id != user.id:
        fail(404, 'Propuesta no encontrada para tu usuario.')
    role_guard(user, p.action)
    if p.state == 'confirmada' and accept:
        return proposal_view(p)  # Idempotencia: nunca ejecutar otra vez.
    if p.state != 'pendiente':
        fail(409, 'Esta propuesta ya fue resuelta.')
    if p.expires <= now():
        fail(409, 'La propuesta caducó. Consulta los datos y crea una nueva.')
    if accept:
        p.result = mutate(session, user, p.kind, p.action, p.payload, p.record_id, p.version, p.origin)
        p.state = 'confirmada'
    else:
        p.state = 'rechazada'
    session.flush()
    return proposal_view(p)


def summary(session):
    rows = session.scalars(select(Record).where(Record.archived == False)).all()
    by_kind = {kind: [r for r in rows if r.kind == kind] for kind in SCHEMAS}
    today = datetime.now(timezone.utc).astimezone(__import__('zoneinfo').ZoneInfo('America/Bogota')).date().isoformat()
    opportunities = [r for r in by_kind['oportunidades'] if r.data['etapa'] not in ('Ganada', 'Perdida')]
    tasks = [r for r in by_kind['tareas'] if r.data['estado'] != 'Hecha']
    return {
        'fecha': today, 'empresas': len(by_kind['empresas']),
        'clientes': sum(r.data['estado'] == 'Cliente' for r in by_kind['empresas']),
        'oportunidades_abiertas': len(opportunities),
        'valor_pipeline': str(sum((Decimal(r.data['valor_mensual']) for r in opportunities), Decimal('0'))),
        'tareas_vencidas': sum(r.data['vence'] < today for r in tasks),
        'tickets_abiertos': sum(r.data['estado'] != 'Resuelto' for r in by_kind['tickets']),
        'proximas_tareas': [snapshot(r) for r in sorted(tasks, key=lambda r: r.data['vence'])[:8]],
        'seguimientos': [snapshot(r) for r in sorted(opportunities, key=lambda r: r.data.get('fecha_seguimiento') or '9999') if r.data.get('fecha_seguimiento')][:8],
        'advertencia': 'El valor comercial previsto no representa dinero cobrado. Este piloto no concilia pagos.'
    }
