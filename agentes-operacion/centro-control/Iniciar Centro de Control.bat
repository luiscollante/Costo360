@echo off
title Costo360 - Centro de Control
echo.
echo  ========================================================
echo.
echo   COSTO360 S.A.S. - Centro de Control Operativo
echo   Modo: Demostracion (datos ficticios)
echo.
echo  ========================================================
echo.
echo  Iniciando el servidor local...
echo.

set CRM_DEMO=1
set CRM_DATABASE=%~dp0data\demo.sqlite3
set PYTHONPATH=%~dp0
rem Clave privada para leer el consumo de IA de Costo360 (archivo local, nunca en git)
if exist "%~dp0admin_token.txt" set /p COSTO360_ADMIN_TOKEN=<"%~dp0admin_token.txt"

python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] No se encontro Python instalado en este equipo.
    echo.
    pause
    exit /b 1
)

python -c "import fastapi, uvicorn, sqlalchemy" >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Faltan dependencias de Python.
    echo  Ejecuta una sola vez:
    echo     pip install fastapi uvicorn sqlalchemy pydantic httpx google-genai
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0data\demo.sqlite3" (
    echo  Creando base de datos de demostracion por primera vez...
    python -m crm.manage demo
    echo.
)

echo  --------------------------------------------------------
echo.
echo  El sistema esta listo. Abre tu navegador web y ve a:
echo.
echo       http://127.0.0.1:8011
echo.
echo  Credenciales de demostracion:
echo     Correo:      demo@costo360.local
echo     Contrasena:  Demo-local-360!
echo.
echo  --------------------------------------------------------
echo.
echo  Para detener el servidor, cierra esta ventana.
echo.

start "" "http://127.0.0.1:8011"

python -m uvicorn crm.main:create_app --factory --host 127.0.0.1 --port 8011

echo.
echo  Servidor detenido. Puedes cerrar esta ventana.
pause
