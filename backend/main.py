import sys
import os
import secrets
import types
from dotenv import load_dotenv

load_dotenv()

if "backend" not in sys.modules:
    backend_module = types.ModuleType("backend")
    backend_module.__path__ = [os.path.dirname(__file__)]
    sys.modules["backend"] = backend_module

# Motor Python path â€” centralizado aquÃ­ para que los routers no manipulen sys.path
_MOTOR_PATH = os.path.join(os.path.dirname(__file__), "motor")
if _MOTOR_PATH not in sys.path:
    sys.path.insert(0, _MOTOR_PATH)

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from backend.middleware.rate_limiter import limiter
from backend.routers import auth, calculos, cotizacion, parametros, config, dashboard, retales, admin, nesting, materiales, finanzas
from backend.db.client import get_engine


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    tmp = JSONResponse({}, status_code=429)
    view_rl = getattr(request.state, "view_rate_limit", None)
    if view_rl:
        tmp = limiter._inject_headers(tmp, view_rl)
    try:
        secs = int(tmp.headers.get("Retry-After", 60))
    except (ValueError, TypeError):
        secs = 60
    mins, rem = divmod(secs, 60)
    if mins and rem:
        espera = f"{mins} min y {rem} seg"
    elif mins:
        espera = f"{mins} min"
    else:
        espera = f"{rem} seg"
    return JSONResponse(
        {"detail": f"Demasiados intentos. Espera {espera} e intenta de nuevo."},
        status_code=429,
        headers={"Retry-After": str(secs)},
    )

_CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_recuperacion VARCHAR(255),
    pin_hash_version INTEGER NOT NULL DEFAULT 0,
    pin_bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    rol VARCHAR(20) NOT NULL DEFAULT 'Vendedor',
    nombre_completo VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sesiones (
    token VARCHAR(255) PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    device_hint VARCHAR(255),
    ultimo_uso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts     ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_accion ON audit_log(accion, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user   ON audit_log(usuario_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS cotizaciones (
    id SERIAL PRIMARY KEY,
    numero TEXT UNIQUE NOT NULL,
    fecha DATE NOT NULL,
    cliente TEXT NOT NULL,
    material TEXT,
    tipo TEXT,
    m2 NUMERIC,
    ml NUMERIC,
    costo NUMERIC,
    precio NUMERIC,
    margen NUMERIC,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    datos_json JSONB,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_config (
    clave       TEXT PRIMARY KEY,
    valor       TEXT NOT NULL DEFAULT '{}',
    actualizado TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventario_retales (
    id                  SERIAL PRIMARY KEY,
    material_categoria  TEXT    NOT NULL,
    referencia          TEXT    NOT NULL DEFAULT '',
    m2_disponibles      NUMERIC NOT NULL DEFAULT 0,
    m2_original         NUMERIC NOT NULL DEFAULT 0,
    origen_numero       TEXT    NOT NULL DEFAULT '',
    origen_cliente      TEXT    NOT NULL DEFAULT '',
    fecha_ingreso       DATE    NOT NULL DEFAULT CURRENT_DATE,
    estado              TEXT    NOT NULL DEFAULT 'Disponible',
    notas               TEXT    NOT NULL DEFAULT '',
    precio_recuperacion NUMERIC NOT NULL DEFAULT 0,
    precio_mercado_m2   NUMERIC NOT NULL DEFAULT 0,
    usuario_id          INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS catalogo_materiales (
    id              SERIAL PRIMARY KEY,
    categoria       TEXT    NOT NULL,
    referencia      TEXT    NOT NULL,
    precio_m2       NUMERIC NOT NULL DEFAULT 0,
    precio_lamina   NUMERIC,
    ancho_lamina_cm NUMERIC,
    alto_lamina_cm  NUMERIC,
    proveedor       TEXT    NOT NULL DEFAULT 'Gramar',
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_catalogo_cat ON catalogo_materiales(categoria);

CREATE TABLE IF NOT EXISTS facturas_compra (
    id SERIAL PRIMARY KEY,
    fecha DATE,
    mes VARCHAR(20),
    proveedor VARCHAR(255),
    categoria VARCHAR(100),
    descripcion TEXT,
    cantidad NUMERIC DEFAULT 1.0,
    precio_unitario NUMERIC DEFAULT 0.0,
    descuento NUMERIC DEFAULT 0.0,
    comisiones NUMERIC DEFAULT 0.0,
    rete_ica NUMERIC DEFAULT 0.0,
    subtotal NUMERIC DEFAULT 0.0,
    iva NUMERIC DEFAULT 0.0,
    retefuente NUMERIC DEFAULT 0.0,
    total NUMERIC DEFAULT 0.0,
    medio_de_pago VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'PAGADA',
    fecha_extraccion TIMESTAMPTZ DEFAULT NOW(),
    archivo_origen VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas_compra(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_mes ON facturas_compra(mes);
CREATE INDEX IF NOT EXISTS idx_facturas_prov ON facturas_compra(proveedor);

ALTER TABLE facturas_compra ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_numero_unico
    ON facturas_compra(proveedor, numero_factura)
    WHERE numero_factura IS NOT NULL AND numero_factura <> '';

CREATE TABLE IF NOT EXISTS correos_procesados (
    id SERIAL PRIMARY KEY,
    cuenta VARCHAR(255) NOT NULL,
    message_id VARCHAR(998) NOT NULL,
    procesado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cuenta, message_id)
);
"""


def _seed_catalogo(conn):
    """Pobla catalogo_materiales con los precios Gramar si la tabla estÃ¡ vacÃ­a."""
    import json, os, sqlalchemy as _sa
    try:
        count = conn.execute(_sa.text("SELECT COUNT(*) FROM catalogo_materiales")).scalar()
        print(f"[seed] catalogo_materiales count={count}", flush=True)
        if count and count > 0:
            print("[seed] tabla ya tiene datos, saltando seed", flush=True)
            return
        seed_path = os.path.join(os.path.dirname(__file__), "seed_materiales.json")
        print(f"[seed] buscando seed en: {seed_path}", flush=True)
        if not os.path.exists(seed_path):
            print("[seed] archivo seed no encontrado", flush=True)
            return
        with open(seed_path, encoding="utf-8") as f:
            items = json.load(f)
        print(f"[seed] insertando {len(items)} materiales...", flush=True)
        for item in items:
            conn.execute(
                _sa.text(
                    "INSERT INTO catalogo_materiales "
                    "(categoria, referencia, precio_m2, precio_lamina, ancho_lamina_cm, alto_lamina_cm, proveedor) "
                    "VALUES (:cat, :ref, :p_m2, :p_lam, :ancho, :alto, :prov)"
                ),
                {
                    "cat":   item.get("categoria", ""),
                    "ref":   item.get("referencia", ""),
                    "p_m2":  item.get("precio_m2", 0),
                    "p_lam": item.get("precio_lamina"),
                    "ancho": item.get("ancho_lamina_cm"),
                    "alto":  item.get("alto_lamina_cm"),
                    "prov":  item.get("proveedor", "Gramar"),
                },
            )
        conn.commit()
        print("[seed] seed completado exitosamente", flush=True)
    except Exception as e:
        print(f"[seed] ERROR: {e}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import sqlalchemy as _sa
    from backend.services.auth_service import hash_password
    import subprocess
    
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(_sa.text(_CREATE_TABLES_SQL))
        conn.commit()
        _seed_catalogo(conn)
        
        # Seed parameters
        try:
            print("[seed] Seeding parametros...", flush=True)
            import backend.seed_parametros
            backend.seed_parametros.seed()
        except Exception as e:
            print(f"[seed] Error seeding parametros: {e}", flush=True)

        # Create default admin if not exists
        try:
            count = conn.execute(_sa.text("SELECT COUNT(*) FROM usuarios")).scalar()
            if count == 0:
                admin_password = os.environ.get("DEFAULT_ADMIN_PASSWORD") or secrets.token_urlsafe(12)
                if not os.environ.get("DEFAULT_ADMIN_PASSWORD"):
                    print(f"[seed] DEFAULT_ADMIN_PASSWORD no configurada â€” admin creado con contraseÃ±a generada: {admin_password} (guÃ¡rdala, no se vuelve a mostrar)", flush=True)
                else:
                    print("[seed] Creating default admin...", flush=True)
                pwd_hash = hash_password(admin_password)
                conn.execute(
                    _sa.text("INSERT INTO usuarios (username, password_hash, rol, nombre_completo) VALUES (:u, :p, :r, :n)"),
                    {"u": "admin", "p": pwd_hash, "r": "Admin", "n": "Administrador Principal"}
                )
                conn.commit()
        except Exception as e:
            print(f"[seed] Error creating admin: {e}", flush=True)

    yield


app = FastAPI(
    title="Costo360 API",
    version="0.2.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173", "*",
        "http://localhost:3000",
        "https://app.marmolescollanteycastro.com",
        "https://costo360.vercel.app",
        "https://web-teal-seven-30.vercel.app",
        "https://localhost",  # WebView de Capacitor en el APK Android
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Session-Token"],
)

app.include_router(auth.router)
app.include_router(calculos.router)
app.include_router(cotizacion.router)
app.include_router(parametros.router)
app.include_router(config.router)
app.include_router(dashboard.router)
app.include_router(retales.router)
app.include_router(admin.router)
app.include_router(nesting.router)
app.include_router(materiales.router)
app.include_router(finanzas.router)


@app.get("/")
def health():
    return {"status": "ok"}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
