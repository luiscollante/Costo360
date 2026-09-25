"""Importación de prospectos del chat de costo360.com al CRM (2026-09-25).

El chat público guarda cada prospecto (con consentimiento Ley 1581) en
`atencion.leads`, en la MISMA base Postgres del Centro de Control pero en su
propio esquema. Este módulo los trae al CRM como:
  empresa (Prospecto, origen Web) + contacto (permiso Autorizado)
  + oportunidad (etapa Nuevo, plan sugerido) + actividad (resumen)
y marca `importado_en`. Idempotente: un lead ya importado no se repite.
Solo corre en línea (Postgres); en modo local no hay esquema `atencion`.
"""
import logging
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select, text

from . import services
from .db import Record, User

log = logging.getLogger('crm.leads')
ORIGEN = 'chat-landing'
_PLANES = {'starter': 'Starter', 'pro': 'Pro', 'enterprise': 'Enterprise'}


def _empresa(session, actor, lead):
    nombre = (lead['taller'] or f"{lead['nombre']} (prospecto del chat)")[:160]
    identidad = 'empresas:nombre:' + services.normalized(nombre)
    row = session.scalar(select(Record).where(Record.identity == identidad))
    if row:
        return row
    services.mutate(session, actor, 'empresas', 'crear', {
        'nombre': nombre, 'estado': 'Prospecto', 'origen': 'Web',
        'segmento': 'Prospecto del chat de costo360.com',
        'notas': f"Llegó por el chat de la página web el {lead['creado_en'][:10]}.",
    }, origin=ORIGEN)
    return session.scalar(select(Record).where(Record.identity == identidad))


def importar(db) -> dict:
    if not db.postgres:
        return {'importados': 0, 'nota': 'solo en línea'}
    importados, errores = 0, []
    with db.transaction(write=True) as session:
        actor = session.scalar(select(User).where(User.role == 'fundador', User.active.is_(True)).order_by(User.email))
        if not actor:
            raise HTTPException(409, 'No hay una cuenta de fundador activa.')
        filas = session.execute(text(
            "select id, nombre, whatsapp, correo, taller, necesidad, plan_sugerido, usuarios, resumen, "
            "consentimiento_version, consentimiento_en::text, creado_en::text "
            "from atencion.leads where importado_en is null order by id limit 25 for update skip locked"
        )).mappings().all()
        for lead in filas:
            try:
                with session.begin_nested():
                    empresa = _empresa(session, actor, lead)
                    contacto = {
                        'empresa_id': empresa.id, 'nombre': lead['nombre'][:160],
                        'email': lead['correo'] or '', 'telefono': lead['whatsapp'] or '',
                        'permiso_contacto': 'Autorizado',
                        'notas': f"Autorizó el tratamiento de datos (aviso versión {lead['consentimiento_version']}) "
                                 f"el {lead['consentimiento_en'][:16]} UTC desde el chat de costo360.com.",
                    }
                    identidad = f"contactos:{empresa.id}:{contacto['email']}" if contacto['email'] else None
                    if not (identidad and session.scalar(select(Record).where(Record.identity == identidad))):
                        services.mutate(session, actor, 'contactos', 'crear', contacto, origin=ORIGEN)
                    plan = _PLANES.get(lead['plan_sugerido'] or '', 'Por definir')
                    services.mutate(session, actor, 'oportunidades', 'crear', {
                        'empresa_id': empresa.id,
                        'titulo': f"Chat web: {lead['necesidad'] or 'interesado en Costo360'}"[:160],
                        'plan': plan, 'etapa': 'Nuevo',
                        'proximo_paso': f"Escribirle por {'WhatsApp' if lead['whatsapp'] else 'correo'} hoy.",
                        'fecha_seguimiento': (date.today() + timedelta(days=1)).isoformat(),
                        'notas': (f"Personas que usarían el sistema: {lead['usuarios']}." if lead['usuarios'] else ''),
                    }, origin=ORIGEN)
                    services.mutate(session, actor, 'actividades', 'crear', {
                        'empresa_id': empresa.id, 'titulo': 'Conversación en el chat de costo360.com',
                        'tipo': 'Nota', 'fecha': lead['creado_en'][:10],
                        'detalle': (lead['resumen'] or '')[:3000],
                    }, origin=ORIGEN)
                    session.execute(text('update atencion.leads set importado_en = now() where id = :id'), {'id': lead['id']})
                    importados += 1
            except HTTPException as exc:
                errores.append(f"lead {lead['id']}: {exc.detail}")
                log.warning('No se pudo importar el lead %s: %s', lead['id'], exc.detail)
    return {'importados': importados, 'errores': errores}
