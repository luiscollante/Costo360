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
| Constitución S.A.S. + RUT + RST + **registro de marca "Costo360" ante la SIC** | **Corregido 2026-08-21 (tercera parte), investigación legal exhaustiva.** La constitución pura (matrícula mercantil + impuesto de registro + certificado + RUT) cuesta en realidad menos de lo presupuestado: $330.000-$650.000 según el capital suscrito declarado (UVB 2026 = $12.110). Pero se encontró un gasto real y nunca contemplado: **registrar la marca "Costo360" ante la SIC (clase 42, servicios de software) antes de lanzar públicamente** — Colombia es un sistema "primero en registrar, primero en derecho": sin este registro, cualquier tercero podría registrar el nombre primero y forzar un cambio de marca con clientes ya activos. Costo: $1.347.500 (solicitud) + $84.500 (búsqueda de antecedentes, recomendada) ≈ $1.432.000. Total del rubro: constitución (~$650.000) + marca (~$1.432.000) ≈ $2.082.000, redondeado. **Confirmado que las patentes NO aplican** — el software no es patentable en Colombia (Decisión Andina 486); la protección correcta es el derecho de autor, automático y gratuito al crear el código, con registro opcional y gratis en la DNDA | $2.000.000 |
| Paquete legal SaaS (política de datos de tratamiento + Términos y Condiciones + contrato de suscripción) | **Corregido 2026-08-21 (tercera parte):** el monto anterior ($1.000.000) solo cubría la política de datos — investigación encontró que faltaban dos documentos reales y distintos: Términos y Condiciones de uso y el contrato de suscripción SaaS (qué pasa si un taller deja de pagar, propiedad de los datos al cancelar, límites de responsabilidad). Con tarifas reales de firmas boutique especializadas en startups en Colombia 2026, el paquete completo de los 3 documentos cuesta $1.200.000-$2.000.000 — se sube al monto medio-alto de ese rango | $1.800.000 |
| Desarrollo de tecnología/app | Consumo extra de API durante la fase activa de pruebas y depuración (~3 meses antes del lanzamiento comercial, ~2,5x el consumo operativo estable de $663.117/mes por la repetición constante de pruebas) — no cubre las herramientas en sí (Claude Max/Google AI Ultra ya son gasto mensual recurrente), sino el consumo extra de tokens mientras se construye. **Nota de honestidad:** el multiplicador 2,5x es una suposición propia razonable, no un dato de mercado investigado — no existe "precio de mercado" para consumo interno de API | $5.000.000 |
| Marketing de lanzamiento | Impulso inicial de pauta + branding — anclado a precios reales de agencias en Colombia 2026 (paquete de arranque "todo incluido": $950.000-$1.300.000/mes; equivale a ~2 meses de ese paquete antes de que arranque el presupuesto mensual regular de $500.000) | $2.500.000 |
| Equipos y maquinaria | Ver desglose en la tabla de abajo — portátil + continuidad operativa | $17.600.000 |
| Otro (reserva discrecional) | "Carta de navidad" — fondo aparte de los Imprevistos, para lo puntual que surja en el año y no encaje en ninguna categoría fija | $3.000.000 |
| Capital de trabajo inicial | **Corregido 2026-08-21 (segunda parte), tras reemplazar la proyección de Ingresos por una curva realista de 108 clientes:** con la nueva curva, el ingreso mensual supera el gasto fijo recién en **mayo**. Los "~4 meses" de capital de trabajo dejaron de ser un colchón de seguridad adicional y pasaron a ser prácticamente una necesidad real — el monto se mantiene, pero ahora por la razón correcta | $33.000.000 |
| Imprevistos (10% de las líneas anteriores) | Contingencia estándar — 10% es el límite superior del rango que sugiere la propia plantilla de la universidad (5-10%), no un número inventado | $6.490.000 |

### Desglose de "Equipos y maquinaria" (precios corregidos 2026-08-21 con cotizaciones reales de Falabella/Homecenter/Alkosto)

| Equipo | Por qué | Costo |
|---|---|---|
| ASUS ROG Zephyrus G14 (2026) — AMD Ryzen AI 9 370HX, RTX 5080, **32GB RAM** | Portátil de desarrollo — precio real verificado en [Falabella Colombia](https://www.falabella.com.co/falabella-co/shop/asus-rog-zephyrus-g14) ($13.299.000 con 22% descuento, 2TB SSD), con garantía oficial. Redondeado a $14.000.000 por decisión del usuario. La variante de 64GB no está disponible en ninguna tienda colombiana con garantía oficial (la RAM viene soldada de fábrica) — se optó por 32GB, más que suficiente para desarrollo local ya que los agentes en producción corren en la nube (Railway), no en el portátil | $14.000.000 (redondeado) |
| Monitor externo | Productividad — dashboard, Langfuse, Sentry en pantalla aparte. Corregido de $1.500.000 (sin investigar) a un monitor 24" estándar real | $600.000 |
| UPS / regulador de voltaje | Continuidad operativa ante cortes de luz. Corregido con precios reales de mercado (rango real $218.000-$320.000) | $300.000 |
| Router/módem de respaldo (4G/5G) | Continuidad ante caídas del internet principal. Corregido con precios reales (MiFi/router 4G real: $208.900-$354.900) | $300.000 |
| Celular de prueba gama media | QA real de la app Android/iOS (Fase 5) y de los flujos de WhatsApp Business. **Corregido 2026-08-21 (cuarta parte):** estaba en el extremo bajo del rango real ($1.399.000-$2.200.000) — subido al rango medio para dar colchón | $1.800.000 |
| Disco SSD externo | Respaldo físico adicional a la nube. **Corregido 2026-08-21 (cuarta parte):** estaba en el mínimo exacto del rango real ($504.990-$1.000.000) — subido al rango medio | $600.000 |
| **Total Equipos y maquinaria** | | **$17.600.000** |

---

## Totales consolidados

| Concepto | Monto mensual |
|---|---|
| Software y herramientas tecnológicas (B + C + D + E) | $3.106.446 |
| Gastos operativos totales (todas las categorías, con 10% de contingencia) | $8.323.091 |
| **Gastos Año 1** (fijo los 12 meses, operación completa desde enero 2027) | **$99.877.092** |
| **Inversión total requerida** (categoría G) | **$71.390.000** |

**Financiamiento: 100% inversionista — $71.390.000 COP.** El fundador no pone capital propio; el propósito del modelo financiero es justamente conseguir que la inversión cubra la totalidad del arranque.

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

- **2026-08-21 (auditoría de los 7 conceptos de Inversión):** se auditó honestamente qué estaba validado y qué no. Hallazgos: RNBD es gratuito y no obligatorio a esta escala (redirigido a redacción real de política de datos, $400.000→$1.000.000); 3 de 5 accesorios de Equipos estaban sobrestimados sin cotizar (Equipos $18.400.000→$17.200.000); Capital de trabajo verificado contra el breakeven real de la propia proyección de Ingresos (el ingreso cubre el gasto desde febrero — el colchón de 4 meses es de seguridad, no de necesidad estricta); Registro legal y Marketing de lanzamiento reforzados con tarifas/precios reales de mercado 2026, sin cambio de monto. Inversión total: $69.190.000.
- **2026-08-21 (propuesta de migración a GCP evaluada y descartada):** ver detalle completo en `ARQUITECTURA_AGENTES_OPERACION.md` sección 1.4 — no afecta las cifras de este documento, se mantiene la arquitectura Railway+Supabase.
- **2026-08-21 (auditoría de Ingresos — reemplazo de la curva de clientes):** se auditó la proyección de "Cantidad vendida por mes" contra la propia documentación de Costo360. Hallazgo: 171 clientes en el Año 1 implicaba capturar el 85% de los ~200 talleres identificados en el estudio original (limitado a Barranquilla/Costa Atlántica). El usuario aclaró que el alcance real para 2027 es **nacional** (LatAm queda para después del año 5). Se investigó el tamaño real del mercado nacional: 218 empresas registradas formalmente bajo el código oficial CIIU 2396 ("Corte, tallado y acabado de la piedra"), y un estimado de 450-650 talleres contando informalidad (el sector tiene una tasa de informalidad típica del 58-75% en Colombia). Se reemplazó la curva lineal original (171 clientes, crecimiento constante desde el mes 1) por una curva en forma de "S" (arranque lento, aceleración progresiva) que llega a **108 clientes en diciembre** — equivalente al hito "Fase 3: Escala Regional (100 clientes)" ya contemplado en el estudio de marzo, comprimido al Año 1 gracias a la inversión real y el alcance nacional. Representa ~17-24% del mercado nacional estimado (agresivo pero defendible, no imposible). Ingresos totales Año 1 bajan de $405.900.000 a **$174.900.000**. El punto de equilibrio mensual (ingreso ≥ gasto fijo) pasa de febrero a **mayo** — el colchón de 4 meses de Capital de trabajo (ver arriba) pasa de ser "seguridad extra" a ser prácticamente necesario.
- **2026-08-21 (cuarta parte — auditoría legal exhaustiva + ajuste de Equipos):** se investigó a fondo si "Registro legal y constitución" cubría todos los gastos legales reales de Costo360. Hallazgos: la constitución pura cuesta menos de lo presupuestado (~$330.000-$650.000), pero **faltaba un gasto real nunca contemplado — registrar la marca "Costo360" ante la SIC (~$1.432.000)**, necesario para no arriesgarse a que un tercero registre el nombre primero (Colombia es sistema "primero en registrar, primero en derecho"). Se confirmó que las patentes NO aplican al software (Decisión Andina 486) — el derecho de autor es automático y gratis. También se encontró que el paquete legal de datos ($1.000.000) solo cubría la política de tratamiento de datos, sin incluir Términos y Condiciones ni el contrato de suscripción SaaS — se subió a $1.800.000 con tarifas reales de firmas boutique para startups. De paso se corrigieron 2 de los 5 accesorios de Equipos y maquinaria que habían quedado en el extremo mínimo del rango real (celular $1.500.000→$1.800.000, SSD $500.000→$600.000). Inversión total: $69.190.000 → **$71.390.000**.
- **Nota aparte, no incluida en el Excel:** la seguridad social del fundador como independiente (~$508.000 COP/mes: salud, pensión, ARL) es un costo personal real y obligatorio, pero no es un gasto de la empresa (Inversión ni Gastos) — es presupuesto personal del usuario, se deja documentado aquí para que no se le olvide.

## Pendiente

- Refinar el consumo estimado del Agente Legal con una simulación real por request cuando se construya (hoy es una comparación, no una medición).
- La simulación de tokens de los otros 5 agentes ($663.117/mes) se hizo con una lista de funciones ligeramente distinta a los 6 agentes oficiales actuales (incluía "Producto/Nesting" y "Orquestador", que no son agentes de la Capa B) — cubre razonablemente Ventas/Contabilidad/Atención/Marketing, pero convendría una simulación dedicada para Diseño en algún momento.
- Con la nueva curva de Ingresos ($174.900.000 en vez de $405.900.000), el Estado de Resultados y el Punto de Equilibrio del Excel se recalculan solos (son fórmulas) — vale la pena que el usuario revise el margen EBITDA/Neto resultante, que baja significativamente al bajar los ingresos con los mismos gastos fijos.
