# Atención de Costo360 · piloto local

Primera etapa autorizada el 24 de septiembre de 2026: chat de la landing.

## Arranque

Desde `C:\Costo360\agentes-operacion`:

```powershell
..\backend\venv\Scripts\python.exe -m atencion
```

El servicio escucha únicamente en `127.0.0.1:8012`. La landing de desarrollo y preview reenvía `/api/atencion` a ese puerto. Dependencias propias en `requirements.txt`.

Por autorización explícita del fundador (24/09/2026), lee únicamente `GEMINI_AGENTE_API_KEY` (o `GEMINI_API_KEY`) de `backend/.env`, sin interpolación y sin cargar el resto de variables en el proceso. `ATENCION_GEMINI_API_KEY` tiene prioridad; asignarle una cadena vacía permite probar la guía sin IA. Nunca poner claves en Vite, navegador o Git. Las llamadas del chat usan la misma cuenta de proveedor del producto; su medición local es separada, la factura puede ser compartida.

Modelo validado: `gemini-3.5-flash`, razonamiento mínimo, 400 tokens de salida, sin herramientas ni reintentos del SDK. Límites iniciales: 50 intentos/día UTC, 1.000/mes y USD 1,50/día en reservas estimadas (actúa el que se alcance primero); configurables con `ATENCION_DAILY_CALLS`, `ATENCION_MONTHLY_CALLS` y `ATENCION_DAILY_USD`. Reserva conservadora por solicitud, sin devolución ante fallos. Usa tarifas verificadas de USD 1,50/M de entrada y USD 9/M de salida; no equivale a factura exacta ni limita otras aplicaciones que compartan la clave. La política incluye un filtro previo, máximo 8.500 bytes de contexto, 2 llamadas simultáneas, 20 solicitudes/minuto y caché en memoria de 10 minutos. Persiste solo contadores de consumo, no conversaciones.

Sin credencial, ante fallo del proveedor o al alcanzar un límite, funciona como **guía automática** y muestra ese modo. Las reglas editables están en `policy.md` y los contenidos aprobados en `knowledge.py`. El catálogo cubre producto, industria, planes, costos, margen, cotización, PDF, materiales, retales, nesting, proyectos, voz, historial, inicio, acceso y límites del servicio. No se ha afinado un modelo: Gemini clasifica intención y la aplicación compone textos revisados.

La IA selecciona temas y cantidad de usuarios; las respuestas, precios y enlaces proceden de `knowledge.py`. Esto evita dejar a un modelo la facultad de inventar descuentos, promesas o cobros. No es todavía un agente de soporte con herramientas sobre cuentas reales.

## Alcance entregado

- Explicar producto, planes, Cost, cotizaciones, materiales y proyectos.
- Recomendar el primer plan que cubre una cantidad explícita de usuarios.
- Reconocer casos que requieren intervención humana, sin fingir envío o resolución.
- Enlaces al producto y planes; copia de la conversación.
- Sin acceso al CRM, bases de clientes, facturas o cuentas del SaaS.
- Conversación solo en memoria del navegador; no se persiste en el servidor. Con IA activa, el texto y hasta cuatro consultas previas del visitante se envían a Google; los mensajes `assistant` enviados por el navegador se descartan del contexto de Gemini. El chat informa del proveedor antes del envío. El registro local contiene únicamente llamadas y cantidades de consumo, incluido razonamiento cuando se informa.
- Al fallar o agotar las llamadas IA, vuelve a la guía aprobada e informa el modo.

El fundador confirmó Enterprise a $875.000 COP al mes por empresa el 25/09/2026. La landing y la guía de atención reflejan esta decisión; el precio del cobro se obtiene de la tabla planes del backend. Cupos de voz: 5/10/15 por usuario, medición aproximada. La oferta y cobros deben actualizarse conjuntamente si cambia un precio.

## Antes de atención pública

1. La prueba real de clasificación se ejecutó con la clave autorizada. Antes de lanzar campañas, conviene separar la credencial del producto y revisar conversaciones; los tests de regresión usan proveedor simulado y la evaluación explícita `python -m atencion.evaluate --live` consume hasta ocho llamadas de prueba.
2. Definir canal humano y aviso de privacidad para recoger datos de contacto; hoy no se reciben leads ni se envían mensajes.
3. Conectar una entrada limitada de oportunidades/tickets al Centro de Control, sin dar al visitante acceso a su API interna. Verificar titularidad antes de consultar una cuenta.
4. Desplegar el servicio público separado: dominio/TLS, control de abuso persistente, presupuesto, supervisión y conexión de la landing. Este servidor rechaza visitantes remotos; **no se publica tal cual**.
5. Piloto con conversaciones reales: verificar exactitud de planes, primera cotización, escalamiento, costo por conversación y conversión a suscripción. No anunciar disponibilidad 24/7 ni autonomía total antes de validarlo.

## Pruebas

```powershell
# Desde agentes-operacion:
..\backend\venv\Scripts\python.exe -m unittest discover -s atencion/tests -v
# Con el servicio local levantado, desde landing:
npm test
```

La guía comercial no promete porcentajes de ahorro, resultados de clientes inexistentes, facturación DIAN ni sustitución de contabilidad. Registrar un interesado, recibir un pago y activar una suscripción serán hechos separados en las siguientes etapas.
