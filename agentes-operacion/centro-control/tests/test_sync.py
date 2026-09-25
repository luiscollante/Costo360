"""Sincronización de clientes reales de Costo360 -> CRM (con datos simulados)."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from sqlalchemy import select

from crm.auth import create_user
from crm.config import Settings
from crm.db import Audit, Record
from crm.main import create_app
from crm.sync import sincronizar_clientes

PASSWORD = 'Test-sync-pass-360!'


def respuesta(empresas):
    r = MagicMock()
    r.json.return_value = {'empresas': empresas}
    r.raise_for_status.return_value = None
    return r


def taller(eid='e1', nombre='Marmolería Uno', activa=True, usuarios=None, sus=None):
    return {'id': eid, 'nombre': nombre, 'nit': '900123', 'direccion': 'Barranquilla', 'telefono': '',
            'plan': 'Pro', 'plan_codigo': 'pro', 'precio_mensual_cop': 189000.0, 'activa': activa,
            'creado_en': '2026-09-01T10:00:00+00:00', 'suscripcion_estado': sus,
            'proximo_cobro': '2026-10-01T00:00:00+00:00' if sus else None,
            'usuarios': usuarios if usuarios is not None else [
                {'id': 'u1', 'nombre': 'Ana', 'rol': 'admin', 'cargo': 'Dueña', 'activo': True, 'email': 'ana@taller.test'}]}


class SyncTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.settings = Settings(database=str(Path(self.tmp.name) / 's.sqlite3'), admin_token='tok')
        self.app = create_app(self.settings)
        self.db = self.app.state.db
        create_user(self.db, 'founder@example.invalid', 'Fundador', PASSWORD)

    def tearDown(self):
        self.db.engine.dispose()
        self.tmp.cleanup()

    def sync(self, empresas):
        with patch('crm.sync.httpx.get', return_value=respuesta(empresas)):
            return sincronizar_clientes(self.db, self.settings)

    def filas(self, kind):
        with self.db.transaction() as s:
            return s.scalars(select(Record).where(Record.kind == kind)).all()

    def test_crea_empresa_cliente_con_contactos_y_suscripcion(self):
        r = self.sync([taller(sus='activa')])
        self.assertEqual((r['creados'], r['contactos'], r['suscripciones']), (1, 1, 1))
        empresa = self.filas('empresas')[0]
        self.assertEqual(empresa.data['estado'], 'Cliente')
        self.assertIn('costo360:e1', empresa.data['notas'])
        self.assertEqual(self.filas('contactos')[0].data['email'], 'ana@taller.test')
        self.assertEqual(self.filas('suscripciones')[0].data['estado'], 'Activa')

    def test_plan_asignado_a_mano_tambien_es_suscripcion_activa(self):
        r = self.sync([taller()])  # sin cobro de Wompi
        self.assertEqual(r['suscripciones'], 1)
        sus = self.filas('suscripciones')[0].data
        self.assertEqual((sus['estado'], sus['plan']), ('Activa', 'Pro'))
        self.assertIn('manualmente', sus['notas'])
        self.assertGreaterEqual(sus['renovacion'], sus['inicio'])

    def test_segunda_sincronizacion_sin_wompi_no_cambia_nada(self):
        self.sync([taller()])
        r = self.sync([taller()])
        self.assertEqual((r['actualizados'], r['contactos'], r['suscripciones']), (0, 0, 0))

    def test_segunda_sincronizacion_no_cambia_nada(self):
        self.sync([taller(sus='activa')])
        r = self.sync([taller(sus='activa')])
        self.assertEqual((r['creados'], r['actualizados'], r['contactos'], r['suscripciones']), (0, 0, 0, 0))

    def test_taller_desactivado_pasa_a_inactivo(self):
        self.sync([taller()])
        r = self.sync([taller(activa=False)])
        self.assertEqual(r['actualizados'], 1)
        self.assertEqual(self.filas('empresas')[0].data['estado'], 'Inactivo')

    def test_queda_en_la_auditoria_como_sincronizacion(self):
        self.sync([taller()])
        with self.db.transaction() as s:
            origenes = {a.origin for a in s.scalars(select(Audit)).all()}
        self.assertEqual(origenes, {'sincronizacion'})

    def test_un_taller_con_error_no_detiene_a_los_demas(self):
        malo = taller(eid='e2', nombre='')  # nombre vacío: falla la validación
        r = self.sync([malo, taller(eid='e3', nombre='Taller Bueno')])
        self.assertEqual(r['creados'], 1)
        self.assertEqual(len(r['errores']), 1)

    def test_prospecto_existente_con_el_mismo_nombre_se_vuelve_cliente(self):
        from crm import services
        with self.db.transaction(write=True) as s:
            from crm.db import User
            actor = s.scalar(select(User))
            services.mutate(s, actor, 'empresas', 'crear', {'nombre': 'Marmolería Uno'})
        r = self.sync([taller()])
        self.assertEqual((r['creados'], r['actualizados']), (0, 1))
        self.assertEqual(len(self.filas('empresas')), 1)
        self.assertEqual(self.filas('empresas')[0].data['estado'], 'Cliente')


if __name__ == '__main__':
    unittest.main()
