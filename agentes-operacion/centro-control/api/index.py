"""Punto de entrada de Vercel (función Python) para el Centro de Control en línea.

Toda la configuración llega por variables de entorno del proyecto de Vercel
(CRM_MODE=online, CRM_DATABASE, CRM_PUBLIC_HOSTS, CRM_TOTP_KEY, ...). Si falta
algo obligatorio, `Settings` se niega a arrancar antes que arrancar inseguro.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from crm.main import create_app  # noqa: E402

app = create_app()
