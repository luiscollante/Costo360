# PLAN_COSTOS_COMPLETO_COSTO360.md — Estructura de costos completa de Costo360

*Última actualización: 2026-08-17. Todos los valores en COP — sin excepción.*
*Objetivo: ser la fuente única de verdad de la estructura de costos, para llenar las hojas Costos, Gastos e Inversión de*
*`C:\Users\wases\Desktop\Universidad\Opción de grado\Costo360\Modelo Financiero - Costo360.xlsx`.*

**Supuesto de tasa de cambio:** ~$3.150 COP/USD (TRM de referencia, agosto 2026) — usado solo para convertir precios que los proveedores publican en dólares. Ajustar si la tasa cambia significativamente antes de llenar el Excel.

---

## A. Costos variables — por cliente/mes (escalan con la cantidad de clientes)

| Ítem | Para qué sirve | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Comisión pasarela de pago (Wompi/ePayco, ~2,99% + $900) | Cobrar la suscripción mensual | $5.385 | $12.113 | $18.840 |
| Infraestructura Cloud (ya cubierta en Gastos fijos) | $0 — Vercel Pro y Supabase Pro son suscripciones fijas (categoría B) con cupos que Costo360 no agota en el Año 1; no hay costo real que se dispare por cliente adicional. Cobrarlo aquí también sería contarlo dos veces. | $0 | $0 | $0 |
| IA del producto (Gemini) | Asistente de cotización en Modo Express | $5 | $5 | $5 |
| Agente de Atención al Cliente (Claude Sonnet 5) | Responde dudas de talleres clientes (~2 conversaciones/mes) | $15 | $15 | $15 |
| **TOTAL COSTO UNITARIO** | | **$5.405** | **$12.133** | **$18.860** |
| % sobre el precio del plan | | 3,6% | 3,2% | 3,1% |

**Margen Bruto resultante: 96,7%** (el cambio frente a la versión anterior es mínimo en el número, pero importante en el principio: no se incluyen costos que no están respaldados por un cálculo real)

*Nota: si Costo360 llega a una escala mucho mayor (miles de clientes) donde Vercel/Supabase empiecen a cobrar excedentes reales sobre el plan Pro, ahí sí correspondería reintroducir esta fila con un cálculo real de esos excedentes — no antes.*

---

## B. Infraestructura del producto Costo360 (lo que usan los talleres)

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Vercel Pro | Aloja la app web (frontend + backend) | $63.000 |
| Supabase Pro | Base de datos y autenticación | $126.000 |
| Dominio + SSL | Dirección web propia | $700 |
| Resend (plan Pro) | Que los correos (PDFs, notificaciones) lleguen de forma confiable | $63.000 |

---

## C. Infraestructura de los agentes que operan la empresa (Capa B)

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Railway | Servidor donde viven los 5 agentes, corriendo todo el tiempo | $16.000 |
| Claude Sonnet 5 (API) | Razonamiento de los 5 agentes (consumo real, con cascada de caché) | $200.000 |
| Gemini 3.5 Flash-Lite (API, triage) | Filtro barato que clasifica antes de usar el modelo caro | $30.000 |
| Langfuse | Monitorea gasto y fallos de cada agente | $0 (autoalojado) |
| WhatsApp Cloud API (oficial, Meta) | Canal del Agente de Ventas | $0 (dentro del límite gratuito de 1.000 conversaciones/mes) |
| Alegra (plan Pro) | El Agente de Contabilidad lo usa para facturar y declarar impuestos de Costo360 | $99.900 |
| Pipedrive (Lite, 1 usuario) | El Agente de Ventas/Marketing gestiona ahí los leads | $44.100 |
| Higgsfield (plan Ultra) | Generación de contenido (imagen/video) para Marketing y Diseño | $311.850 |

---

## D. Monitoreo y calidad

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Sentry (plan Team) | Detecta errores en la app y los agentes antes que el usuario | $82.000 |
| PostHog | Analítica de uso del producto | $0 (plan gratis cubre la escala de Año 1) |

---

## E. Herramientas del fundador (para construir y mantener Costo360 — no son del producto)

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Claude Max (20x) | Uso de Claude Code para desarrollar y mantener Costo360 | $630.000 |
| Google AI Ultra | Uso de Gemini y herramientas Google para el desarrollo | $630.000 |
| Google Workspace (1 usuario) | Correo corporativo con dominio propio | $23.000 |

---

## F. Operación general (no tecnológica)

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Salario del fundador | Dedicación de tiempo completo | $3.500.000 |
| Arriendo y servicios públicos | 100% remoto | $0 |
| Marketing y publicidad (pauta paga) | LinkedIn/Google Ads, sector construcción | $500.000 |
| Honorarios y asesorías (contador humano) | Revisión y firma legal — un agente no reemplaza esto | $400.000 |
| Canva/Buffer | Diseño manual y programación de redes sociales | $60.000 |

---

## G. Costos legales — una sola vez (van en Inversión, no en Gastos mensuales)

| Ítem | Para qué sirve | Costo |
|---|---|---|
| Constitución S.A.S. + RUT + RST | Formalizar legalmente la empresa | $1.200.000 |
| Registro RNBD y cumplimiento Habeas Data | Obligación legal por manejar nombres y cuentas de prospectos | $400.000 |
| Desarrollo de tecnología/app | Contingencia técnica (no hay salario de arquitecto externo, se construye con Claude Code) | $4.000.000 |
| Marketing de lanzamiento | Impulso inicial de pauta + branding | $2.500.000 |
| Capital de trabajo inicial | ~4 meses de Gastos operativos, ya a escala completa desde el día 1 | $30.000.000 |
| Imprevistos (10% de las líneas anteriores) | Contingencia estándar | $3.810.000 |

---

## Totales consolidados

| Concepto | Monto mensual |
|---|---|
| Software y herramientas tecnológicas (B + C + D + parte de E) | $2.319.550 |
| Gastos operativos totales (todas las categorías F + Software, con 10% de contingencia) | $7.457.505 |
| **Gastos Año 1** (fijo los 12 meses, operación completa desde enero 2027) | **$89.490.060** |
| **Inversión total requerida** (categoría G) | **$41.910.000** |

**Financiamiento: 100% inversionista — $41.910.000 COP.** El fundador no pone capital propio; el propósito del modelo financiero es justamente conseguir que la inversión cubra la totalidad del arranque.

---

## Historial de decisiones que llevaron a esta estructura

- **2026-08-16:** primera versión, con rampa gradual (solo Agente 1 activo, planes gratuitos) — descartada.
- **2026-08-16 (segunda parte):** se decidió "todo financiado desde el día 1 de 2027" — sin rampa, operación completa desde enero.
- **2026-08-17:** se corrigió el consumo de API propuesto (de un "colchón" de $7.300.000 COP/mes a un cálculo real basado en volumen esperado de los 5 agentes, ~$230.000 COP/mes con margen de seguridad incluido).
- **2026-08-17:** se agregaron las herramientas que faltaban (Sentry, PostHog, Alegra, Pipedrive, Higgsfield, Resend, Claude Max, Google AI Ultra) tras una revisión técnica explícita de infraestructura.
- **2026-08-17:** se descartó Base44 (redundante con la arquitectura LangGraph + Claude Code ya elegida).
- **2026-08-17:** se corrigió que todos los valores deben quedar en COP, sin mezclar dólares.
- **2026-08-18:** se eliminó la fila "Infraestructura Cloud" de los Costos variables — no tenía un cálculo real detrás (era un número de relleno), y el costo verdadero de Vercel/Supabase ya está cubierto como gasto fijo en la categoría B. No se debe cobrar dos veces por lo mismo.
- **2026-08-18:** se corrigió el financiamiento a 100% inversionista — el fundador no aporta capital propio, ese es justamente el propósito de levantar el modelo financiero.

## Pendiente

Ninguna pregunta abierta por el momento — la estructura está lista para pasar al Excel cuando lo confirmes.
