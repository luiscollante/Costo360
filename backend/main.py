import sys
import os
import types
from dotenv import load_dotenv

load_dotenv()

if "backend" not in sys.modules:
    backend_module = types.ModuleType("backend")
    backend_module.__path__ = [os.path.dirname(__file__)]
    sys.modules["backend"] = backend_module

# Motor Python path — centralizado aquí para que los routers no manipulen sys.path
_MOTOR_PATH = os.path.join(os.path.dirname(__file__), "motor")
if _MOTOR_PATH not in sys.path:
    sys.path.insert(0, _MOTOR_PATH)

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from backend.middleware.rate_limiter import limiter
from backend.routers import (
    auth, bootstrap, calculos, cotizacion, parametros, config, dashboard,
    retales, admin, nesting, materiales, inventario, agente,
)
# `finanzas` NO se registra en el prototipo nuevo: opera sobre `facturas_compra`, una
# tabla que el fundador confirmó que NO es de Costo360 (sobra de otro proyecto) y que
# no existe en el esquema multi-tenant. Ver docs/PLAN_FASE_2A.md (hallazgo R7).
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


def _self_test_rls() -> None:
    """
    Arranca solo si el aislamiento por empresa está realmente operativo (hallazgo C1).

    1. Conectividad.
    2. El rol de la conexión (`DATABASE_URL`) debe tener BYPASSRLS — si no, `empresa_actual()`
       (SECURITY DEFINER) entraría en recursión con su propia policy y el aprovisionamiento
       fallaría.
    3. `SET LOCAL ROLE authenticated` debe cambiar el rol de verdad y, sin claims, las
       políticas RLS deben bloquear (`cotizaciones` → 0 filas).
    4. `DATABASE_URL` no debe apuntar al transaction pooler (:6543): `SET LOCAL` no
       sobrevive a un `commit()` ahí.
    """
    url = os.environ.get("DATABASE_URL", "")
    if ":6543" in url:
        raise RuntimeError(
            "DATABASE_URL apunta al transaction pooler (:6543). Usá el session pooler "
            "(:5432): SET LOCAL no sobrevive a un commit() en el transaction pooler."
        )

    conn = get_engine().raw_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("select 1")

            cur.execute("select current_user, rolbypassrls from pg_roles where rolname = current_user")
            rol_base, bypass = cur.fetchone()
            if not bypass:
                raise RuntimeError(
                    f"El rol de conexión '{rol_base}' no tiene BYPASSRLS. db_service no "
                    "funcionaría y empresa_actual() podría entrar en recursión. Revisá "
                    "el rol de DATABASE_URL."
                )

            cur.execute("set local role authenticated")
            cur.execute("select current_user")
            if cur.fetchone()[0] != "authenticated":
                raise RuntimeError("SET LOCAL ROLE authenticated no tuvo efecto.")
            cur.execute("select count(*) from public.cotizaciones")
            n = cur.fetchone()[0]
            if n != 0:
                raise RuntimeError(
                    f"RLS no está bloqueando sin claims: cotizaciones devolvió {n} filas "
                    "como 'authenticated' sin sesión. El aislamiento por empresa NO es fiable."
                )
        conn.rollback()
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # El esquema lo gobiernan las migraciones de Supabase (backend/migrations/*.sql),
    # NO la app. Aquí solo se verifica que el aislamiento por empresa esté operativo.
    _self_test_rls()
    yield


app = FastAPI(
    title="Costo360 API",
    version="0.3.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Tokens Bearer (header que el JS fija explícitamente) → no se necesitan credenciales
# (cookies) en CORS. Orígenes: solo desarrollo local por ahora; se añade el dominio de
# despliegue del prototipo nuevo cuando exista (hallazgo S10).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "https://localhost",  # WebView de Capacitor en el APK Android
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Device-Id"],
)

app.include_router(auth.router)
app.include_router(bootstrap.router)
app.include_router(calculos.router)
app.include_router(cotizacion.router)
app.include_router(parametros.router)
app.include_router(config.router)
app.include_router(dashboard.router)
app.include_router(retales.router)
app.include_router(admin.router)
app.include_router(nesting.router)
app.include_router(materiales.router)
app.include_router(inventario.router)
app.include_router(agente.router)


@app.get("/")
def health():
    return {"status": "ok"}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
