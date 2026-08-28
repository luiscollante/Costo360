# IDEA_PRINCIPAL_COSTO360.md — Visión de Negocio Consolidada

*Reconstruido el 2026-08-15 a partir de toda la documentación del trabajo de grado en*
*`C:\Users\wases\Desktop\Universidad\Opción de grado\` (Universidad de la Costa — Administración de Empresas)*
*para que el contexto de negocio no se pierda entre sesiones ni entre agentes.*

---

## 1. Origen y evolución del proyecto

*Corregido 2026-08-27: esta sección tenía una imprecisión real sobre el nombre del proyecto — ver la nota al final.*

Costo360 nació como el trabajo de grado ("Opción de Grado") de Luis Alejandro Collante Castro en la Universidad de la Costa (CUC), Facultad de Ciencias Empresariales. La empresa piloto y validadora, desde el primer documento hasta hoy, es **Mármoles Collante & Castro Ltda.**, Barranquilla — empresa familiar de marmolería con 2-15 empleados que atiende clientes residenciales, constructoras y arquitectos del Caribe colombiano.

El nombre comercial es **Costo360**, con visión explícita de SaaS para todo el sector: una plataforma para cualquier taller de piedra natural en Colombia, no solo para la empresa piloto — de ahí el "360": una vista completa del negocio del taller (cotización + inventario + analítica), no solo una calculadora.

**Nota sobre un nombre relacionado que NO debe usarse aquí:** existió una versión de marca blanca del código de Costo360, adaptada visualmente para un cliente específico, que usó un nombre similar. Ese nombre hoy pertenece a un contexto de negocio distinto y no relacionado — no se vuelve a mencionar en la documentación de Costo360 (confirmado por el fundador, 2026-08-27).

---

## 2. El problema real (con evidencia)

El sector de transformación de piedra natural en Colombia (mármol, granito, sinterizado, Quartzstone, cuarcita) mueve el 5,3% del PIB nacional (~USD 52.900 millones proyectados para 2025), pero opera con **más de una década de rezago tecnológico**: cuadernos, Excel sin estructura, WhatsApp. El 70% de las MIPYMES colombianas siguen dependiendo de métodos manuales.

**Fricciones concretas detectadas en la empresa piloto (antes de la app):**
- **Costos ocultos que se omiten sistemáticamente:** desgaste de disco diamantado ($2.200–$18.000 COP/m² según material), costo diario de cortadora ($20.000–$32.000/día), costo real por km de vehículos propios.
- **Subcotización estructural:** entre el **15% y 20%** de los proyectos se ejecutaban con margen real por debajo del umbral de sostenibilidad (20%), detectado solo al terminar la obra.
- **Errores en la norma AIU** (Decreto 1372/92): el IVA debe aplicarse solo sobre la Utilidad en contratos de construcción; muchos talleres lo aplican sobre el total, generando sobrecostos o incumplimientos tributarios.
- **Demora comercial:** 2 a 6 horas (o hasta 90 minutos en la versión más optimista) por cotización manual, frente a competidores/clientes que esperan respuesta en horas, no días.
- **Cero historial analítico:** sin registro de qué material o cliente deja más margen, no hay forma de tomar decisiones informadas.
- **Documentos informales:** presupuestos por WhatsApp "a ojo", sin logo ni estructura, que generan desconfianza y facilitan el regateo.

**Resultado medido en el piloto:** tiempo de cotización de 2-6 horas → 10-15 minutos; margen identificado en proyecto real (Mármol Crema Marfil 3ml): 38.4% con precio sugerido por el sistema, cifra que antes no se calculaba explícitamente.

---

## 3. Cliente objetivo (en capas concéntricas)

1. **Núcleo — uso interno:** Mármoles Collante & Castro Ltda., empresa piloto. Valida el modelo antes de cualquier expansión.
2. **Perfil del cotizador (early adopter):** propietario/administrador de taller pequeño-mediano, 35-55 años, alta experiencia técnica en corte/instalación de piedra, gestiona personalmente clientes/proveedores/operarios, usa el celular como herramienta principal, no usa software contable ni de presupuestos.
3. **Clientes finales del taller:** propietarios de vivienda estrato 4-6, constructoras y firmas de arquitectura/interiorismo del Caribe colombiano.
4. **Expansión SaaS (visión a mediano plazo, ya en marcha):** otras empresas marmoleras del país — pymes, medianas y grandes — que acceden a la plataforma como servicio. Esto es exactamente lo que reflejan los tres planes de precio actuales (sección 7).

---

## 4. Propuesta de valor

> "Ayudo a marmoleros y propietarios de talleres de piedra natural a cotizar proyectos con precisión y emitir documentos comerciales formales mediante una plataforma digital que calcula costos reales, genera PDFs con identidad de marca y cumple la normativa AIU colombiana, logrando reducir el tiempo de cotización de horas a minutos y eliminar el riesgo de subcotizar o perder dinero por errores en la estructura de costos."

**Los cinco diferenciadores frente a Excel genérico, papel/calculadora y ERPs tradicionales (Siigo, Alegra, Loggro — que no entienden despieces, betas ni mermas geométricas):**

1. **Precisión de costos:** motor de cálculo con hasta 7 componentes (material, mano de obra por ML/m², zócalos, insumos y desgaste de disco, logística, viáticos, adicionales por etapa).
2. **Velocidad:** cotización completa con PDF en minutos, no horas ni días.
3. **Asistente de IA:** interpreta descripciones en lenguaje natural ("un mesón de 4 metros de ancho doble con fregadero") y extrae los parámetros del proyecto automáticamente.
4. **Documentación profesional:** PDFs de cotización y cuenta de cobro con logo corporativo, listos para enviar.
5. **Dashboard de rentabilidad:** métricas en tiempo real de materiales más rentables, margen promedio, facturación.

**No existe en el mercado colombiano un software de cotización especializado en marmolería** — es el vacío estructural que Costo360 llena, sin competir contra los ERPs sino complementándolos (Costo360 es el módulo operativo de planta que ningún ERP contable ofrece).

### 4.1 Qué NO es Costo360 (alcance explícito, aclarado 2026-08-15)

Punto de confusión detectado el 2026-08-15 al analizar una investigación sobre agentes de IA para la empresa, y aclarado explícitamente por el usuario: **Costo360 no es un ERP ni un software contable.**

Costo360 (el producto) hace exactamente cuatro cosas: **estandariza costos, genera entregables** (cotización y cuenta de cobro en PDF con marca del taller), **gestiona esas cotizaciones** (historial, retales, nesting) y **analiza el negocio del taller** (dashboard). Punto.

Costo360 **no hace, ni debe hacer**:
- Facturación electrónica validada por la DIAN (UBL 2.1) para las transacciones del taller con sus propios clientes — eso es responsabilidad del sistema contable del taller (Siigo, Alegra, o el que use).
- Conciliación bancaria, contabilidad o declaración de impuestos del taller cliente.
- Logística/transporte (decisión ya tomada — ver sección 11 y `CONTEXTO_COSTO360.md`).

Esta acotación no es nueva — ya estaba implícita desde el primer documento de la investigación de grado ("CostoMarmol no compite con los ERPs: los complementa"). Lo que se corrigió es que una investigación posterior sobre agentes de IA para la operación de la empresa proponía un "Agente de Contabilidad y Finanzas" que facturaba automáticamente a nombre del cliente ante la DIAN — eso se salía del alcance del producto. Ver sección 11 para dónde sí encaja ese tipo de agente.

---

## 5. Qué hace Costo360 hoy (módulos)

Según lo que describiste, la app organiza el trabajo del taller en estos módulos:

1. **Cotización en tiempo real** — Directa (wizard completo), AIU (para licitaciones/constructoras, con IVA solo sobre Utilidad), Express (~60 segundos con ayuda de IA)
2. **Plano 2D con Nesting** — visualiza cómo se distribuye el despiece de un proyecto sobre una placa
3. **Dashboard** — comportamiento de cotizaciones, estado, materiales más vendidos, facturación aprobada (cotizaciones convertidas en ventas)
4. **Historial** — todas las cotizaciones realizadas
5. **Retales** — inventario de sobrantes reutilizables en proyectos futuros
6. **Nesting** — visualización del despiece optimizado sobre la placa (retroalimenta Retales)
7. **Parámetros** — tarifas configurables (mano de obra, zócalo, materiales, AIU) — **ver recomendación en sección 9**
8. **Configuración** — datos de la empresa que aparecen en los PDFs entregables
9. **Panel Admin** — gestión de usuarios según el plan contratado (sección 7)

Esta lista reemplaza/actualiza la de `CONTEXTO_COSTO360.md`, que documentaba 11 pantallas sin un módulo de Panel Admin dedicado y con "Transporte" todavía como tab de Parámetros.

---

## 6. Modelo de negocio (resumen del Business Model Canvas)

| Bloque | Contenido |
|---|---|
| **Segmentos de cliente** | Uso interno (piloto) → estratos 4-6 → constructoras/arquitectos → otros talleres del país (SaaS) |
| **Propuesta de valor** | Ver sección 4 |
| **Canales** | Hoy: plataforma web directa + PDF por WhatsApp Business/correo. Futuro SaaS: auto-registro web + capacitación/soporte remoto |
| **Relación con clientes** | Onboarding guiado, asistente IA 24/7, historial consultable, actualizaciones automáticas de tarifas |
| **Fuentes de ingreso** | Empezó como mejora indirecta de margen (uso interno). Hoy: **suscripción SaaS directa** — ver planes en sección 7 |
| **Recursos clave** | Código propietario, base de datos de materiales/precios, know-how del negocio codificado en los parámetros, API de IA |
| **Actividades clave** | Desarrollo continuo, parametrización de tarifas de mercado, generación de cotizaciones/documentos, soporte |
| **Socios clave** | Proveedores de mármol/granito (Bogotá, Medellín), proveedor de sinterizado (Porcelanosa), operarios especializados, proveedor de API de IA, proveedores de herramientas/discos |
| **Estructura de costos** | API de IA (bajo costo variable), hosting (hoy Supabase + Vercel, ambos con capa gratuita), tiempo de desarrollo |

**Innovación estructural (marco ERRC — Blue Ocean Strategy):**

| ELIMINAR | REDUCIR | INCREMENTAR | CREAR |
|---|---|---|---|
| Errores de costeo manual | Tiempo de cotización (horas → minutos) | Precisión en márgenes reales | Asistente de IA en lenguaje natural |
| Pérdida de historial en cuadernos/Excel | Riesgo de omitir costos | Profesionalismo del documento | Motor de cálculo paramétrico local |
| Dependencia de la memoria del cotizador | Ciclo de venta largo | Velocidad de respuesta | PDF automático de cotización/cuenta de cobro |
| Proyectos aceptados bajo el costo real | Fricción entre campo y oficina | Tasa de conversión a proyecto firmado | Dashboard de rentabilidad |

---

## 7. Modelo de precios — evolución y estado actual

**Versión de marzo 2026 (estudio de viabilidad financiera, pitch a inversores):** plan único de **$150.000 COP/mes**, ancorado al costo de una sola placa mal cortada (ROI inmediato). Break-even proyectado con 30 clientes activos; a 100 clientes, margen neto proyectado >60%.

**Versión actual (ajustada 2026-08-21) — planes por número de usuarios:**

| Plan | Precio mensual | Usuarios máximos |
|---|---|---|
| Starter | $150.000 COP | 1 (único usuario) |
| Pro | $375.000 COP | 1 (único usuario) |
| Enterprise | $600.000 COP | Hasta 10 |

**Aclaración de unidad de venta:** lo que se vende y se factura es la suscripción por taller, no el usuario individual — el límite de usuarios es una característica del plan (para diferenciar tamaño de taller), no una unidad de venta aparte. El control de ese límite es lógica simple del producto (Panel Admin: comparar usuarios activos contra el máximo del plan), no algo que requiera un agente de IA — aunque sí es una buena señal comercial para que el Agente de Ventas/Atención sugiera una subida de plan cuando un taller llega al tope.

El paso de un plan único a tres tiers por cantidad de usuarios es coherente con la expansión de "herramienta interna" a "SaaS para talleres de cualquier tamaño" (pymes, medianas y grandes empresas) que describiste hoy — permite capturar tanto al taller pequeño (3 usuarios) como a operaciones más grandes (hasta 10 usuarios en Enterprise).

---

## 8. Métricas objetivo (salud del negocio, metas Año 1)

| Métrica | Meta | Por qué importa |
|---|---|---|
| CAC (Costo de Adquisición de Cliente) | < $150.000 COP | Eficiencia del canal (WhatsApp, referidos — el boca a boca domina el sector) |
| LTV (Valor de Vida del Cliente) | > $4.500.000 COP | LTV/CAC ≈ 30:1 — modelo comercialmente muy sólido |
| Margen Bruto por Proyecto | > 35% | La app debe asegurar que ningún proyecto se ejecute bajo el mínimo |
| Tasa de Conversión de Cotizaciones | > 45% | Un documento profesional aumenta la conversión frente al ~30% del proceso manual |
| Tiempo de Elaboración de Cotización | < 15 minutos | Diferenciador frente a competencia que tarda días |
| Tasa de Retención de Clientes | > 60% al cierre del año 1 | Refleja satisfacción con el servicio |
| NPS | > 70 puntos | Valida percepción de valor y profesionalismo |
| Punto de equilibrio (versión marzo 2026) | 30 clientes activos | Alcanzable en el primer trimestre operativo (+200 talleres identificados en Barranquilla/Costa Atlántica) |

---

## 9. Validación realizada

**Metodología:** observación participante + análisis interno de operación + 5 entrevistas estructuradas a actores del ecosistema (propietario de marmolería, arquitecta contratista, maestro marmolero independiente, propietario de constructora, estudiante de arquitectura en pasantía). Las cinco confirmaron que el problema es real, frecuente y con impacto económico directo, y que la solución digital es percibida como valiosa por toda la cadena (proveedor, contratista, cliente final).

**Experimento del Canvas de Prototipado MVP:** se seleccionaron los cotizadores principales de Mármoles Collante & Castro para ingresar **15 proyectos reales** en CostoMarmol al mismo tiempo que los procesaban con el método tradicional, comparando resultados en paralelo.

**5 puntos de dolor validados (en primera persona, del instrumento de validación comercial):**
1. Fuga de rentabilidad por cálculo "al ojo"
2. Cuellos de botella operativos (tiempo perdido en cotizar en vez de supervisar obra)
3. Riesgo comercial y tributario (AIU mal aplicado)
4. Desvalorización del trabajo (presupuestos informales por chat)
5. Ceguera estratégica (sin datos de qué material deja más margen)

---

## 10. Dos roadmaps distintos — no confundir

Es importante separar dos líneas de trabajo que viven en documentos distintos:

- **Roadmap de producto/negocio** (este documento): Fase 1 completada = motor de cálculo + AIU + PDFs + historial + dashboard. Fase 2 = identidad de marca, logo en todos los PDFs, cálculo de anticipo. Fase 3 (proyectada) = catálogo de materiales con precios actualizados, integración con WhatsApp Business.
- **Roadmap técnico/arquitectura** (`CONTEXTO_COSTO360.md`): las 6 fases de migración de Streamlit a React + Vercel + Supabase + Gemini + app Android, que es un cambio de **tecnología**, no de **funcionalidad** — las funciones del producto (lo de arriba) deben mantenerse iguales o mejorar durante la migración técnica.

---

## 11. Operación de la empresa con agentes de IA: dos capas que no hay que mezclar

*Agregado 2026-08-15 a partir del análisis de `web/Costo360_Investigacion_Agentes_IA_SaaS.docx` — visión del usuario: que Costo360 sea de las primeras empresas de Barranquilla operando casi al 100% con agentes de IA especializados, en vez de depender de intervención humana constante.*

Esa visión es válida y coherente con la sección 4.1 **siempre y cuando se mantengan separadas dos capas** que la investigación original mezclaba:

### Capa A — Agentes del producto (lo que usan los talleres clientes)
No cambia respecto a lo ya documentado: el asistente de IA que interpreta lenguaje natural en Modo Express y sugiere valores de mercado (ya existe conceptualmente en el producto). Nada de facturación, contabilidad ni logística vive aquí — ver sección 4.1.

### Capa B — Agentes de operación de Costo360 S.A.S. (cómo se administra la empresa misma)
Esta es la capa donde sí tiene sentido "casi 100% sin intervención humana". Con los ajustes que salieron del análisis de la investigación:

| Agente | Función | Ajuste respecto a la investigación original |
|---|---|---|
| Marketing y Publicidad | Campañas B2B, contenido, análisis de tendencias del sector | Sin cambios — encaja bien como agente de operación |
| Ventas y Prospección | Prospección a talleres, calificación de leads, seguimiento comercial | **Usar WhatsApp Cloud API oficial**, no Evolution API (ver análisis anterior — Evolution viola los términos de Meta y arriesga el número) |
| Atención al Cliente / Soporte | Resuelve preguntas frecuentes de talleres que ya son clientes de Costo360 (uso de la plataforma, dudas de facturación de su suscripción) | Soporte **del producto y de la suscripción**, nunca contabilidad del taller |
| Diseño | Apoyo en piezas de marketing y contenido visual de la marca Costo360 | Nuevo — no estaba en la investigación original, agregado porque el usuario lo pidió explícitamente |
| Contabilidad y Finanzas **de Costo360 S.A.S.** | Factura la suscripción mensual de los talleres clientes (planes Starter/Pro/Enterprise), concilia esos cobros, calcula y paga los impuestos de Costo360 bajo el RST | **Acotado exclusivamente a la contabilidad de Costo360 como empresa** — nunca a la contabilidad de los talleres clientes (esa es la corrección de la sección 4.1) |
| Legal y Cumplimiento (agregado 2026-08-20) | Contratos (términos de servicio, acuerdos con talleres), cumplimiento regulatorio de Costo360 S.A.S. (Habeas Data/RNBD, protección de datos de prospectos) | Primer filtro y generador de documentos estándar — no reemplaza asesoría legal humana en decisiones societarias mayores |

Esta separación resuelve, de paso, el riesgo de credibilidad ante inversionistas señalado en el análisis anterior: un agente que factura y concilia solo las suscripciones SaaS recurrentes de Costo360 (transacción simple, estandarizada, propia) es mucho más defendible que uno que emite facturas tributarias a nombre de terceros (los talleres) sin supervisión humana.

**Infraestructura validada (2026-08-20):** los 6 agentes corren como servicios independientes dentro de Railway (plataforma administrada), no como VPS individuales autoadministrados — detalle completo y comparación de costos en `ARQUITECTURA_AGENTES_OPERACION.md`, sección 1.1.

---

## 12. Mi recomendación sobre Parámetros (pediste mi punto de vista)

Pediste explícitamente mejorar la sección de Parámetros y quitar la logística, porque el foco de Costo360 es el cálculo de proyectos, no el transporte. Con base en todo lo anterior, esto es lo que veo:

**Quitar:**
- El tab de **Transporte** completo (tarifa base + km) — tiene sentido histórico porque CostoMarmol nació calculando el costo real de los vehículos propios de Mármoles Collante & Castro (Frontier NP300, Cheyenne V8), pero ya no encaja con el Costo360 actual, que apunta a cualquier taller del país con vehículos y rutas distintas. Sacarlo simplifica el producto y evita mantener un dato que varía demasiado entre talleres.

**Agregar (coherente con "cálculo de proyectos", no logística):**
- **Consumibles / Desgaste de disco:** los propios documentos de validación identifican esto como un costo omitido en el 80% de los casos manuales ($2.200–$18.000 COP/m² según material). Es un costo directo de producción, no de transporte — encaja perfectamente en el enfoque de Costo360.
- **% de merma/desperdicio por material:** ya existe conceptualmente en el paso 2 de Cotización Directa; formalizarlo como parámetro configurable por material (el desperdicio de mármol no es igual al de sinterizado) le da más precisión al motor de cálculo.
- **Riesgo de rotura (%):** mencionado en la propuesta de valor original como componente de costo que se omite sistemáticamente; vale la pena evaluar si merece su propio campo o si se absorbe dentro de la merma.

**Reestructuración sugerida de las categorías de Parámetros:**

| Categoría | Contenido |
|---|---|
| Materiales | Precio/m² por tipo y espesor (igual que hoy) |
| Mano de obra | Tarifas por rol (igual que hoy) |
| Producción | **Nuevo** — desgaste de disco/consumibles, % merma por material, riesgo de rotura |
| AIU | Porcentajes por defecto (igual que hoy) |
| Descuentos | Reglas por volumen o cliente (igual que hoy) |

Esto es una recomendación conceptual, no una implementación — como acordamos, no estoy tocando código en `web/` mientras el otro modelo sigue trabajando ahí. Si más adelante quieres que esto se construya, es una tarea puntual para cuando retomemos el trabajo técnico.

---

## 13. Fuentes consultadas

De `C:\Costo360\web\`:
- `Costo360_Investigacion_Agentes_IA_SaaS.docx` (15 ago 2026) — investigación técnica sobre arquitectura multi-agente (LangGraph/CrewAI), integración WhatsApp, marco tributario colombiano (RST, exclusión IVA Art. 476), y OPEX estimado para operación autónoma. Analizada con correcciones — ver secciones 4.1 y 11.

De `C:\Users\wases\Desktop\Universidad\Opción de grado\`:
- `propuesta_valor_costomarmol.docx` (2 mar 2026) — propuesta de valor, cliente objetivo, diferenciales, hoja de ruta de producto
- `CostoMarmol_Modelo_Negocio_Innovador.docx` (28 feb 2026) — diagnóstico del sector, Business Model Canvas completo, marco ERRC, proyecciones de crecimiento, métricas, validación con 5 entrevistas
- `Validacion_CostoMarmol_LUIS_ALEJANDRO_COLLANTE_CASTRO.docx` (3 mar 2026) — 5 puntos de dolor y 5 preguntas de validación comercial
- `Business model Canvas - CostoMarmol - Word.docx` (21 mar 2026) — versión MVP v1.0 del canvas
- `CostoMarmol_Viabilidad_Financiera 3.pdf` (6 mar 2026, versión final) — estudio de viabilidad financiera y penetración de mercado, CAPEX, OPEX, unit economics
- `Canvas_prototipado_mvp.xlsx` (14 mar 2026) — hipótesis, experimento de validación (15 proyectos en paralelo), aprendizajes
- `Costo360\Modelo Financiero - Costo360.xlsx` (15 ago 2026) — plantilla de modelo financiero de la universidad, **sin datos reales cargados aún** (solo valores de ejemplo)

Excluido por no pertenecer a Costo360: `Estrategia de marca y estructuración de Producto Mínimo Viable (PMV).docx` (proyecto "C&C VIBES", marca de streetwear — otra materia del mismo estudiante).
