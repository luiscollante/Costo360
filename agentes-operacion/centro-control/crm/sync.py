"""Sincronización de los clientes reales de Costo360 hacia el CRM (2026-09-24).

Pedido del fundador: "Empresas" aparecía vacío mientras "Consumo de IA" mostraba
los talleres reales — el Centro de Control se sentía desconectado. Aquí cada
taller que usa Costo360 queda como empresa "Cliente", sus usuarios como
contactos, y su suscripción de Wompi (si existe) como suscripción.

Reglas:
- SOLO LECTURA sobre la app Costo360 (GET /api/admin/clientes con el token de
  administración). Nunca escribe nada en la plataforma de los talleres.
- Cada cambio pasa por `services.mutate` (validación + auditoría) con origen
  'sincronizacion', actuando en nombre del fundador.
- El vínculo con Costo360 se guarda como marca `costo360:<id>` en las notas.
- Un error en un taller no detiene a los demás (se reporta en el resumen).
"""
import logging
from datetime import date

import httpx
from fastapi import HTTPException
from sqlalchemy import select

from . import security, services
from .db import Record, User

log = logging.getLogger('crm.sync')

ORIGEN = 'sincronizacion'
_AVISO = 'Sincronizado automáticamente desde la app Costo360 ({marca}). Los datos de la app se actualizan solos.'


def _marca(eid):
    return f'costo360:{eid}'


def _buscar_empresa(session, eid, nombre):
    marca = _marca(eid)
    for row in session.scalars(select(Record).where(Record.kind == 'empresas')):
        if marca in (row.data.get('notas') or ''):
            return row
    identidad = 'empresas:nombre:' + services.normalized(nombre)
    return session.scalar(select(Record).where(Record.identity == identidad))


def _guardar(session, actor, kind, row, data, parent=None):
    """Crea o actualiza solo si algo cambió. Devuelve 'creado'|'actualizado'|None."""
    if row is None:
        services.mutate(session, actor, kind, 'crear', data, origin=ORIGEN)
        return 'creado'
    cambios = {k: v for k, v in data.items() if str(row.data.get(k, '')) != str(v)}
    if not cambios:
        return None
    if row.archived:
        services.mutate(session, actor, kind, 'restaurar', record_id=row.id, version=row.version, origin=ORIGEN)
    services.mutate(session, actor, kind, 'editar', cambios, row.id, row.version, origin=ORIGEN)
    return 'actualizado'


def _empresa(session, actor, e):
    row = _buscar_empresa(session, e['id'], e['nombre'])
    notas_previas = (row.data.get('notas') or '') if row else ''
    aviso = _AVISO.format(marca=_marca(e['id']))
    data = {
        'nombre': e['nombre'][:160],
        'nit': e['nit'][:25],
        'estado': 'Cliente' if e['activa'] else 'Inactivo',
        'segmento': f"Cliente Costo360 · plan {e['plan']}"[:120],
        'notas': notas_previas if _marca(e['id']) in notas_previas else (aviso + ('\n\n' + notas_previas if notas_previas else ''))[:3000],
    }
    if not row:
        data.update(ciudad=e['direccion'][:100], origen='Web')
    accion = _guardar(session, actor, 'empresas', row, data)
    row = _buscar_empresa(session, e['id'], e['nombre'])
    return row, accion


def _contactos(session, actor, empresa_row, usuarios):
    n = 0
    for u in usuarios:
        if not u['email']:
            continue
        email = u['email'].casefold()
        identidad = f'contactos:{empresa_row.id}:{email}'
        row = session.scalar(select(Record).where(Record.identity == identidad))
        cargo = {'admin': 'Administrador', 'gerencia': 'Gerencia', 'operativo': 'Operativo'}.get(u['rol'], u['rol'])
        if u['cargo']:
            cargo = f"{u['cargo']} ({cargo})"
        data = {'empresa_id': empresa_row.id, 'nombre': u['nombre'][:160], 'cargo': cargo[:100], 'email': email}
        if not u['activo']:
            data['notas'] = 'Usuario desactivado en Costo360.'
        if _guardar(session, actor, 'contactos', row, data):
            n += 1
    return n


def _suscripcion(session, actor, empresa_row, e):
    if not e['suscripcion_estado'] or not e['proximo_cobro'] or e['plan'] not in ('Starter', 'Pro', 'Enterprise'):
        return None
    estado = {'activa': 'Activa', 'pausada': 'Pausada', 'cancelada': 'Cancelada'}.get(e['suscripcion_estado'], 'Pausada')
    inicio = (e['creado_en'] or date.today().isoformat())[:10]
    renovacion = e['proximo_cobro'][:10]
    if renovacion < inicio:
        renovacion = inicio
    row = session.scalar(select(Record).where(Record.kind == 'suscripciones', Record.parent_id == empresa_row.id))
    data = {'empresa_id': empresa_row.id, 'plan': e['plan'], 'importe_mensual': str(e['precio_mensual_cop']),
            'inicio': inicio, 'renovacion': renovacion, 'estado': estado}
    return _guardar(session, actor, 'suscripciones', row, data)


def sincronizar_clientes(db, settings) -> dict:
    if not settings.admin_token:
        raise HTTPException(503, 'Falta configurar COSTO360_ADMIN_TOKEN para sincronizar los clientes.')
    try:
        r = httpx.get(settings.costo360_api.rstrip('/') + '/api/admin/clientes',
                      headers={'X-Admin-Token': settings.admin_token}, timeout=20)
        r.raise_for_status()
        empresas = r.json()['empresas']
    except Exception as exc:
        log.warning('Sincronización: Costo360 no respondió (%s)', type(exc).__name__)
        raise HTTPException(502, 'No se pudo leer la lista de clientes de Costo360. Intenta más tarde.')

    resumen = {'talleres': len(empresas), 'creados': 0, 'actualizados': 0, 'contactos': 0,
               'suscripciones': 0, 'errores': []}
    with db.transaction(write=True) as session:
        actor = session.scalar(select(User).where(User.role == 'fundador', User.active.is_(True)).order_by(User.email))
        if not actor:
            raise HTTPException(409, 'No hay una cuenta de fundador activa para firmar la sincronización.')
        for e in empresas:
            try:
                with session.begin_nested():
                    row, accion = _empresa(session, actor, e)
                    if accion == 'creado':
                        resumen['creados'] += 1
                    elif accion == 'actualizado':
                        resumen['actualizados'] += 1
                    resumen['contactos'] += _contactos(session, actor, row, e['usuarios'])
                    if _suscripcion(session, actor, row, e):
                        resumen['suscripciones'] += 1
            except HTTPException as exc:
                resumen['errores'].append(f"{e['nombre']}: {exc.detail}")
        security.registrar(session, 'sync-clientes')
    return resumen


def sincronizar_si_toca(db, settings, minutos=30) -> None:
    """Sincroniza en segundo plano del request si pasaron `minutos` desde la
    última vez (así el CRM nunca se ve desactualizado). Nunca lanza."""
    if not settings.admin_token:
        return
    try:
        with db.transaction() as session:
            if security.contar(session, 'sync-clientes', minutos * 60):
                return
        sincronizar_clientes(db, settings)
    except Exception:
        log.warning('Sincronización automática omitida', exc_info=False)
