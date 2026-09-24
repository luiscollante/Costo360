"""Inicialización explícita; no existe registro público de usuarios."""
import argparse
import getpass
import os
from datetime import date, timedelta
from pathlib import Path
from sqlalchemy import func, select

from .auth import configurar_totp, create_user
from .config import ROOT, Settings
from .db import Database, Record, User
from .services import mutate

DEMO_EMAIL = 'demo@costo360.local'
DEMO_PASSWORD = 'Demo-local-360!'


def seed_demo(db):
    with db.transaction() as session:
        user = session.scalar(select(User).where(User.email == DEMO_EMAIL))
        count = session.scalar(select(func.count()).select_from(Record))
    if count:
        print('La demostración ya contiene registros; no se sobrescribió nada.')
        return
    if not user:
        user = create_user(db, DEMO_EMAIL, 'Fundador · Demostración', DEMO_PASSWORD)
    today = date.today()
    with db.transaction(write=True) as session:
        names = ['Demo · Piedra Norte', 'Demo · Espacios del Caribe', 'Demo · Superficies Andinas', 'Demo · Diseño Mineral', 'Demo · Acabados del Sol', 'Demo · Piedra Urbana']
        stages = ['Nuevo', 'Contactado', 'Demostración', 'Propuesta', 'Negociación', 'Ganada']
        for index, name in enumerate(names):
            company = mutate(session, user, 'empresas', 'crear', {
                'nombre': name, 'ciudad': ['Barranquilla', 'Cartagena', 'Bogotá'][index % 3],
                'estado': 'Cliente' if index == 5 else 'Prospecto', 'origen': ['Referido', 'Web', 'Prospección'][index % 3],
                'segmento': 'Transformación de piedra', 'notas': 'Registro ficticio para explorar el CRM. No contactar.'}, origin='demo')
            mutate(session, user, 'contactos', 'crear', {'empresa_id': company['id'], 'nombre': 'Contacto ficticio ' + str(index + 1), 'cargo': 'Gerencia', 'email': f'persona{index+1}@example.invalid', 'permiso_contacto': 'No contactar'}, origin='demo')
            mutate(session, user, 'oportunidades', 'crear', {'empresa_id': company['id'], 'titulo': 'Suscripción ' + ('Starter' if index < 2 else 'Pro'), 'plan': 'Starter' if index < 2 else 'Pro', 'etapa': stages[index], 'valor_mensual': '150000' if index < 2 else '375000', 'proximo_paso': 'Revisar necesidades y agendar seguimiento', 'fecha_seguimiento': (today + timedelta(days=index-1)).isoformat()}, origin='demo')
            mutate(session, user, 'actividades', 'crear', {'empresa_id': company['id'], 'titulo': 'Primer contacto registrado', 'tipo': 'Nota', 'fecha': today.isoformat(), 'detalle': 'Ejemplo ficticio. Esta actividad no envió mensajes.'}, origin='demo')
            mutate(session, user, 'tareas', 'crear', {'empresa_id': company['id'], 'titulo': ['Preparar demostración', 'Revisar propuesta', 'Agendar seguimiento'][index % 3], 'vence': (today + timedelta(days=index-2)).isoformat(), 'prioridad': 'Alta' if index < 2 else 'Media'}, origin='demo')
            if index == 5:
                mutate(session, user, 'suscripciones', 'crear', {'empresa_id': company['id'], 'plan': 'Pro', 'importe_mensual': '375000', 'inicio': today.isoformat(), 'renovacion': (today+timedelta(days=30)).isoformat(), 'estado': 'Activa'}, origin='demo')
                mutate(session, user, 'tickets', 'crear', {'empresa_id': company['id'], 'titulo': 'Acompañamiento de inicio', 'descripcion': 'Ejemplo: revisar la configuración inicial con el cliente.'}, origin='demo')
        supplier = mutate(session, user, 'proveedores', 'crear', {'nombre': 'Demo · Proveedor de tecnología', 'categoria': 'Tecnología'}, origin='demo')
        mutate(session, user, 'compras', 'crear', {'proveedor_id': supplier['id'], 'concepto': 'Servicio de ejemplo — no contratado', 'importe': '0', 'fecha': today.isoformat()}, origin='demo')
    print('Demostración creada con datos ficticios. No usar esta cuenta con datos reales.')


def activar_totp():
    """Activa el código de verificación (Microsoft Authenticator u otra app)
    de una cuenta. Se ejecuta en el computador del fundador contra la BD en
    línea (CRM_DATABASE + CRM_TOTP_KEY en el entorno). Muestra un QR para
    escanear y 10 códigos de recuperación que NO se vuelven a mostrar."""
    import tempfile
    import webbrowser
    settings = Settings()
    if not settings.totp_key:
        raise SystemExit('Falta CRM_TOTP_KEY en el entorno.')
    email = input('Correo de la cuenta: ').strip()
    secreto, uri, codigos = configurar_totp(Database(settings.database), email, settings)
    try:
        import qrcode
        ruta = Path(tempfile.gettempdir()) / 'costo360_codigo_qr.png'
        qrcode.make(uri).save(ruta)
        webbrowser.open(ruta.as_uri())
        print(f'\nSe abrió el código QR ({ruta}). Escanéalo con Microsoft Authenticator y luego BORRA esa imagen.')
    except ImportError:
        print('\nNo está instalada la librería qrcode; agrega la cuenta a mano con esta clave:')
    print(f'Clave para ingreso manual (tipo "basada en tiempo"): {secreto}')
    print('\nCódigos de recuperación (úsalos si pierdes el celular; cada uno sirve una sola vez).')
    print('Guárdalos en un lugar seguro, NO en el celular:')
    for c in codigos:
        print('   ', c)
    print('\nTodas las sesiones abiertas de esta cuenta se cerraron.')


def main():
    parser = argparse.ArgumentParser(description='Administración local del Centro de Control Costo360')
    parser.add_argument('action', choices=['init', 'user', 'demo', 'totp'])
    args = parser.parse_args()
    if args.action == 'totp':
        activar_totp()
        return
    if args.action == 'demo':
        os.environ['CRM_DEMO'] = '1'
        os.environ['CRM_DATABASE'] = str(ROOT / 'data' / 'demo.sqlite3')
        seed_demo(Database(Settings().database))
        print(f'Correo demo: {DEMO_EMAIL}\nContraseña DEMO pública: {DEMO_PASSWORD}')
        return
    settings = Settings()
    if settings.demo:
        raise SystemExit('Desactiva CRM_DEMO antes de crear usuarios reales.')
    db = Database(settings.database)
    with db.transaction() as session:
        exists = session.scalar(select(func.count()).select_from(User))
    if args.action == 'init' and exists:
        raise SystemExit('Ya hay usuarios. Usa la orden user para agregar otro, no se sobrescribirá el fundador.')
    print('La contraseña se solicita de forma oculta y nunca se guarda en texto plano.')
    email = input('Correo: ').strip()
    name = input('Nombre: ').strip()
    role = 'fundador' if args.action == 'init' else input('Rol (fundador/comercial/lectura): ').strip()
    # La contraseña no se ve al escribirla (a propósito): si está corta o no
    # coincide, se avisa en lenguaje simple y se vuelve a pedir.
    while True:
        password = getpass.getpass('Contraseña (mínimo 12 caracteres, no se ve al escribir): ')
        if len(password) < 12:
            print(f'  Esa contraseña tiene {len(password)} caracteres y necesita mínimo 12. Intenta de nuevo.')
            continue
        if password != getpass.getpass('Repite la contraseña: '):
            print('  Las dos contraseñas no coinciden. Intenta de nuevo.')
            continue
        break
    create_user(db, email, name, password, role)
    print('Usuario creado. Inicia la aplicación local para entrar.')


if __name__ == '__main__':
    main()
