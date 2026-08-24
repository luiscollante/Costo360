# PLAN_COSTOS_COMPLETO_COSTO360.md — Estructura de costos completa de Costo360

*Última actualización: 2026-08-22. Todos los valores en COP — sin excepción.*
*Objetivo: ser la fuente única de verdad de la estructura de costos, para llenar las hojas Costos, Gastos e Inversión de*
*`C:\Users\wases\Desktop\Universidad\Opción de grado\Costo360\Modelo Financiero - Costo360.xlsx`.*

**Supuesto de tasa de cambio:** $3.048,12 COP/USD (TRM real del 22-ago-2026, Banco de la República) — usado para todas las conversiones de esta sesión en adelante. Ajustar si la tasa cambia significativamente antes de llenar el Excel.

---

## A. Costos variables — por cliente/mes (escalan con la cantidad de clientes)

| Ítem | Para qué sirve | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Infraestructura del producto y de los agentes (Vercel/Supabase/Azure/consumo IA operativa) | **Reclasificado 2026-08-22** — prorrateado por uso real (ver nota abajo), ya no vive en Gastos | $2.253 | $25.408 | $233.941 |
| Agente conversacional de producto (Claude Sonnet 5) | Exclusivo Pro/Enterprise; en Enterprise escala por los 10 usuarios con acceso. Con la capa de revisión Fable + orquestador Gemini | $0 (no incluido) | $51.124 (1 usuario) | $511.240 (10 usuarios) |
| Agente de Atención al Cliente (Claude Sonnet 5) | Responde dudas de talleres clientes (~2 conversaciones/mes). Con la misma capa Fable+Gemini | $242 | $242 | $242 |
| Comisión pasarela de pago (Wompi/ePayco, ~2,99% + $900) | Cobrar la suscripción mensual — Enterprise recalculado tras subir su precio | $5.385 | $12.113 | $72.959 |
| Mano de obra directa (salario del fundador) + monitoreo | **Reclasificado 2026-08-22** — prorrateado por uso real (ver nota abajo), ya no vive en Gastos | $1.566 | $17.671 | $162.685 |
| **TOTAL COSTO UNITARIO** | | **$9.446** | **$106.558** | **$981.067** |
| % sobre el precio del plan | | 6,3% | 28,4% | 40,7% |
| **Margen Bruto** | | **93,7%** | **71,6%** | **59,3%** |

*Nota (Vercel/Supabase): si Costo360 llega a una escala mucho mayor (miles de clientes) donde empiecen a cobrar excedentes reales sobre el plan Pro, ahí sí correspondería reintroducir esa fila con un cálculo real de esos excedentes — no antes.*

**Corrección del "Agente conversacional de producto" (2026-08-22):** el ítem original ("IA del producto (Gemini)", $5/cliente/mes en los 3 planes) describía mal el producto real. No es un asistente puntual del "Modo Express" — es un agente conversacional (Claude Sonnet 5, no Gemini) disponible en una sección propia de la app, entrenado para ayudar de forma proactiva a llenar los Parámetros de costos y las 3 secciones de cotización (Directa, AIU, Express) mediante conversación. Es **exclusivo de Pro y Enterprise** (Starter no lo tiene), y en Enterprise **cada uno de los 10 usuarios tiene acceso**, no solo 1.

Cálculo (decisiones explícitas del usuario): modelo Claude Sonnet 5, **30 conversaciones/mes por usuario**, colchón de seguridad del 50% (mismo criterio que los demás agentes). Metodología: conversación típica de 5 turnos ≈ 24.500 tokens de entrada + 1.500 de salida acumulados ≈ $0,096 USD/conversación (precio Sonnet 5 post-promoción: $3,00/$15,00 por millón de tokens entrada/salida) → $2,88 USD/usuario/mes → con colchón, $4,32 USD/usuario/mes → **$13.168 COP/usuario/mes** (TRM $3.048,12). Enterprise multiplica ese valor por los 10 usuarios: **$131.679 COP/mes**.

**Impacto:** el margen bruto deja de ser uniforme entre planes. Starter casi no cambia (96,7%→96,4%). Pro baja de 96,8% a 93,3%. **Enterprise baja de 96,9% a 74,9%** — sigue siendo un margen sano, pero es una caída real: el precio fijo del plan ($600.000) no crece con la cantidad de usuarios, mientras que el costo del agente sí crece 1 a 1 con cada uno de los 10.

**Segunda vuelta — Fable revisando el 100% + Gemini 3.1 Pro como orquestador del 100% (2026-08-22, misma fecha):** el usuario definió una nueva capa de calidad para toda la arquitectura de agentes: **Claude Fable revisa el 100% de las respuestas de todos los agentes** (capa de auditoría para "casi 0 errores") y **Gemini 3.1 Pro orquesta el 100% de los mensajes entrantes** (decide qué agente atiende cada tarea). Se calculó el costo real de agregar esto sobre una conversación típica: Fable ($10/$50 USD por millón de tokens, más caro que Sonnet 5) leyendo el contexto + la respuesta del agente y devolviendo un veredicto corto, más Gemini 3.1 Pro ($2/$12 USD por millón) enrutando el mensaje — el costo de IA por conversación **se multiplica por ~3,9x** frente al agente solo. Aplicado al Agente conversacional de producto y al de Atención, el margen bruto de Enterprise caía a **11,6%** con el precio anterior ($600.000) — el usuario eligió **subir el precio de Enterprise en vez de reducir la cobertura de Fable** (ver categoría G y el nuevo precio en la hoja Ingresos: **$2.410.000/mes**, antes $600.000). Con el precio nuevo, el margen de Enterprise queda en **75,8%** — sano de nuevo, y el "100% revisado por el modelo más avanzado de Anthropic" se puede vender como diferencial real del plan premium, no solo como una subida de precio.

**Tercera vuelta — reclasificación Costos vs. Gastos (2026-08-22, misma fecha):** el usuario cuestionó la separación Costos/Gastos usada hasta ahora, argumentando que infraestructura, su propio salario, y "software y herramientas" son costos directos de operar el servicio (COGS), no gastos administrativos genéricos. Se analizó con criterio contable real, no se aceptó ni se rechazó todo en bloque:

- **Se acepta y se corrige:** infraestructura (Vercel/Supabase/Azure Container Apps), el consumo de IA operativa de los 6 agentes, Alegra/Pipedrive/Higgsfield/Tavily, monitoreo (Sentry/PostHog), y el salario del fundador — esto **sí es COGS estándar en SaaS** (costo de servir a los clientes / mano de obra directa, dado que el fundador opera los agentes de IA, no solo construyó el producto una vez). Se movió de Gastos a Costos.
- **No se acepta:** honorarios de abogado/contador (son gasto administrativo — G&A — en cualquier estándar contable, porque no sirven a un cliente específico sino a la existencia legal/tributaria de la empresa) ni Canva/Buffer (gasto de Marketing, no de servicio). Se quedan en Gastos.
- **Dentro de "Software y herramientas" se separó:** Claude Max y Google AI Ultra (herramientas de desarrollo *personal* del fundador, no lo que los agentes necesitan para operar) y Microsoft 365 (correo/oficina) se quedan en Gastos — no son infraestructura de los agentes.

**El ajuste mecánico:** la hoja Costos multiplica cada fila por la cantidad de clientes del mes, así que un costo fijo (ej. el salario) no se puede pegar tal cual — se prorrateó **proporcional al uso real de IA que ya está medido por plan** (no por igual entre cada cliente, que hubiera dejado a Starter con un margen de solo 9% — un cliente Enterprise con 10 usuarios consume muchísima más infraestructura que uno Starter con 1, así que paga más de ese costo compartido). Fórmula: costo fijo anual a repartir ($133.987.320) × peso de uso de cada plan (medido por su costo variable de IA ya calculado), dividido entre los client-meses de ese plan en el Año 1.

**Impacto en el Margen Bruto:** baja en los 3 planes (Starter 96,3%→93,7%, Pro 83,1%→71,6%, Enterprise 75,8%→59,3%) — pero **la Utilidad Neta no cambia por la reclasificación en sí** (es el mismo dinero, solo movido de una fila a otra del Estado de Resultados). Lo que sí reduce la Utilidad Neta de verdad es el hallazgo aparte: los honorarios de abogado/contador subieron de $400.000 (cifra sin respaldo real) a **$955.401/mes** con tarifas reales investigadas (ver categoría F) — eso sí es un costo nuevo real, no una reclasificación.

---

## B. Infraestructura del producto Costo360 (lo que usan los talleres)

**Reclasificado a Costos (2026-08-22):** este detalle se mantiene aquí como desglose de referencia, pero contablemente ya no es "Gastos" — es COGS, prorrateado por plan en la categoría A (fila "Infraestructura del producto y de los agentes"). El total de esta tabla ($289.544/mes) es parte del monto que se reparte por uso real entre Starter/Pro/Enterprise.

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Vercel Pro | Aloja la app web (frontend + backend) — sin GitHub, según la decisión ya tomada | $63.000 |
| Supabase Pro | Base de datos y autenticación | $126.000 |
| Dominio + SSL | Dirección web propia | $5.225 |
| Resend (plan Pro) | Que los correos (PDFs, notificaciones) lleguen de forma confiable | $63.000 |
| Cuentas de desarrollador (Apple $99/año + Google Play $25 único) | Publicar la app en App Store y Google Play cuando llegue la Fase 5 (Android/iOS) | $32.319 (promedio mensualizado, Google Play es pago único) |
| Cloudflare (plan Free) | Aloja la landing page de marketing (Cloudflare Pages, separada de la app en Vercel) + DNS/CDN del dominio | $0 |

### Landing page separada de la app — Hostinger evaluado y descartado (2026-08-22)

El usuario pidió que la landing page de marketing no viva en el mismo servidor que la app (aislar el "blast radius": si el servidor de la app falla, la puerta de entrada de marketing sigue funcionando — la preocupación es válida). Se evaluó contratar **Hostinger** para esto — **descartado**: su precio real (no el promocional de $2,99 USD/mes, que solo aplica pagando 48 meses de una vez) es **$33.500 COP/mes** ($402.000 COP/año), y no aporta nada que no exista ya gratis. Se investigó **Cloudflare** (plan Free): **Cloudflare Pages** aloja sitios estáticos con ancho de banda ilimitado sin costo, logrando el mismo aislamiento que buscaba el usuario. Vercel ya incluye de fábrica CDN propio y protección DDoS, así que Cloudflare no se suma por "seguridad extra" (sería redundante) sino específicamente como el hosting gratuito de la landing page. **Impacto en el presupuesto: $0.**

**Segunda vuelta — ¿Hostinger hace falta para AEO/visibilidad ante IA? (2026-08-22, misma fecha)** El usuario planteó que Hostinger "se comunica con" Cloudflare y que esa combinación es la que habilita el AEO (AI Engine Optimization / GEO — que asistentes de IA como ChatGPT citen o recomienden a Costo360 al responder preguntas del sector). Se investigó a fondo: la conexión Hostinger↔Cloudflare es real, pero **no es exclusiva de Hostinger** — es un interruptor gratuito (apuntar el DNS del dominio a Cloudflare) disponible con cualquier hosting, incluido Cloudflare Pages, que ya vive dentro de la red de Cloudflare sin necesitar un origen externo. El control de bots de IA de Cloudflare (producto real: "AI Crawl Control") se aplica en la capa de DNS/proxy, igual sin importar el hosting de origen. Lo que de verdad mueve la aguja en AEO no es el hosting: es no bloquear los robots de búsqueda de IA en Cloudflare, contenido HTML claro y bien estructurado, datos estructurados (schema.org), y sobre todo ser mencionado por fuentes externas reales (reseñas, directorios del sector, prensa) — nada de esto lo da Hostinger. **Se confirma: Cloudflare Pages (gratis) sin Hostinger.**

---

## C. Infraestructura de los agentes que operan la empresa (Capa B)

**Reclasificado a Costos (2026-08-22):** al igual que la categoría B, este es ahora COGS, prorrateado por uso real en la categoría A. Excepción: Langfuse sigue en $0 (sin presupuestar, sin cotización real).

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Azure Container Apps (reemplaza Railway, 2026-08-22) | Servidor donde corren los contenedores de los 6 agentes y el motor de PDF. Cobra por segundo de uso real, con una cuota gratis mensual (180.000 vCPU-seg + 360.000 GiB-seg) — estimado con contenedores modestos (0,5 vCPU/1GiB, ~50% del tiempo activos) | $60.000 |
| Claude Sonnet 5 + Claude Fable (100%) + Gemini 3.1 Pro (orquestador 100%) — techo de presupuesto Año 1 | **Recalculado 2026-08-22.** Con Fable revisando el 100% de las respuestas de los 6 agentes y Gemini 3.1 Pro orquestando el 100% de los mensajes entrantes, el consumo simulado anterior ($663.117 + $67.000 = $730.117) se multiplica por ~3,9x (metodología en categoría A) ≈ $2.847.456. El usuario pidió explícitamente un **techo de presupuesto deliberadamente alto** para el Año 1 (no un punto medio esperado) — se le agregó un colchón adicional ×2 sobre ese valor. **Esta cifra es un techo de seguridad, no el gasto real esperado — el gasto real probablemente sea la mitad o menos.** | $5.700.000 |
| Langfuse | Monitorea gasto y fallos de cada agente. **Se evaluó el plan Enterprise (2026-08-22): no tiene precio público fijo** — arranca en una referencia de ~$2.499 USD/mes pero se negocia por volumen con contrato anual. No se presupuesta un número sin respaldo real — se mantiene autoalojado hasta tener una cotización real. | $0 (autoalojado) |
| WhatsApp Cloud API (oficial, Meta) | Canal del Agente de Ventas | $0 (dentro del límite gratuito de 1.000 conversaciones/mes) |
| Alegra (plan Pro) | El Agente de Contabilidad lo usa para facturar y declarar impuestos de Costo360 — el plan Pro cubre hasta $180M COP/mes en ingresos, muy por encima de lo que factura Costo360 en el Año 1 | $99.900 |
| Pipedrive (Lite, 1 usuario) | El Agente de Ventas/Marketing gestiona ahí los leads — 1 usuario porque sigues siendo solo tú en el equipo | $44.100 |
| Higgsfield (plan Ultra) | Generación de contenido (imagen/video) para Marketing y Diseño | $311.850 |
| Tavily/Serper (API de búsqueda web) | El Agente de Ventas investiga prospectos en internet antes de contactarlos | $78.216 |

### Evaluación de migración a Microsoft/Azure (2026-08-22)

El usuario pidió evaluar migrar todo el ecosistema cloud a Microsoft (Azure para el despliegue de la app, Azure AI Foundry para los agentes, Microsoft 365 Empresarial). Se investigó con el mismo rigor que se usó para GCP el 2026-08-21 — no se asumió de antemano que convenía:

- **Hallazgo central:** no es posible un "ecosistema 100% Microsoft" manteniendo la arquitectura actual. Claude (Anthropic) sí está disponible en Microsoft Foundry (GA desde julio 2026), pero se factura con las mismas tarifas de Anthropic — **no hay ahorro por moverlo ahí**, solo unifica facturación. **Gemini NO está en el catálogo de Microsoft Foundry** (que solo tiene OpenAI, Anthropic, Meta, Mistral, Cohere, DeepSeek, xAI) — si Costo360 sigue usando Gemini 3.1 Pro como orquestador, tiene que seguir llamando a la API de Google directamente, fuera de Azure.
- **Vercel + Supabase → Azure: se descarta**, mismo criterio que con GCP. Azure Static Web Apps + Azure Database for PostgreSQL Flexible Server no traen empaquetado lo que Supabase ya da en un solo precio (Auth + Storage + Realtime + Postgres) — reconstruirlo en varios servicios sueltos de Azure no ahorra dinero y sí gasta tiempo de desarrollo. **Se mantiene Vercel + Supabase.**
- **Railway → Azure Container Apps: sí se adopta** — ahorro real (ver fila arriba, $187.719 → $60.000/mes).
- **Google Workspace → Microsoft 365 Business Premium: sí se adopta** (ver categoría E).

---

## D. Monitoreo y calidad

**Reclasificado a Costos (2026-08-22):** igual que B y C — el detalle vive aquí, el monto ($82.000/mes) se reparte por uso real en la categoría A, fila "Mano de obra directa + monitoreo".

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Sentry (plan Team) | Detecta errores en la app y los agentes antes que el usuario | $82.000 |
| PostHog | Analítica de uso del producto | $0 (plan gratis cubre la escala de Año 1) |

---

## E. Herramientas del fundador (para construir y mantener Costo360 — no son del producto)

**Se mantienen en Gastos (2026-08-22):** a diferencia de B/C/D, estas SÍ son gasto administrativo/R&D — son herramientas de desarrollo *personal* del fundador (Claude Max, Google AI Ultra) o de administración interna (correo), no infraestructura que los agentes necesiten para operar el servicio.

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Claude Max (20x) | Uso de Claude Code para desarrollar y mantener Costo360 | $630.000 |
| Google AI Ultra | Uso de Gemini y herramientas Google para el desarrollo | $630.000 |
| Microsoft 365 Business Premium (reemplaza Google Workspace, 2026-08-22) | Correo corporativo con dominio propio + Defender for Office 365 — precio real 2026, 1 usuario (el fundador) | $67.059 |

---

## F. Operación general (no tecnológica)

| Ítem | Para qué sirve | Costo mensual |
|---|---|---|
| Salario del fundador | **Movido a Costos (categoría A) el 2026-08-22** — ver la "tercera vuelta" de esa sección. Ya no aparece aquí; queda en $0 en esta hoja | $0 |
| Arriendo y servicios públicos | 100% remoto | $0 |
| Marketing y publicidad (pauta paga) | LinkedIn/Google Ads, sector construcción | $500.000 |
| Honorarios y asesorías profesionales | **Investigado con precios reales 2026-08-22** (antes $400.000, cifra sin respaldo): abogado — plan "departamento legal externo" real de una firma boutique colombiana (Legal Help, plan Enterprise), $550.758 + IVA (19%) = $655.401/mes; contador — sin tarifa pública exacta para el modelo "IA hace el trabajo pesado, humano revisa y firma" (servicio nuevo, sin tarifario propio todavía), inferido del extremo bajo de rangos reales de contabilidad para pyme pequeña ($100.000-$1.500.000/mes según volumen): $300.000/mes | $955.401 ($655.401 abogado + $300.000 contador) |
| Diseño y contenido (Canva/Buffer) | Gasto de Marketing (genera contenido de redes) — no es COGS, no cambia | $60.000 |

---

## G. Costos legales — una sola vez (van en Inversión, no en Gastos mensuales)

| Ítem | Para qué sirve | Costo |
|---|---|---|
| Constitución S.A.S. + RUT + RST + **registro de marca "Costo360" ante la SIC** | **Corregido 2026-08-21 (tercera parte), investigación legal exhaustiva.** La constitución pura (matrícula mercantil + impuesto de registro + certificado + RUT) cuesta en realidad menos de lo presupuestado: $330.000-$650.000 según el capital suscrito declarado (UVB 2026 = $12.110). Pero se encontró un gasto real y nunca contemplado: **registrar la marca "Costo360" ante la SIC (clase 42, servicios de software) antes de lanzar públicamente** — Colombia es un sistema "primero en registrar, primero en derecho": sin este registro, cualquier tercero podría registrar el nombre primero y forzar un cambio de marca con clientes ya activos. Costo: $1.347.500 (solicitud) + $84.500 (búsqueda de antecedentes, recomendada) ≈ $1.432.000. Total del rubro: constitución (~$650.000) + marca (~$1.432.000) ≈ $2.082.000, redondeado. **Confirmado que las patentes NO aplican** — el software no es patentable en Colombia (Decisión Andina 486); la protección correcta es el derecho de autor, automático y gratuito al crear el código, con registro opcional y gratis en la DNDA | $2.000.000 |
| Paquete legal SaaS (política de datos de tratamiento + Términos y Condiciones + contrato de suscripción) | **Corregido 2026-08-21 (tercera parte):** el monto anterior ($1.000.000) solo cubría la política de datos — investigación encontró que faltaban dos documentos reales y distintos: Términos y Condiciones de uso y el contrato de suscripción SaaS (qué pasa si un taller deja de pagar, propiedad de los datos al cancelar, límites de responsabilidad). Con tarifas reales de firmas boutique especializadas en startups en Colombia 2026, el paquete completo de los 3 documentos cuesta $1.200.000-$2.000.000 — se sube al monto medio-alto de ese rango | $1.800.000 |
| Desarrollo de tecnología/app | **Subido por el usuario 2026-08-22** de $5.000.000 a $80.000.000, reflejando una operación a escala mucho mayor (arquitectura de agentes ampliada con Fable+Gemini, más meses de desarrollo activo antes de un lanzamiento de nivel "startup emergente", no solo 3 meses de pruebas). Valor editable puesto directamente por el fundador. | $80.000.000 |
| Marketing de lanzamiento | **Subido por el usuario 2026-08-22** de $2.500.000 a $30.000.000, para una adquisición de clientes agresiva que sostenga la meta ambiciosa de 150 clientes en diciembre del Año 1. Valor editable puesto directamente por el fundador. | $30.000.000 |
| Equipos y maquinaria | Ver desglose en la tabla de abajo — portátil + continuidad operativa | $17.600.000 |
| Otro (reserva discrecional) | "Carta de navidad" — fondo aparte de los Imprevistos, para lo puntual que surja en el año y no encaje en ninguna categoría fija | $3.000.000 |
| Capital de trabajo inicial | **Recalculado 2026-08-22 (segunda vez, tras la reclasificación Costos/Gastos):** 3 meses × (Costos mensuales promedio del Año 1 + Gastos mensuales) = 3 × ($27.618.496 + $3.599.105) ≈ $93.652.803. El monto en pesos casi no cambia frente al cálculo anterior ($91.986.596) porque es la misma plata total — solo se reorganizó entre Costos y Gastos. | $93.652.803 |
| Imprevistos (10% de las líneas anteriores) | Contingencia estándar — 10% de la suma de Desarrollo+Equipos+RNBD+Capital de trabajo+Registro legal+Marketing — el límite superior del rango que sugiere la propia plantilla de la universidad (5-10%), no un número inventado | $22.505.280 |

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
| Costos variables (categoría A — COGS, escala con clientes; Año1 promedio) | $27.618.496 |
| Gastos operativos totales (fijos, ya no incluyen infraestructura/agentes/salario) | $3.599.105 |
| **Gastos Año 1** (fijo los 12 meses, operación completa desde enero 2027) | **$43.189.260** |
| **Inversión total requerida** (categoría G) | **$250.558.083** |

**Financiamiento: 100% inversionista — $250.558.083 COP.** El fundador no pone capital propio; el propósito del modelo financiero es justamente conseguir que la inversión cubra la totalidad del arranque.

**Nota sobre la meta de $300.000.000 (2026-08-22):** el usuario pidió dimensionar la Inversión a la escala de $300M, aclarando que la cifra es "estimada" y que los inversionistas están dispuestos a poner "más de 200 millones". El cálculo real, sumando cada concepto con su propio respaldo (sin inflar ninguno artificialmente para forzar un número), da **$250.558.083** — dentro del rango que el propio usuario definió como aceptable, sin necesidad de inventar una cifra de relleno solo para llegar a $300M exactos. Si se quiere llegar más cerca de $300M, el ajuste debería hacerse en una línea concreta y justificable (ej. "Otro"/reserva, o un capital de trabajo de más meses), no como un número sin respaldo.

**Nota sobre "Gastos Año 1" tras la reclasificación:** este total bajó mucho ($170,5M→$43,2M) porque infraestructura, consumo de IA operativa y el salario del fundador se movieron a Costos (categoría A) — no porque se haya recortado ningún gasto real. El costo total de operar Costo360 sigue siendo el mismo, solo está mejor clasificado entre COGS (Costos) y OpEx (Gastos).

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
- **2026-08-22 (landing page separada — Hostinger evaluado y descartado):** el usuario pidió que la landing page de marketing no viva en el mismo servidor que la app en Vercel. Se investigó Hostinger (precio real $33.500 COP/mes, no el promocional) — descartado por no aportar nada que no exista gratis. Se agregó Cloudflare (plan Free, $0) a la categoría B: Cloudflare Pages aloja la landing separada de la app, con ancho de banda ilimitado sin costo; Vercel ya cubre CDN/DDoS de fábrica, así que Cloudflare no se suma por seguridad sino como hosting gratuito de la landing. Sin cambio en los totales (impacto $0).
- **2026-08-22 (corrección del "Agente conversacional de producto" — categoría A):** el usuario aclaró que el ítem "IA del producto (Gemini)" ($5/cliente/mes, los 3 planes) describía mal el producto real: no es el Modo Express, es un agente conversacional (Claude Sonnet 5) exclusivo de Pro/Enterprise, que ayuda proactivamente a llenar Parámetros y las 3 cotizaciones por conversación — y en Enterprise, los 10 usuarios tienen acceso, no 1. Se recalculó con las decisiones explícitas del usuario (Claude Sonnet 5, 30 conversaciones/mes/usuario tras descartar un primer supuesto de 50/día por inviable, colchón del 50%, los 10 usuarios de Enterprise activos): $0 en Starter, $13.168 COP/usuario/mes en Pro, $131.679 COP/mes en Enterprise (10 usuarios). Costo unitario total: Starter $5.400, Pro $25.296, Enterprise $150.534. Margen bruto ya no es uniforme: Starter 96,4%, Pro 93,3%, **Enterprise 74,9%** (antes 96,9% — caída real, sigue siendo sano). No afecta los totales de Gastos/Inversión (categoría A es costo variable por cliente, no gasto fijo).

- **2026-08-22 (escala "grande" — migración a Azure, Fable+Gemini al 100%, precio Enterprise, Inversión a $248,7M):** cambio mayor de la sesión, en 4 partes:
  1. **Estructura Costos vs. Gastos — primera aclaración (sin cambio de fondo todavía):** el usuario pidió mover toda la infraestructura cloud y su propio salario a Costos. Se explicó el problema mecánico (la hoja Costos multiplica cada fila por la cantidad de clientes) y en este primer momento se mantuvo la separación anterior. **Esto se revirtió después en la misma sesión — ver la entrada "reclasificación Costos vs. Gastos" más abajo, donde sí se aceptó el argumento contable del usuario y se movió de verdad.**
  2. **Fable al 100% + Gemini 3.1 Pro orquestador al 100%:** el usuario definió esta nueva capa de calidad para todos los agentes. Se calculó el overhead real (~3,9x el costo de IA por conversación, porque Fable es más caro que Sonnet 5 y revisa *todo*, no solo casos de riesgo). Esto hundía el margen bruto de Enterprise a 11,6% con el precio anterior. El usuario eligió la Opción 1: mantener Fable al 100% y subir el precio de Enterprise (ver punto 4) en vez de reducir la cobertura de revisión.
  3. **Migración a Microsoft/Azure — evaluada con el mismo rigor que GCP (2026-08-21), no asumida de antemano:** Claude sí está en Microsoft Foundry pero a las mismas tarifas de Anthropic (sin ahorro); Gemini NO está en el catálogo de Foundry (Costo360 seguiría llamando a la API de Google directamente, así que no hay "ecosistema 100% Microsoft" real). Vercel+Supabase se mantienen (Azure no ofrece nada equivalente sin reconstruir manualmente lo que Supabase ya empaqueta). Sí se adoptan: **Railway → Azure Container Apps** ($187.719→$60.000/mes, ahorro real) y **Google Workspace → Microsoft 365 Business Premium** ($23.000→$67.059/mes). Se agregó un "techo de presupuesto Año 1" deliberadamente alto para el consumo de IA ($5.700.000/mes, categoría C) — pedido explícito del usuario para no quedarse corto, etiquetado honestamente como techo de seguridad, no gasto esperado real.
  4. **Nuevo precio de Enterprise: $600.000 → $2.410.000/mes**, calculado para restaurar un margen bruto sano (75,8%) con el costo real de Fable+Gemini al 100%. Esto sube significativamente los Ingresos proyectados (ver `Modelo Financiero - Costo360.xlsx`, hoja Ingresos).
  5. **Inversión total: $71.390.000 → $248.725.256** — el usuario subió directamente Desarrollo de tecnología ($5M→$80M) y Marketing de lanzamiento ($2,5M→$30M) en el Excel; se recalculó Capital de trabajo con la fórmula que él mismo definió (3 meses × Costos+Gastos mensuales, ya no un monto fijo) e Imprevistos (10% del nuevo subtotal). El usuario pidió apuntar a ~$300M — el cálculo real con todo respaldado da $248,7M, dentro del rango que el propio usuario definió como aceptable ("más de 200 millones"); no se infló ninguna línea artificialmente solo para llegar a $300M exactos.
  6. **Impacto en el Estado de Resultados (recalculado a mano, replicando las fórmulas del Excel — sin LibreOffice en esta máquina para recalcular directamente):** Ingresos Año 1 suben a **$901.734.100** (antes $354.100.500, principalmente por el precio de Enterprise). Margen bruto Año1 baja a 78,1% (antes 84,4%, por el mayor peso del costo de IA). EBITDA Año5: **$4.557.087.872**. Utilidad Neta Año5: **$3.642.854.298** — la escala de "miles de millones" que pidió el usuario.

- **2026-08-22 (reclasificación Costos vs. Gastos — el usuario tenía razón en parte):** el usuario insistió en que la separación anterior estaba mal, con un argumento contable real (no solo de ambición): infraestructura, consumo de IA operativa, y su salario son costo directo de operar el servicio (COGS), no gasto administrativo. Se analizó con criterio contable real, sin aceptar ni rechazar todo en bloque:
  - **Se aceptó y se movió a Costos:** infraestructura del producto (B), infraestructura/consumo de los agentes (C, excepto Langfuse), monitoreo (D), y el salario del fundador — esto sí es COGS estándar en SaaS (costo de servir a los clientes / mano de obra directa, dado que el fundador *opera* los agentes de IA, no solo construyó el producto).
  - **No se aceptó:** honorarios de abogado/contador (G&A — no sirven a un cliente específico) y Canva/Buffer (gasto de Marketing) — se quedan en Gastos, con razonamiento contable explicado en la categoría A.
  - **Se prorrateó el costo fijo por uso real** (no por igual entre cada cliente — eso hubiera dejado a Starter con 9% de margen, un resultado absurdo dado que Enterprise con 10 usuarios consume muchísimo más que Starter con 1). Nuevo Margen Bruto: Starter 93,7%, Pro 71,6%, Enterprise 59,3%.
  - **Investigación real de honorarios** (pedida por el usuario): abogado — plan real de "departamento legal externo" de una firma boutique colombiana, $655.401/mes con IVA (antes $400.000 sin respaldo); contador — sin tarifa pública exacta para el modelo "IA hace el trabajo, humano revisa y firma" (servicio nuevo), inferido en $300.000/mes del extremo bajo de rangos reales. Honorarios totales: $955.401/mes.
  - **Impacto real (no solo reclasificación):** Gastos Año1 baja de $170.511.768 a $43.189.260 (mismo dinero, mejor clasificado). La Utilidad Neta SÍ baja un poco de verdad, por el aumento real de honorarios: Año1 $408.214.173→**$402.882.312**, Año5 $3.642.854.298→**$2.994.671.919**. Inversión total (Capital de trabajo recalculado): $248.725.256→**$250.558.083**.

- **2026-08-22 (Agente 7 — Asistente Personal del Fundador, agregado después de enviar el modelo):** surgió de la conversación sobre Microsoft 365 — el usuario quiso un agente que le maneje el correo/agenda por Outlook. Se verificó (no se asumió) que Business Premium por sí solo no incluye construir agentes autónomos — hace falta la licencia Microsoft 365 Copilot ($30 USD/mes ≈ $91.444 COP/mes). Como el Excel ya se envió al asesor y no se puede modificar, este costo no se agrega como línea nueva — queda documentado como cubierto por los colchones ya presupuestados (Imprevistos + contingencias de Gastos). Ver detalle abajo y en `ARQUITECTURA_AGENTES_OPERACION.md` sección 4.1.

## Agente 7 — Asistente Personal del Fundador (agregado 2026-08-22, después de enviar el modelo)

Nuevo agente, distinto a los 6 de la Capa B: automatiza el trabajo administrativo personal del fundador dentro de Outlook/Microsoft 365 (correo, agenda, notificaciones) — no habla con los talleres clientes, ese sigue siendo el Agente de Atención. Corre sobre **Microsoft Copilot Studio**, un stack aparte de LangGraph+Claude/Gemini que usan los otros 6. Detalle completo y verificación en `ARQUITECTURA_AGENTES_OPERACION.md`, sección 4.1.

**Costo real verificado:** Microsoft 365 Copilot (licencia adicional necesaria — Business Premium solo no basta) = $30 USD/mes × TRM $3.048,12 = **$91.444 COP/mes**.

**No se agrega como línea nueva al Excel** — el modelo financiero ya se envió al asesor docente y no se puede modificar. Este costo queda cubierto dentro de los colchones ya presupuestados: el Imprevistos de Inversión ($22.505.280, una sola vez) y/o el margen real que dan "Otros gastos administrativos" ($756.645/mes) y la contingencia de nómina ($6.615.000/mes, no garantizada) en Gastos — ambos ya tienen holgura suficiente para absorber $91.444/mes sin que las cifras totales enviadas cambien.

## Pendiente

- Refinar el consumo estimado del Agente Legal con una simulación real por request cuando se construya (hoy es una comparación, no una medición).
- El "techo de presupuesto Año 1" de $5.700.000/mes (categoría C) es deliberadamente alto por pedido explícito del usuario — cuando Langfuse dé datos reales de consumo, ajustar a la baja hacia el gasto real esperado (probablemente la mitad o menos).
- Langfuse Enterprise quedó sin presupuestar por no tener precio público fijo — pedir cotización real a Langfuse antes de comprometer ese gasto.
- El precio nuevo de Enterprise ($2.410.000/mes, 4x el anterior) es un salto grande — vale la pena que el usuario valide con talleres reales (o el estudio de mercado) si la demanda de ese plan se sostiene a ese precio, o si hace falta ajustar la curva de "Cantidad vendida" de Enterprise en la hoja Ingresos.
- Esta máquina no tiene LibreOffice instalado — el Estado de Resultados, Punto de Equilibrio y Resumen Ejecutivo del Excel se recalcularon a mano replicando las fórmulas exactas para verificar los números (ver historial 2026-08-22); al abrir el archivo en Excel/LibreOffice real debería recalcular automáticamente a los mismos valores.
- Con la Inversión en $250.558.083 (vs. la meta mencionada de ~$300M), el usuario puede decidir si acercarse más a esa cifra ajustando una línea concreta (Otro, o más meses de capital de trabajo) — no se infló ningún número solo para llegar a $300M exactos.
- El contador a $300.000/mes es una inferencia razonable de rangos reales, no una tarifa publicada exacta para el modelo "IA hace el trabajo, humano revisa y firma" — confirmar con un contador real cuando se contrate.
