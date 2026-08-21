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
| Vercel Pro | Aloja la app web (frontend + backend) — sin GitHub, según la decisión ya tomada | $63.000 |
| Supabase Pro | Base de datos y autenticación | $126.000 |
| Dominio + SSL | Dirección web propia | $5.225 |
| Resend (plan Pro) | Que los correos (PDFs, notificaciones) lleguen de forma confiable | $63.000 |
| Cuentas de desarrollador (Apple $99/año + Google Play $25 único) | Publicar la app en App Store y Google Play cuando llegue la Fase 5 (Android/iOS) | $32.319 (promedio mensualizado, Google Play es pago único) |

---

## C. Infraestructura de los agentes que operan la empresa (Capa B)

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Railway (Docker + WeasyPrint + los agentes) | Servidor donde corren los contenedores de los agentes y el motor de PDF. Docker y WeasyPrint son gratis (código abierto) — este es el costo del servidor que los ejecuta, no una licencia. | $187.719 |
| Claude Sonnet 5 + Gemini (consumo simulado de 5 funciones) | Simulación real por request/token (no estimado a ojo) que aportó el usuario: Ventas, Contabilidad, Soporte, Marketing y una función de orquestación/producto — con colchón de seguridad del 50%. ⚠️ Esta simulación se hizo antes de fijar la lista oficial de 6 agentes (Atención, Ventas, Marketing, Diseño, Contabilidad, Legal) — cubre bien Ventas/Contabilidad/Atención/Marketing, pero no coincide exactamente con Diseño. Pendiente de una simulación dedicada más adelante. | $663.117 |
| Claude Sonnet 5 + Gemini (consumo estimado — Agente 6: Legal y Cumplimiento) | Agregado el 2026-08-20 al confirmarse el sexto agente. **Estimado por comparación** con el agente de similar volumen/complejidad (Contabilidad: bajo volumen, tareas complejas por request) — no es una simulación por request propia todavía, a diferencia de los otros 5. Ajustar cuando se construya el agente y Langfuse dé datos reales. | $67.000 |
| Langfuse | Monitorea gasto y fallos de cada agente | $0 (autoalojado) |
| WhatsApp Cloud API (oficial, Meta) | Canal del Agente de Ventas | $0 (dentro del límite gratuito de 1.000 conversaciones/mes) |
| Alegra (plan Pro) | El Agente de Contabilidad lo usa para facturar y declarar impuestos de Costo360 — el plan Pro cubre hasta $180M COP/mes en ingresos, muy por encima de lo que factura Costo360 en el Año 1 | $99.900 |
| Pipedrive (Lite, 1 usuario) | El Agente de Ventas/Marketing gestiona ahí los leads — 1 usuario porque sigues siendo solo tú en el equipo | $44.100 |
| Higgsfield (plan Ultra) | Generación de contenido (imagen/video) para Marketing y Diseño | $311.850 |
| Tavily/Serper (API de búsqueda web) | El Agente de Ventas investiga prospectos en internet antes de contactarlos | $78.216 |

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
| Desarrollo de tecnología/app | Consumo extra de API durante la fase activa de pruebas y depuración (~3 meses antes del lanzamiento comercial, ~2,5x el consumo operativo estable de $663.117/mes por la repetición constante de pruebas) — no cubre las herramientas en sí (Claude Max/Google AI Ultra ya son gasto mensual recurrente), sino el consumo extra de tokens mientras se construye | $5.000.000 |
| Marketing de lanzamiento | Impulso inicial de pauta + branding | $2.500.000 |
| Equipos y maquinaria | Ver desglose en la tabla de abajo — portátil + continuidad operativa | $18.400.000 |
| Otro (reserva discrecional) | "Carta de navidad" — fondo aparte de los Imprevistos, para lo puntual que surja en el año y no encaje en ninguna categoría fija | $3.000.000 |
| Capital de trabajo inicial | ~4 meses de Gastos operativos, ya a escala completa desde el día 1 | $33.000.000 |
| Imprevistos (10% de las líneas anteriores) | Contingencia estándar | $6.350.000 |

### Desglose de "Equipos y maquinaria"

| Equipo | Por qué | Costo |
|---|---|---|
| ASUS ROG Zephyrus G14 (2026) — AMD Ryzen AI 9 370HX, RTX 5080, **32GB RAM** | Portátil de desarrollo — precio real verificado en [Falabella Colombia](https://www.falabella.com.co/falabella-co/shop/asus-rog-zephyrus-g14) ($13.299.000 con 22% descuento, 2TB SSD), con garantía oficial. Redondeado a $14.000.000 por decisión del usuario (deja un pequeño colchón sobre el precio real, útil si el descuento actual no sigue vigente al momento de comprar). La variante de 64GB no está disponible en ninguna tienda colombiana con garantía oficial (la RAM viene soldada de fábrica) — se optó por 32GB, más que suficiente para desarrollo local ya que los agentes en producción corren en la nube (Railway), no en el portátil | $14.000.000 (redondeado) |
| Monitor externo | Productividad — dashboard, Langfuse, Sentry en pantalla aparte | $1.500.000 |
| UPS / regulador de voltaje | Continuidad operativa ante cortes de luz | $500.000 |
| Router/módem de respaldo (4G/5G) | Continuidad ante caídas del internet principal | $400.000 |
| Celular de prueba gama media | QA real de la app Android/iOS (Fase 5) y de los flujos de WhatsApp Business | $1.500.000 |
| Disco SSD externo | Respaldo físico adicional a la nube | $500.000 |
| **Total Equipos y maquinaria** | | **$18.400.000** |

---

## Totales consolidados

| Concepto | Monto mensual |
|---|---|
| Software y herramientas tecnológicas (B + C + D + E) | $3.106.446 |
| Gastos operativos totales (todas las categorías, con 10% de contingencia) | $8.323.091 |
| **Gastos Año 1** (fijo los 12 meses, operación completa desde enero 2027) | **$99.877.092** |
| **Inversión total requerida** (categoría G) | **$69.850.000** |

**Financiamiento: 100% inversionista — $69.850.000 COP.** El fundador no pone capital propio; el propósito del modelo financiero es justamente conseguir que la inversión cubra la totalidad del arranque.

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
- **2026-08-18 (fusión con investigación propia del usuario):** el usuario aportó `web/Costo360 - Modelo Financiero e Infraestructura de Costos.xlsx`, con una simulación de consumo de tokens mucho más rigurosa (por request/agente, no estimada a ojo) y un stack de infraestructura más completo. Se fusionaron ambas fuentes:
  - Se adoptó la simulación de tokens real (6 agentes, con colchón del 50%): $663.117 COP/mes, reemplazando el estimado anterior de ~$230.000.
  - Se corrigió Railway a $187.719 COP/mes (cubre Docker + WeasyPrint + los agentes — ninguno de los dos cobra licencia, son gratis/código abierto).
  - Se agregaron: cuentas de desarrollador Apple/Google Play ($32.319/mes) y Tavily/Serper para prospección web ($78.216/mes).
  - Se confirmó explícitamente: Claude Max y Google AI Ultra se presupuestan al plan completo (no al plan Pro económico que traía el archivo del usuario); sin GitHub; Plan Enterprise se mantiene en $600.000; la proyección de Ingresos se mantiene con los 171 clientes ya cargados en el Excel de la universidad (no se reemplaza por la proyección más conservadora de 100 clientes del archivo nuevo); Google Workspace se mantiene en 1 sola cuenta (el usuario confirmó que sigue siendo el único integrante del equipo).
  - Se detectó y explicó un doble conteo en la hoja "Resumen Ejecutivo" del archivo del usuario (sumaba el consumo de tokens dos veces) — no se arrastró ese error a esta estructura.
  - Alegra y Pipedrive se mantuvieron en los planes ya elegidos (Pro y Lite respectivamente) por decisión propia ante la duda del usuario — ambos cubren la escala real de Costo360 en el Año 1 sin necesidad de planes superiores.

- **2026-08-18 (tercera parte):** se llenó "Equipos y maquinaria" (portátil ASUS ROG Zephyrus G14 2026 AMD+RTX5080+64GB, más equipo de continuidad operativa: monitor, UPS, router de respaldo, celular de prueba, SSD externo) y "Otro" (reserva discrecional de $3.000.000, separada de los Imprevistos). Inversión total sube a $72.050.000.

- **2026-08-18 (cuarta parte):** se ajustó "Desarrollo de tecnología/app" de $4.000.000 (cifra sin cálculo real detrás) a $5.000.000, justificado como el consumo extra de API durante ~3 meses de pruebas/depuración activa antes del lanzamiento, no como una contingencia genérica. Inversión total: $73.150.000.

- **2026-08-19:** se verificó el precio real del ASUS ROG Zephyrus G14 en Falabella Colombia — la variante de 64GB no existe con garantía oficial en el país (RAM soldada de fábrica). Se optó por la variante de 32GB, con precio real confirmado ($13.299.000, redondeado a $13.300.000) — más que suficiente para desarrollo local, ya que los agentes en producción corren en la nube. Inversión total baja a $69.080.000.
- **2026-08-20:** por decisión del usuario, el precio del portátil se redondeó de $13.300.000 a $14.000.000 (colchón sobre el precio real, por si el descuento vigente en Falabella cambia). Inversión total: $69.850.000.
- **2026-08-20 (segunda parte):** se validó la infraestructura de los 6 agentes (Railway con un servicio por agente, no VPS individuales por agente — ver `ARQUITECTURA_AGENTES_OPERACION.md` sección 1.1) y se confirmó el sexto agente, **Legal y Cumplimiento**. Se agregó su consumo estimado de API ($67.000 COP/mes — estimado por comparación, no simulado por request como los otros 5, pendiente de refinar cuando se construya). Gastos Año 1 sube a $99.877.092. La Inversión no cambia (este es un gasto recurrente, no de Inversión).

## Pendiente

- Refinar el consumo estimado del Agente Legal con una simulación real por request cuando se construya (hoy es una comparación, no una medición).
- La simulación de tokens de los otros 5 agentes ($663.117/mes) se hizo con una lista de funciones ligeramente distinta a los 6 agentes oficiales actuales (incluía "Producto/Nesting" y "Orquestador", que no son agentes de la Capa B) — cubre razonablemente Ventas/Contabilidad/Atención/Marketing, pero convendría una simulación dedicada para Diseño en algún momento.
