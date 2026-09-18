import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

@dataclass(frozen=True)
class Settings:
    database: str = field(default_factory=lambda: os.getenv('CRM_DATABASE', str(ROOT / 'data' / 'crm.sqlite3')))
    demo: bool = field(default_factory=lambda: os.getenv('CRM_DEMO') == '1')
    gemini_key: str = field(default_factory=lambda: os.getenv('CRM_GEMINI_API_KEY', ''))
    gemini_model: str = field(default_factory=lambda: os.getenv('CRM_GEMINI_MODEL', ''))
    daily_calls: int = field(default_factory=lambda: int(os.getenv('CRM_DAILY_CALLS', '50')))
    origins: tuple[str, ...] = ('http://127.0.0.1:5178', 'http://localhost:5178', 'http://127.0.0.1:8011', 'http://localhost:8011')

    def __post_init__(self):
        if not 1 <= self.daily_calls <= 500:
            raise ValueError('CRM_DAILY_CALLS debe estar entre 1 y 500.')
        if self.database != ':memory:':
            Path(self.database).parent.mkdir(parents=True, exist_ok=True)
