"""Modo en línea: segundo factor, límites en BD, cookie segura, fronteras."""
import base64
import secrets
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from crm import security
from crm.auth import COOKIE_ONLINE, configurar_totp, create_user
from crm.config import Settings
from crm.db import Session
from crm.main import create_app

HOST = 'cc.costo360.test'
ORIGIN = 'https://' + HOST
PASSWORD = 'Test-online-pass-360!'
EMAIL = 'founder@example.invalid'


def settings(path, **extra):
    base = dict(mode='online', testing=True, database=path, public_hosts=(HOST,),
                totp_key=base64.b64encode(secrets.token_bytes(32)).decode(), cron_secret='cron-test-secret',
                telegram_token='', telegram_chat='')
    base.update(extra)
    return Settings(**base)


class OnlineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.tmp.name) / 'online.sqlite3')
        self.settings = settings(self.path)
        self.app = create_app(self.settings)
        self.db = self.app.state.db
        create_user(self.db, EMAIL, 'Fundador', PASSWORD)
        self.secreto, self.uri, self.recuperacion = configurar_totp(self.db, EMAIL, self.settings)
        self.client = self.nuevo_cliente()

    def tearDown(self):
        self.client.close()
        self.db.engine.dispose()
        self.tmp.cleanup()

    def nuevo_cliente(self, app=None):
        c = TestClient(app or self.app, base_url=ORIGIN)
        c.headers['Origin'] = ORIGIN
        return c

    def codigo(self, desplazamiento=0):
        return security._codigo(self.secreto, int(time.time() // 30) + desplazamiento)

    def password(self, client=None, password=PASSWORD):
        return (client or self.client).post('/api/login', json={'email': EMAIL, 'password': password})

    def entrar(self, client=None, desplazamiento=0):
        client = client or self.client
        self.assertEqual(self.password(client).json(), {'mfa_required': True})
        r = client.post('/api/login/codigo', json={'codigo': self.codigo(desplazamiento)})
        self.assertEqual(r.status_code, 200, r.text)
        client.headers['X-CSRF-Token'] = r.json()['csrf']
        return r

    def test_contrasena_sola_no_da_acceso(self):
        r = self.password()
        self.assertEqual(r.json(), {'mfa_required': True})
        self.assertNotIn('csrf', r.json())
        self.assertEqual(self.client.get('/api/me').status_code, 401)
        self.assertEqual(self.client.get('/api/summary').status_code, 401)

    def test_codigo_correcto_da_acceso_y_rota_el_token(self):
        self.password()
        pendiente = self.client.cookies.get(COOKIE_ONLINE)
        self.entrar_codigo_ok = self.client.post('/api/login/codigo', json={'codigo': self.codigo()})
        self.assertEqual(self.entrar_codigo_ok.status_code, 200)
        self.assertNotEqual(self.client.cookies.get(COOKIE_ONLINE), pendiente)
        self.assertEqual(self.client.get('/api/me').status_code, 200)

    def test_cookie_segura_con_prefijo_host(self):
        r = self.password()
        cabecera = r.headers['set-cookie']
        self.assertIn(COOKIE_ONLINE + '=', cabecera)
        for bandera in ('Secure', 'HttpOnly', 'SameSite=strict', 'Path=/'):
            self.assertIn(bandera.lower(), cabecera.lower())

    def test_codigo_incorrecto_y_reusado_fallan(self):
        self.password()
        self.assertEqual(self.client.post('/api/login/codigo', json={'codigo': '000000' if self.codigo() != '000000' else '111111'}).status_code, 401)
        codigo = self.codigo()
        self.assertEqual(self.client.post('/api/login/codigo', json={'codigo': codigo}).status_code, 200)
        otro = self.nuevo_cliente()
        self.password(otro)
        self.assertEqual(otro.post('/api/login/codigo', json={'codigo': codigo}).status_code, 401)
        otro.close()

    def test_codigo_de_recuperacion_sirve_una_sola_vez(self):
        self.password()
        self.assertEqual(self.client.post('/api/login/codigo', json={'codigo': self.recuperacion[0]}).status_code, 200)
        otro = self.nuevo_cliente()
        self.password(otro)
        self.assertEqual(otro.post('/api/login/codigo', json={'codigo': self.recuperacion[0]}).status_code, 401)
        otro.close()

    def test_bloqueo_tras_cinco_fallos_compartido_entre_instancias(self):
        segunda = create_app(self.settings)  # otra "instancia" sobre la misma BD
        c2 = self.nuevo_cliente(segunda)
        for i in range(5):
            cliente = self.client if i % 2 == 0 else c2
            self.assertEqual(self.password(cliente, 'contrasena-equivocada-1').status_code, 401)
        self.assertEqual(self.password(c2).status_code, 429)  # ni con la contraseña correcta
        c2.close()
        segunda.state.db.engine.dispose()

    def test_avisa_por_telegram_al_entrar(self):
        with patch('crm.security.avisar') as avisar:
            self.entrar()
        self.assertTrue(any('Inicio de sesión' in str(c.args[1]) for c in avisar.call_args_list))

    def test_origen_ajeno_y_sin_csrf_bloqueados(self):
        self.entrar()
        malo = self.client.post('/api/records/empresas', json={'nombre': 'X'}, headers={'Origin': 'https://evil.test'})
        self.assertEqual(malo.status_code, 403)
        sitio = self.client.post('/api/records/empresas', json={'nombre': 'X'}, headers={'Sec-Fetch-Site': 'cross-site'})
        self.assertEqual(sitio.status_code, 403)
        sin_csrf = self.client.post('/api/records/empresas', json={'nombre': 'X'}, headers={'X-CSRF-Token': ''})
        self.assertEqual(sin_csrf.status_code, 403)

    def test_host_no_autorizado(self):
        c = TestClient(self.app, base_url='https://otro.test')
        self.assertEqual(c.get('/api/health').status_code, 400)
        c.close()

    def test_docs_desactivados_y_cabeceras(self):
        self.assertEqual(self.client.get('/api/docs').status_code, 404)
        self.assertEqual(self.client.get('/openapi.json').status_code, 404)
        h = self.client.get('/api/health').headers
        self.assertIn('max-age', h['strict-transport-security'])
        self.assertIn("frame-ancestors 'none'", h['content-security-policy'])

    def test_inactividad_cierra_la_sesion(self):
        self.entrar()
        viejo = (datetime.now(timezone.utc) - timedelta(minutes=31)).isoformat()
        with self.db.transaction(write=True) as s:
            for ses in s.query(Session).all():
                ses.last_seen = viejo
        self.assertEqual(self.client.get('/api/me').status_code, 401)

    def test_cerrar_todas_las_sesiones(self):
        self.entrar()
        otro = self.nuevo_cliente()
        self.entrar(otro, desplazamiento=1)  # el mismo código nunca se acepta dos veces
        self.assertEqual(otro.post('/api/logout/todas').status_code, 200)
        self.assertEqual(self.client.get('/api/me').status_code, 401)
        otro.close()

    def test_interruptor_de_apagado(self):
        app = create_app(settings(self.path, disabled=True))
        c = self.nuevo_cliente(app)
        self.assertEqual(c.get('/api/health').status_code, 503)
        c.close()
        app.state.db.engine.dispose()

    def test_keepalive_solo_con_secreto(self):
        self.assertEqual(self.client.get('/api/cron/keepalive').status_code, 401)
        self.assertEqual(self.client.get('/api/cron/keepalive', headers={'Authorization': 'Bearer malo'}).status_code, 401)
        self.assertEqual(self.client.get('/api/cron/keepalive', headers={'Authorization': 'Bearer cron-test-secret'}).status_code, 200)

    def test_demo_prohibido_en_linea(self):
        with self.assertRaises(ValueError):
            settings(self.path, demo=True)

    def test_cuenta_sin_codigo_configurado_no_entra(self):
        create_user(self.db, 'sin2fa@example.invalid', 'Sin 2FA', PASSWORD)
        r = self.client.post('/api/login', json={'email': 'sin2fa@example.invalid', 'password': PASSWORD})
        self.assertEqual(r.status_code, 403)

    def test_el_secreto_se_guarda_cifrado(self):
        from sqlalchemy import select
        from crm.db import User
        with self.db.transaction() as s:
            guardado = s.scalar(select(User).where(User.email == EMAIL)).totp_secret
        self.assertNotIn(self.secreto, guardado)
        self.assertEqual(security.descifrar(guardado, self.settings.totp_key), self.secreto)


if __name__ == '__main__':
    unittest.main()
