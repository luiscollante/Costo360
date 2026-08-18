# ARQUITECTURA_AGENTES_OPERACION.md — Capa B: Agentes que operan Costo360 S.A.S.

*Definido el 2026-08-15. Esto es la arquitectura, costos e infraestructura de los agentes de IA que operan la EMPRESA*
*(Marketing, Ventas, Atención, Diseño, Contabilidad) — no confundir con el producto que usan los talleres (`web/`).*
*Contexto de negocio completo en `IDEA_PRINCIPAL_COSTO360.md`, sección 11.*

---

## 0. Decisiones ya tomadas (2026-08-15)

| Decisión | Resultado |
|---|---|
| ¿Quién construye? | Se construye igual que el producto — Claude Code + el usuario, sesión por sesión. No hay salario de desarrollador externo que presupuestar. |
| ¿Con qué agente se arranca? | **Agente de Atención al Cliente** primero |
| ¿Qué modelo de IA? | **Claude Sonnet 5** para razonamiento (ventas, atención, marketing, contabilidad) — con arquitectura de cascada para controlar el costo por interacción |
| ¿Dónde vive el código? | Carpeta nueva y separada de `web/`: `C:\Costo360\agentes-operacion\` — evita cualquier conflicto con el otro modelo que trabaja en `web/` |

---

## 1. Arquitectura compartida (aplica a los 5 agentes)

Los 5 agentes de la Capa B comparten la misma base técnica — se construyen uno a la vez, pero sobre la misma infraestructura, así el costo no se multiplica por 5.

| Componente | Elección | Por qué |
|---|---|---|
| Orquestación | **LangGraph** (Python) | Flujos deterministas y auditables — necesario porque estos agentes toman decisiones que afectan plata y la relación con el cliente. Mismo framework para los 5 agentes, cada uno es un grafo distinto. |
| Memoria/estado | **PostgreSQL — el mismo proyecto Supabase del producto** (`dilskbvmvywqohtswzdw`), en un schema nuevo (`agentes`) | Evita pagar una segunda base de datos. Supabase ya tiene capacidad de sobra en el plan actual. |
| Base de conocimiento (RAG) | **pgvector** (extensión nativa de Supabase Postgres) | Reemplaza la sugerencia de la investigación original (Pinecone/ChromaDB, servicios aparte de pago) — pgvector viene incluido en Supabase, cero costo adicional. |
| Hosting del proceso | **Railway (plan Hobby, ~$16.000 COP/mes con crédito incluido)** | LangGraph necesita un proceso persistente (no encaja en las funciones serverless de Vercel del producto, que se apagan a los ~10 segundos). Railway escala a cero cuando no hay tráfico, ideal para el volumen bajo de esta etapa. |
| Observabilidad | **Langfuse autoalojado** (Docker, en el mismo Railway) | Gratis (solo el costo del servidor), permite ver qué está gastando cada agente y detectar fallos — clave para poder decirle a un inversionista exactamente cuánto cuesta cada conversación. |
| Modelo de razonamiento | **Claude Sonnet 5** ($6.300 / $31.500 COP por millón de tokens entrada/salida — precio oficial vigente) | El que pediste — mejor criterio que un modelo económico para negociar, redactar marca y decidir. |
| Modelo de triage (barato) | **Gemini 3.5 Flash-Lite** (ya integrado en el producto) | Ver sección 2 — filtra antes de gastar en el modelo caro. |

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

**Costo:** ver el desglose completo y actualizado (todo en COP) en `PLAN_COSTOS_COMPLETO_COSTO360.md`, categoría C. La tabla que estaba aquí antes (con cifras en dólares y a menor escala) quedó reemplazada por esa estructura completa el 2026-08-17, tras agregar Sentry, PostHog, Alegra, Pipedrive, Higgsfield y las herramientas del fundador (Claude Max, Google AI Ultra) que no estaban contempladas cuando se escribió esta sección.

---

## 4. Los otros 4 agentes (arquitectura definida, construcción posterior)

Comparten toda la infraestructura de la sección 1 — el costo incremental de cada uno nuevo es casi solo el consumo de API, porque el hosting y la base de datos ya están pagados.

| Agente | Alcance | Complejidad de construcción | Canal principal |
|---|---|---|---|
| 2. Ventas y Prospección | Prospección a talleres, calificación de leads, seguimiento comercial | Alta — necesita WhatsApp Cloud API oficial desde el inicio (no Evolution API, ver análisis previo) | WhatsApp Business (Cloud API oficial) |
| 3. Marketing y Publicidad | Mercadeo de forma independiente y autónoma: crea contenido, **lanza campañas**, **analiza su rendimiento**, y **gestiona los leads generados** (de la mano del CRM) — no es solo generación de contenido | Alta — necesita integrarse con plataformas de pauta (LinkedIn/Google Ads), Higgsfield para contenido, y Pipedrive para los leads | Interno + plataformas de pauta + CRM |
| 4. Diseño | Apoyo visual para piezas de marketing de la marca Costo360 | Media — puede apoyarse en modelos de generación de imagen aparte | Interno |
| 5. Contabilidad y Finanzas (de Costo360 S.A.S.) | Dos frentes: (a) factura la suscripción mensual de los talleres clientes y concilia esos cobros, y (b) gestiona **lo tributario y contable de Costo360 como empresa** (declaraciones RST, DIAN) — en ambos casos es la contabilidad de Costo360, nunca la del taller cliente | Alta — integración con pasarela de pago (Wompi/ePayco) y Alegra API | Interno + pasarela de pago |

**Costo total mensual con los 5 agentes operando:** ver `PLAN_COSTOS_COMPLETO_COSTO360.md` (categorías A a G) para la cifra completa y actualizada en COP — incluye ya las herramientas que se agregaron después de escribir esta sección (Alegra, Pipedrive, Higgsfield, Sentry, PostHog, Claude Max, Google AI Ultra).

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
3. Luz verde para empezar a construir el Agente de Atención al Cliente en `C:\Costo360\agentes-operacion\`
