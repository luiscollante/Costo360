# ARQUITECTURA_AGENTES_OPERACION.md — Capa B: Agentes que operan Costo360 S.A.S.

*Definido el 2026-08-15, ampliado el 2026-08-20. Esto es la arquitectura, costos e infraestructura de los agentes de IA que operan la EMPRESA*
*(Marketing, Ventas, Atención, Diseño, Contabilidad, Legal) — no confundir con el producto que usan los talleres (`web/`).*
*Contexto de negocio completo en `IDEA_PRINCIPAL_COSTO360.md`, sección 11.*

---

## 0. Decisiones ya tomadas (2026-08-15)

| Decisión | Resultado |
|---|---|
| ¿Quién construye? | Se construye igual que el producto — Claude Code + el usuario, sesión por sesión. No hay salario de desarrollador externo que presupuestar. |
| ¿Con qué agente se arranca? | **Agente de Atención al Cliente** primero |
| ¿Qué modelo de IA? | **Claude Sonnet 5** para razonamiento (ventas, atención, marketing, contabilidad, legal) — con arquitectura de cascada para controlar el costo por interacción |
| ¿Dónde vive el código? | Carpeta nueva y separada de `web/`: `C:\Costo360\agentes-operacion\` — evita cualquier conflicto con el otro modelo que trabaja en `web/` |

---

## 1. Arquitectura compartida (aplica a los 6 agentes)

Los 6 agentes de la Capa B comparten la misma base técnica — se construyen uno a la vez, pero sobre la misma infraestructura, así el costo no se multiplica por 6.

| Componente | Elección | Por qué |
|---|---|---|
| Orquestación | **LangGraph** (Python) | Flujos deterministas y auditables — necesario porque estos agentes toman decisiones que afectan plata y la relación con el cliente. Mismo framework para los 6 agentes, cada uno es un grafo distinto. |
| Memoria/estado | **PostgreSQL — el mismo proyecto Supabase del producto** (`dilskbvmvywqohtswzdw`), en un schema nuevo (`agentes`) | Evita pagar una segunda base de datos. Supabase ya tiene capacidad de sobra en el plan actual. También hace de "sistema de mensajería interna" entre agentes — mecanismo detallado en la sección 1.2, auditado y ajustado el 2026-08-20. |
| Base de conocimiento (RAG) | **pgvector** (extensión nativa de Supabase Postgres) | Reemplaza la sugerencia de la investigación original (Pinecone/ChromaDB, servicios aparte de pago) — pgvector viene incluido en Supabase, cero costo adicional. |
| Hosting del proceso | **Railway**, como servicios independientes dentro de un mismo proyecto (ver sección 1.1) | LangGraph necesita un proceso persistente (no encaja en las funciones serverless de Vercel del producto, que se apagan a los ~10 segundos). Escala a cero cuando no hay tráfico — ver por qué esto también afecta la elección de mensajería en la sección 1.2. |
| Observabilidad | **Langfuse autoalojado** (Docker, en el mismo Railway) | Gratis (solo el costo del servidor), permite ver qué está gastando cada agente y detectar fallos — clave para poder decirle a un inversionista exactamente cuánto cuesta cada conversación. |
| Modelo de razonamiento | **Claude Sonnet 5** ($6.300 / $31.500 COP por millón de tokens entrada/salida — precio oficial vigente) | El que pediste — mejor criterio que un modelo económico para negociar, redactar marca y decidir. |
| Modelo de triage (barato) | **Gemini 3.5 Flash-Lite** (ya integrado en el producto) | Ver sección 2 — filtra antes de gastar en el modelo caro. |

### 1.1 Validación de infraestructura: Railway vs. un VPS KVM por agente (2026-08-20)

El usuario planteó, tras investigar por su cuenta, alquilar un **VPS KVM independiente por agente** (ej. Hostinger KVM 1/2/4/8) para lograr aislamiento entre agentes (que un fallo en uno no tumbe a los demás) y presupuesto dinámico (más recursos a los agentes de alta demanda). Se investigó y se descartó esa ruta a favor de mantener Railway, por esta razón:

**Un VPS KVM es infraestructura "cruda" (IaaS):** Hostinger entrega la máquina virtual vacía con Linux — el usuario sería responsable de instalar Docker, aplicar parches de seguridad, configurar firewall, monitorear caídas y hacer respaldos, en **6 servidores separados, para siempre**. Esto contradice directamente la decisión ya tomada en la sección 0 ("no hay salario de desarrollador externo... se construye con Claude Code") — el usuario no es desarrollador ni administrador de sistemas, y 6 VPS autoadministrados lo convertirían en sysadmin de una mini-flota de servidores.

**Railway ya da el mismo aislamiento, sin el trabajo de sysadmin:** dentro de un mismo proyecto de Railway, cada agente vive en su propio **servicio** independiente. Esto cumple los tres objetivos que buscaba el VPS-por-agente (inmunidad ante fallos, presupuesto dinámico por servicio, aislamiento del entorno que maneja datos sensibles), pero Railway administra el sistema operativo, los parches y la seguridad de base automáticamente — el usuario solo se ocupa del código de cada agente.

**Comparación de costo real (2026-08-20):**

| Opción | Costo mensual | Trabajo operativo del usuario |
|---|---|---|
| Railway (6 servicios en un proyecto) | ~$187.719 COP (ya presupuestado, ver `PLAN_COSTOS_COMPLETO_COSTO360.md`) | Ninguno — plataforma administrada |
| 6× Hostinger KVM 1 (el plan más barato) | ~$297.000 COP (6 × $4,99 USD) | Alto — parches, firewall, backups, monitoreo de 6 servidores, indefinidamente |

Railway sale más barato **y** sin el trabajo operativo — se descarta Hostinger KVM para esta etapa. Los planes KVM 4/8 de Hostinger (16-32GB RAM) están dimensionados para aplicaciones que corren pesado por sí mismas (bases de datos grandes, servidores de juegos), muy por encima de lo que necesita un agente que solo coordina llamadas a la API de Claude/Gemini.

**Nota para el argumento ante inversionistas:** una arquitectura administrada con monitoreo real (Sentry + Langfuse) demuestra más madurez operativa que "el fundador administra 6 servidores Linux él mismo" — lo segundo es, si acaso, una señal de riesgo de continuidad del negocio, no una fortaleza.

### 1.2 Cómo se comunican los agentes entre sí — auditado y corregido 2026-08-20

Una primera versión de este documento decía, de forma imprecisa, que los agentes se comunicaban simplemente "escribiendo y leyendo" en la misma tabla. El usuario señaló correctamente 3 riesgos de hacer eso de forma ingenua:

1. **Polling constante** — cada agente preguntando "¿hay algo nuevo?" todo el tiempo, gastando CPU y conexiones sin necesidad.
2. **Race conditions** — dos agentes tomando el mismo registro a la vez y procesándolo por duplicado.
3. **Sin reintento** — si un agente falla a mitad de procesar algo, ese mensaje se pierde sin que nadie lo note.

El usuario propuso `LISTEN/NOTIFY` (pg_notify) de Postgres como solución. Se auditó esa propuesta con una revisión técnica independiente antes de aprobarla. Hallazgo clave: **LISTEN/NOTIFY solo resuelve el problema 1 (polling)** — no evita que dos agentes tomen la misma fila, ni garantiza que un mensaje se reintente si se pierde. Además, la auditoría encontró dos razones concretas para **aplazar** LISTEN/NOTIFY en vez de construirlo ya:

- **Choca con una decisión ya tomada:** Railway está en un plan que "escala a cero" (se apaga cuando no hay actividad) precisamente para ahorrar costo a este volumen bajo. Pero LISTEN/NOTIFY solo sirve si el proceso está despierto y con una conexión abierta todo el tiempo — si el proceso se apaga por inactividad (el comportamiento que ya se eligió a propósito), el beneficio del aviso instantáneo se anula solo.
- **El pooler de conexiones que usa Supabase por defecto (modo transacción, puerto 6543) no es compatible con LISTEN/NOTIFY** — haría falta una conexión directa aparte, mantenida abierta permanentemente, con su propio manejo de reconexión.

**Mecanismo final aprobado — resuelve los 3 problemas, dentro de Postgres/Supabase, sin costo ni infraestructura nueva:**

| Problema | Solución |
|---|---|
| Race conditions | `SELECT ... FOR UPDATE SKIP LOCKED` — si un agente ya tomó una fila, los demás la saltan automáticamente y toman la siguiente disponible |
| Sin reintento | Columna de estado (`pendiente` / `procesando` / `hecho` / `fallido_definitivo` tras agotar intentos) + contador de intentos + timestamp de inicio de procesamiento, para que una revisión periódica libere tareas atascadas después de un tiempo límite y, si se agotan los reintentos, alerte a un humano (mismo patrón de escalar a humano que ya usa el Agente de Atención al Cliente) |
| Polling constante | **Polling corto (cada 5-10 segundos)** sobre la misma tabla, combinado con `SKIP LOCKED` — a este volumen (unos pocos miles de eventos/mes entre los 6 agentes, no por segundo), la diferencia frente a un aviso instantáneo es imperceptible para procesos internos como "avisarle a Contabilidad que facture" |

Detalles de implementación a tener en cuenta cuando se construya: un índice parcial sobre la columna de estado (para que la consulta no recorra toda la tabla histórica) y el manejo del estado final tras agotar reintentos.

**LISTEN/NOTIFY queda como optimización futura**, no descartada del todo — se reconsidera solo si el polling demuestra ser un problema real de costo o carga, documentando en ese momento que requeriría una conexión directa fuera del pooler transaccional. Mismo criterio que el "plan B" de Redis (sección 1.3): no se construye hasta que haya evidencia real de que hace falta.

### 1.3 Plan B a futuro: Redis en Railway

Si el volumen de eventos entre agentes crece mucho más de lo esperado, se podría migrar a una cola dedicada tipo Redis. El costo exacto de un Redis gestionado en Railway **no está verificado todavía** — se investiga con precio real cuando/si esto se vuelva necesario, no antes.

### 1.4 Propuesta evaluada y descartada: migración completa a Google Cloud Platform (2026-08-21)

El usuario trajo una propuesta (originada en otra conversación con IA) de migrar toda la infraestructura de los agentes — Railway → **Cloud Run**, Supabase → **Cloud SQL**, APIs directas de Anthropic/Google → **Vertex AI**, mensajería en Postgres → **Pub/Sub**, más una cuenta de servicio con **Delegación de Autoridad de Dominio** sobre Google Workspace. Se auditó con investigación real de precios (no genérica) antes de decidir. Se descartó por completo — decisión firme, no solo "por ahora" en varios de los puntos.

**Hallazgo estructural principal:** el producto de Costo360 (`web/`) ya vive en Supabase y no está en el alcance de esta migración. Mover solo los agentes a Cloud SQL no elimina la factura de Supabase — **la suma encima**, exactamente lo contrario de "evitar pagar dos bases de datos" que motivó compartir Supabase desde el principio (sección 1).

**Hallazgo de costo principal:** Cloud Run se presentó como "serverless barato corriendo 24/7", pero técnicamente eso requiere el modo de facturación "CPU siempre asignada", que se cobra como una VM pequeña encendida todo el tiempo — no como serverless. Con precios reales investigados, la migración completa saldría entre **1,5x y 2,6x más cara** que la arquitectura actual (~$977.000-$1.044.000 COP/mes hoy vs. ~$1.490.000-$2.532.000 COP/mes con GCP completo).

**Otros hallazgos:**
- Vertex AI no reduce el costo de Claude/Gemini frente a llamar directo a sus APIs (mismo precio), y además **no soporta la Batch API de Claude** (descuento del 50% que sí existe llamando directo) — pasar por Vertex sería perder una opción de ahorro real sin ganar nada a cambio.
- El argumento de "egress fees ocultos" está muy exagerado para el volumen real de Costo360 (mensajes de pocos KB, no video/datasets grandes) — el costo real sería de centavos de dólar al mes.
- La "latencia casi cero por estar en la misma red" es cierta pero irrelevante — la demora real de estos agentes es la espera de la respuesta del modelo de IA (segundos), no la conexión a la base de datos (milisegundos).
- La Delegación de Autoridad de Dominio es una función real de Google Workspace, pero con un **riesgo de seguridad documentado por firmas de seguridad independientes** (Unit 42 de Palo Alto, Hunters Security — hallazgo "DeleFriend"): si la credencial de esa única cuenta de servicio se filtra, un atacante obtiene acceso a Gmail/Drive/Calendar de **todo el dominio**, no de un solo agente. Riesgo desproporcionado para una startup sin equipo de seguridad dedicado.

**Decisión:** se mantiene Railway + Supabase compartido + APIs directas de Anthropic/Google, sin cambios. Se reconsideraría únicamente si en el futuro el producto también migrara a GCP (lo cual cambiaría el cálculo de Cloud SQL de "costo aditivo" a "base compartida") — condición que no existe hoy ni está planeada.

---

## 2. Cómo se controla el costo por interacción (lo que pediste explícitamente)

En vez de mandar cada mensaje directo a Claude Sonnet 5, cada agente sigue una **cascada de dos pasos**:

1. **Triage barato (Gemini 3.5 Flash-Lite):** clasifica la intención del mensaje y decide si es una pregunta simple ya resuelta en la base de conocimiento (RAG) o si necesita razonamiento real. Costo: prácticamente cero (~$945/$7.875 COP por millón de tokens).
2. **Respuesta con criterio (Claude Sonnet 5), solo cuando hace falta:** genera la respuesta final. Se activa **prompt caching** sobre el system prompt y el contexto de la base de conocimiento (esa parte no cambia mensaje a mensaje) — las lecturas repetidas cuestan 10% del precio normal ($630 COP/millón en vez de $6.300 COP/millón). Solo el mensaje nuevo del cliente y la respuesta se cobran a precio completo.

**Resultado medido por conversación típica** (contexto cacheado ~1.500 tokens, mensaje del cliente ~300 tokens, respuesta ~200 tokens): **~$9-10 COP por interacción**. Esto es lo que le puedes decir a un inversionista con evidencia real detrás (Langfuse lo registra), no una cifra genérica de otro estudio.

---

## 3. Agente 1 — Atención al Cliente (el que se construye primero)

**Alcance:** responde preguntas de talleres que ya son clientes de Costo360 sobre cómo usar la plataforma y sobre su suscripción (planes, cambios de plan, facturación de SU suscripción a Costo360 — nunca la contabilidad del taller, ver `IDEA_PRINCIPAL_COSTO360.md` sección 4.1). Escala a un humano (tú) cuando no tiene confianza suficiente o el tema es sensible (reclamos, reembolsos, errores de cálculo).

**Flujo (grafo LangGraph):**
```
mensaje del cliente
    → clasificar intención (Gemini Flash-Lite)
    → ¿pregunta frecuente conocida?
        sí → buscar en base de conocimiento (pgvector) → responder (Claude Sonnet 5, con caché)
        no / baja confianza / tema sensible → escalar a humano (notificación) → responder "te contacto personalmente"
```

**Base de conocimiento:** se arma con `CONTEXTO_COSTO360.md` e `IDEA_PRINCIPAL_COSTO360.md`, más un FAQ dedicado que construimos cuando empecemos.

**Canal — necesito tu confirmación:** recomiendo arrancar con un **chat integrado dentro de la propia app de Costo360** (el usuario ya está autenticado, no requiere aprobación de Meta ni cuenta de WhatsApp Business, se construye con lo que ya existe) y dejar WhatsApp Cloud API oficial como una Fase 2 de este mismo agente más adelante, cuando haya más usuarios. Dime si prefieres ir directo a WhatsApp.

**Costo:** ver el desglose completo y actualizado (todo en COP) en `PLAN_COSTOS_COMPLETO_COSTO360.md`, categoría C.

---

## 4. Los otros 5 agentes (arquitectura definida, construcción posterior)

Comparten toda la infraestructura de la sección 1 — el costo incremental de cada uno nuevo es casi solo el consumo de API, porque el hosting y la base de datos ya están pagados.

| Agente | Alcance | Complejidad de construcción | Canal principal |
|---|---|---|---|
| 2. Ventas y Prospección | Prospección a talleres, calificación de leads, seguimiento comercial | Alta — necesita WhatsApp Cloud API oficial desde el inicio (no Evolution API, ver análisis previo) | WhatsApp Business (Cloud API oficial) |
| 3. Marketing y Publicidad | Mercadeo de forma independiente y autónoma: crea contenido, **lanza campañas**, **analiza su rendimiento**, y **gestiona los leads generados** (de la mano del CRM) — no es solo generación de contenido | Alta — necesita integrarse con plataformas de pauta (LinkedIn/Google Ads), Higgsfield para contenido, y Pipedrive para los leads | Interno + plataformas de pauta + CRM |
| 4. Diseño | Apoyo visual para piezas de marketing de la marca Costo360 | Media — puede apoyarse en modelos de generación de imagen aparte | Interno |
| 5. Contabilidad y Finanzas (de Costo360 S.A.S.) | Dos frentes: (a) factura la suscripción mensual de los talleres clientes y concilia esos cobros, y (b) gestiona **lo tributario y contable de Costo360 como empresa** (declaraciones RST, DIAN) — en ambos casos es la contabilidad de Costo360, nunca la del taller cliente | Alta — integración con pasarela de pago (Wompi/ePayco) y Alegra API | Interno + pasarela de pago |
| 6. Legal y Cumplimiento (agregado 2026-08-20) | Gestión de contratos (términos de servicio, acuerdos con talleres) y cumplimiento regulatorio de Costo360 S.A.S. (Habeas Data/RNBD, protección de datos de prospectos, condiciones de suscripción). **Límite explícito por riesgo de ejercicio ilegal de la abogacía:** el agente redacta y sugiere, pero solo para documentos propios de Costo360 (nunca asesoría legal a los talleres clientes) — todo documento generado requiere revisión de un abogado humano con tarjeta profesional antes de usarse o firmarse, mismo patrón que ya aplica el Agente de Contabilidad con el contador humano | Alta — requiere una base de conocimiento legal sólida (RAG) y revisión humana periódica antes de publicar cualquier contrato nuevo | Interno |

**Costo total mensual con los 6 agentes operando:** ver `PLAN_COSTOS_COMPLETO_COSTO360.md` (categorías A a G) para la cifra completa y actualizada en COP.

---

## 5. CAPEX real para el modelo financiero de la universidad

Como se construye con Claude Code (sección 0), **no hay línea de salario de desarrollador externo que presupuestar** — a diferencia del CAPEX de $20M–$60M COP de la investigación original, que asumía contratar un arquitecto senior. Lo que sí es real y vale la pena incluir en el modelo financiero:

- Cuenta de API de Anthropic (Claude) — pendiente de crear, como hicimos con Gemini
- Posible verificación de WhatsApp Business (cuando se active el agente de Ventas) — costo administrativo, no técnico
- Contingencia razonable para herramientas de pago que surjan sobre la marcha (ej. si Railway Hobby se queda corto y hace falta subir de plan)

Esto cambia radicalmente el pedido de inversión para esta parte específica del proyecto — es mucho más barato de lo que sugería la investigación inicial, porque el "desarrollador" son las sesiones de trabajo con Claude Code, no una nómina.

---

## 6. Pendiente de tu confirmación antes de escribir código

1. Canal del Agente 1 — ¿chat integrado en la app (mi recomendación) o WhatsApp desde ya?
2. Confirmar que creas una cuenta/API key de Anthropic para Claude Sonnet 5 (igual que hicimos con Gemini)
3. Confirmar con un abogado real que el alcance del Agente Legal (sección 4, punto 6) es seguro antes de construirlo
4. Luz verde para empezar a construir el Agente de Atención al Cliente en `C:\Costo360\agentes-operacion\`
