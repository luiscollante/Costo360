import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

_LOCAL_ORIGINS = ('http://127.0.0.1:5178', 'http://localhost:5178', 'http://127.0.0.1:8011', 'http://localhost:8011')


def _hosts() -> tuple[str, ...]:
    return tuple(h.strip().lower() for h in os.getenv('CRM_PUBLIC_HOSTS', '').split(',') if h.strip())


@dataclass(frozen=True)
class Settings:
    # CRM_MODE=local (por defecto, idéntico al piloto de siempre) | online
    # (publicado en internet, ciclo /goal 2026-09-24: 2FA obligatorio, cookie
    # Secure, límites en BD, avisos por Telegram, sin modo demostración).
    mode: str = field(default_factory=lambda: os.getenv('CRM_MODE', 'local'))
    database: str = field(default_factory=lambda: os.getenv('CRM_DATABASE', str(ROOT / 'data' / 'crm.sqlite3')))
    demo: bool = field(default_factory=lambda: os.getenv('CRM_DEMO') == '1')
    gemini_key: str = field(default_factory=lambda: os.getenv('CRM_GEMINI_API_KEY', ''))
    gemini_model: str = field(default_factory=lambda: os.getenv('CRM_GEMINI_MODEL', ''))
    # Lectura del consumo de IA de la plataforma (pestaña "Consumo de IA").
    # El token vive SOLO del lado del servidor, nunca en el navegador.
    costo360_api: str = field(default_factory=lambda: os.getenv('COSTO360_API_URL', 'https://costo360-backend.vercel.app'))
    admin_token: str = field(default_factory=lambda: os.getenv('COSTO360_ADMIN_TOKEN', ''))
    daily_calls: int = field(default_factory=lambda: int(os.getenv('CRM_DAILY_CALLS', '50')))
    # Solo modo online:
    public_hosts: tuple[str, ...] = field(default_factory=_hosts)
    totp_key: str = field(default_factory=lambda: os.getenv('CRM_TOTP_KEY', ''))  # base64, 32 bytes (AES-GCM)
    cron_secret: str = field(default_factory=lambda: os.getenv('CRON_SECRET', ''))
    telegram_token: str = field(default_factory=lambda: os.getenv('TELEGRAM_BOT_TOKEN', ''))
    telegram_chat: str = field(default_factory=lambda: os.getenv('TELEGRAM_CHAT_ID', ''))
    disabled: bool = field(default_factory=lambda: os.getenv('CRM_ONLINE_DISABLED') == '1')  # interruptor de apagado
    # Agente de operaciones autónomo (resumen 06:30 y cierre 18:00, hora Bogotá).
    # CRM_AUTO_ENABLED=0 lo apaga sin desplegar código; secreto propio del disparo.
    auto_enabled: bool = field(default_factory=lambda: os.getenv('CRM_AUTO_ENABLED', '1') == '1')
    auto_secret: str = field(default_factory=lambda: os.getenv('CRM_AUTO_SECRET', ''))
    auto_daily_calls: int = field(default_factory=lambda: int(os.getenv('CRM_AUTO_DAILY_CALLS', '6')))
    # Solo pruebas automáticas: permite el modo en línea sobre SQLite temporal.
    testing: bool = False

    @property
    def online(self) -> bool:
        return self.mode == 'online'

    @property
    def origins(self) -> tuple[str, ...]:
        if self.online:
            return tuple('https://' + h for h in self.public_hosts)
        return _LOCAL_ORIGINS

    def __post_init__(self):
        if self.mode not in ('local', 'online'):
            raise ValueError('CRM_MODE debe ser local u online.')
        if not 1 <= self.daily_calls <= 500:
            raise ValueError('CRM_DAILY_CALLS debe estar entre 1 y 500.')
        if self.online:
            # Negarse a arrancar antes que arrancar inseguro.
            if self.demo:
                raise ValueError('El modo demostración está prohibido en línea.')
            if not self.public_hosts:
                raise ValueError('CRM_PUBLIC_HOSTS es obligatorio en línea.')
            if not self.database.startswith('postgresql') and not self.testing:
                raise ValueError('En línea la base de datos debe ser Postgres.')
            if len(self.totp_key) < 40:
                raise ValueError('CRM_TOTP_KEY (32 bytes en base64) es obligatoria en línea.')
        if self.database != ':memory:' and not self.database.startswith('postgresql'):
            Path(self.database).parent.mkdir(parents=True, exist_ok=True)
