"""Base de datos del Centro de Control.

Local: SQLite (piloto de siempre, escrituras serializadas con BEGIN IMMEDIATE).
En línea (ciclo /goal 2026-09-24): Postgres en un proyecto Supabase SEPARADO
de los datos de los talleres, vía el pooler (NullPool, sin sentencias
preparadas) y escrituras serializadas con un candado de transacción
(`pg_advisory_xact_lock`), el equivalente de BEGIN IMMEDIATE.
"""
from contextlib import contextmanager
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import NullPool, StaticPool


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def uid() -> str:
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    password: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    # 2º factor (solo en línea): secreto TOTP cifrado con AES-GCM y último paso
    # usado (anti-reuso de un mismo código).
    totp_secret: Mapped[str | None] = mapped_column(String, nullable=True)
    totp_last_step: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Session(Base):
    __tablename__ = 'sessions'
    token_hash: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    csrf: Mapped[str] = mapped_column(String)
    expires: Mapped[str] = mapped_column(String)
    # En línea una sesión nace con mfa=False y solo sirve para verificar el
    # código; al verificarlo se emite un token NUEVO con mfa=True.
    mfa: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen: Mapped[str | None] = mapped_column(String, nullable=True)


class RateEvent(Base):
    """Límites y bloqueos compartidos entre instancias (en serverless la
    memoria del proceso no sirve)."""
    __tablename__ = 'rate_events'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String, index=True)
    ts: Mapped[str] = mapped_column(String, default=now, index=True)


class RecoveryCode(Base):
    __tablename__ = 'recovery_codes'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    code_hash: Mapped[str] = mapped_column(String)
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class SecurityLog(Base):
    """Bitácora de seguridad (inicios de sesión, fallos, bloqueos). Nunca
    guarda contraseñas, códigos ni tokens."""
    __tablename__ = 'security_log'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    event: Mapped[str] = mapped_column(String)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String, default=now)


class Record(Base):
    __tablename__ = 'records'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    kind: Mapped[str] = mapped_column(String, index=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey('records.id'), nullable=True, index=True)
    identity: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    data: Mapped[dict] = mapped_column(JSON)
    version: Mapped[int] = mapped_column(Integer, default=1)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String, default=now)
    updated_at: Mapped[str] = mapped_column(String, default=now)


class Audit(Base):
    __tablename__ = 'audit'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    record_id: Mapped[str] = mapped_column(ForeignKey('records.id'), index=True)
    action: Mapped[str] = mapped_column(String)
    origin: Mapped[str] = mapped_column(String)
    before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[str] = mapped_column(String, default=now)


class Proposal(Base):
    __tablename__ = 'proposals'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    kind: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    record_id: Mapped[str | None] = mapped_column(ForeignKey('records.id'), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON)
    before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    state: Mapped[str] = mapped_column(String, default='pendiente')
    origin: Mapped[str] = mapped_column(String, default='agente')
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[str] = mapped_column(String, default=now)
    expires: Mapped[str] = mapped_column(String)


class Message(Base):
    __tablename__ = 'messages'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    role: Mapped[str] = mapped_column(String)
    text: Mapped[str] = mapped_column(String)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[str] = mapped_column(String, default=now)


class Usage(Base):
    __tablename__ = 'usage'
    day: Mapped[str] = mapped_column(String, primary_key=True)
    calls: Mapped[int] = mapped_column(Integer, default=0)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)


# Columnas agregadas después del piloto: las bases SQLite locales ya
# existentes (demo.sqlite3) las reciben con ALTER TABLE al arrancar.
_COLUMNAS_NUEVAS = {
    'users': {'totp_secret': 'VARCHAR', 'totp_last_step': 'INTEGER'},
    'sessions': {'mfa': 'BOOLEAN DEFAULT 1', 'last_seen': 'VARCHAR'},
}


class Database:
    def __init__(self, url: str):
        self.postgres = url.startswith('postgresql')
        if self.postgres:
            # Pooler de Supabase en modo transacción: sin pool propio (serverless)
            # y sin sentencias preparadas.
            self.engine = create_engine(url.replace('postgresql://', 'postgresql+psycopg://', 1),
                                        poolclass=NullPool, connect_args={'prepare_threshold': None})
        else:
            options = {'connect_args': {'check_same_thread': False, 'timeout': 15}}
            if url == ':memory:':
                options['poolclass'] = StaticPool
            self.engine = create_engine('sqlite:///' + url, **options)
            @event.listens_for(self.engine, 'connect')
            def configure(connection, _):
                connection.execute('PRAGMA foreign_keys=ON')
                connection.execute('PRAGMA busy_timeout=15000')
            Base.metadata.create_all(self.engine)
            self._agregar_columnas()
        # En Postgres el esquema se crea con crm/migrations/*.sql, nunca en caliente.
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def _agregar_columnas(self):
        insp = inspect(self.engine)
        with self.engine.begin() as conn:
            for tabla, columnas in _COLUMNAS_NUEVAS.items():
                existentes = {c['name'] for c in insp.get_columns(tabla)}
                for nombre, tipo in columnas.items():
                    if nombre not in existentes:
                        conn.execute(text(f'ALTER TABLE {tabla} ADD COLUMN {nombre} {tipo}'))

    @contextmanager
    def transaction(self, write=False):
        with self.sessions() as session:
            try:
                if write:
                    if self.postgres:
                        session.execute(text('SELECT pg_advisory_xact_lock(360360)'))
                    else:
                        session.connection().exec_driver_sql('BEGIN IMMEDIATE')
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise
