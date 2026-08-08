# CONTEXTO_COSTO360.md — Referencia Técnica del Proyecto

---

## ¿Qué es?

**Costo360** es un SaaS B2B de estimación y gestión de costos para **talleres de piedra natural en Colombia** (mármol, granito, sinterizado, Quartzstone, Quartzita). Permite a los dueños de taller cotizar proyectos (cocinas, baños, fachadas, escaleras) con precisión profesional en minutos.

---

## ⚠️ Migración de arquitectura en curso (aprobada 2026-08-08)

El proyecto está migrando de Streamlit a una arquitectura nueva. La versión en Streamlit **sigue siendo la única versión funcional para los usuarios** hasta que se complete el corte (Fase 6). Todo lo que sigue en este documento describe primero la **arquitectura nueva aprobada** y luego la **arquitectura actual en producción** (legado).

---

## Stack Tecnológico Nuevo (aprobado, en construcción)

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend web | React + Tailwind CSS | Vite, TypeScript |
| Componentes / UI | React Aria, shadcn/ui, Kibo UI, Preline | Todas gratuitas. Tailwind Plus (de pago) queda fuera salvo que el usuario confirme licencia |
| Animaciones | Framer Motion | Microinteracciones y transiciones fluidas |
| Backend | Funciones Python serverless en Vercel (carpeta `/api`) | Sin servidor persistente; límite ~10s de ejecución en plan gratuito |
| Base de datos + Auth | Supabase (PostgreSQL + Row Level Security + Supabase Auth) | Se mantiene el proyecto Supabase actual, con sus datos |
| IA | Gemini API (Google) — modelo por defecto: **Gemini 3.5 Flash-Lite** | Requiere API key de pago por uso en Google AI Studio; el plan "Google AI Pro" del usuario NO incluye acceso a la API. Alternativa de mayor capacidad: Gemini 3.6 Flash |
| App Android | React Native + Expo | App nativa separada (no un simple empaquetado web); reutiliza Supabase y las funciones Python |
| Hosting | Vercel (plan gratuito) | Deploy directo por línea de comandos (Vercel CLI), sin GitHub |
| Control de versiones | Git **local únicamente** | Sin repositorio remoto/GitHub. Ver riesgo en Notas Importantes |
| Optimización 2D | Motor propio (`motor_planos.py`, migrado a función serverless) | |

### Por qué Supabase y no SQL Server Express
SQL Server Express no tiene una opción de hosting gratuito nativo en la nube: requiere mantener un servidor propio. Eso choca con el objetivo de "gratis, sin infraestructura propia, accesible desde cualquier dispositivo". Supabase ya está en producción hoy con Row Level Security funcionando (aislamiento de datos por taller) y está diseñado para trabajar bien con funciones serverless. Migrar significaría reconstruir la seguridad de datos desde cero sin ningún beneficio real.

### Por qué Supabase Auth y no el sistema de tokens propio
Supabase Auth es gratuito hasta 50,000 usuarios activos/mes (muy por encima de la necesidad actual), tiene el cifrado y manejo de sesiones ya probado en producción por miles de proyectos, se integra nativamente con Row Level Security, y funciona igual en la web y en la app Android. Reemplaza el sistema propio de token UUID4 + PBKDF2-SHA256.

### Fases de migración
1. **Fase 1:** Frontend React + Tailwind local, conectado a Supabase, login con Supabase Auth
2. **Fase 2:** Backend — migrar `calculos.py`, `motor_planos.py`, `asistente_ia.py` (→ Gemini) a funciones serverless Python en `/api`
3. **Fase 3:** Reconstrucción de los 11 módulos como componentes React con identidad de marca y animaciones
4. **Fase 4:** Deploy en Vercel sin GitHub
5. **Fase 5:** App Android con React Native/Expo
6. **Fase 6:** Corte de Streamlit Cloud

---

## Stack Tecnológico Actual (legado, en producción hasta el corte)

| Capa | Tecnología |
|---|---|
| Frontend | Streamlit (Python) |
| Backend / DB | Supabase (PostgreSQL) con Row Level Security |
| IA | Claude API (Anthropic) |
| Autenticación | Token UUID4, PBKDF2-SHA256, 30 días de expiración |
| Hosting | Streamlit Cloud |
| Optimización 2D | Motor propio (`motor_planos.py`) |

---

## Materiales que Trabajan los Talleres

- Mármol
- Granito
- Sinterizado
- Quartzstone
- Quartzita

---

## Archivos del Proyecto (estructura actual, legado)

```
C:\Costo360\  (antes C:\Users\wases\costo360-app\)

├── app.py                   # Núcleo: auth, sidebar, routing, página Inicio
├── calculos.py              # Lógica de cálculo de costos
├── parametros.py            # Constantes: materiales, tarifas, AIU, catálogos
├── asistente_ia.py          # Integración Claude API
├── motor_planos.py          # Motor de optimización 2D (nesting)

├── ui_dashboard.py          # Pantalla de analíticas
├── ui_historial.py          # Historial de cotizaciones
├── ui_retales.py            # Banco de retales (sobrantes)
├── ui_nesting.py            # Nesting inteligente (plan de corte)
├── ui_cotizacion_directa.py # Wizard 5 pasos
├── ui_cotizacion_aiu.py     # Cotización AIU (3 pasos)
├── ui_express.py            # Cotización rápida (Modo Express)
├── ui_parametros.py         # Parámetros operativos (5 tabs)
├── ui_configuracion.py      # Perfil de empresa (4 tabs)

├── Logo principal.png           # Logo para fondos claros
├── Logo para versiones oscuras.png  # Logo para fondos oscuros

└── .streamlit/
    └── config.toml          # Tema oscuro personalizado
```

---

## Módulos de la App (11 pantallas)

Esta lista describe el **comportamiento funcional** de cada pantalla — se mantiene igual en la nueva arquitectura, solo cambia la tecnología con la que se construye.

### 1. Login
- Tabs: Iniciar Sesión / Registro
- Auth con token + cookie persistente
- Fallback sin logo si archivo no existe

### 2. Inicio
- Hero personalizado con nombre del taller
- 4 métricas clave del mes
- Accesos rápidos: Cotización Directa, Modo Express, Dashboard
- Grid de módulos disponibles
- Insight de IA con análisis semanal

### 3. Dashboard
- Gráficos Plotly: ingresos por mes, distribución por tipo
- Top materiales cotizados (barras de progreso)
- Tabla de rendimiento por tipo de proyecto
- Métricas: ingresos, margen promedio, cantidad, tiempo

### 4. Cotización Directa (wizard 5 pasos)
1. Datos del proyecto (cliente, tipo, área)
2. Materiales (material, m², desperdicio, losas)
3. Mano de obra (horas por rol)
4. AIU (administración, imprevistos, utilidad)
5. Resumen + exportación PDF

### 5. Cotización AIU
- Método formal para licitaciones y proyectos grandes
- 3 pasos: costos directos → configurar A+I+U → resumen
- Fórmula: Precio = Costo Directo × (1 + A + I + U)

### 6. Modo Express ⚡
- Cotización en ~60 segundos
- Selección de tipo + área + material + acabado
- IA completa los detalles con parámetros del taller
- Opción "Refinar en Modo Completo" que pre-carga el wizard

### 7. Historial
- Tabla paginada con todas las cotizaciones
- Filtros: estado, mes, búsqueda por cliente
- Badges: Aprobada / Pendiente / Borrador / Rechazada
- Exportación CSV

### 8. Banco de Retales
- Inventario digital de sobrantes de losas
- Por cada retal: material, dimensiones, espesor, estado
- Estados: Disponible / Reservado / Usado
- IA sugiere retales compatibles al cotizar

### 9. Nesting Inteligente
- Define las piezas que necesitas cortar
- El motor 2D optimiza el plan de corte sobre la losa
- Muestra visual SVG del plano de corte
- Reporta: % aprovechamiento, m² de retal generado
- Guarda automáticamente retales al banco

### 10. Parámetros Operativos (5 tabs)
- **Materiales:** precio/m² por tipo y espesor
- **Mano de obra:** tarifas por hora de cada rol
- **Transporte:** tarifa base + km
- **AIU:** porcentajes por defecto (A, I, U)
- **Descuentos:** reglas por volumen o cliente

### 11. Mi Empresa / Configuración (4 tabs)
- **Empresa:** nombre, NIT, dirección, teléfono
- **Facturación:** plan activo, método de pago
- **Usuarios:** gestión de equipo (solo rol Admin)
- **Integraciones:** API key de IA, configuraciones externas

---

## Modelo de Negocio

| Plan | Precio | Límites |
|---|---|---|
| Gratis | $0 | 5 cotizaciones/mes, sin IA, sin PDF |
| Pro | $49.000 COP/mes | Ilimitado, IA, Nesting, PDF |
| Empresarial | Custom | Multi-sede, API, soporte prioritario |

---

## Sistema de Usuarios y Multi-tenancy

- **Roles:** Admin / Operario
- **Aislamiento de datos:** Row Level Security en Supabase — cada taller solo ve sus propios datos
- **Config por usuario:** claves de config con sufijo `_{user_id}` en la DB (legado; con Supabase Auth pasa a basarse en `auth.uid()`)
- El Admin puede crear/invitar operarios al mismo taller

---

## Identidad de Marca

| Token | Valor |
|---|---|
| Verde primario | `#1F6F54` |
| Dorado | `#C9A45C` |
| Fondo oscuro | `#0F1A14` |
| Superficie | `#162019` |
| Texto | `#E8F0EB` |
| Fuente cuerpo | Plus Jakarta Sans |
| Fuente títulos | Playfair Display |
| Estilo | Dark mode · Glassmorphism · Backdrop blur |

---

## Estado de Componentes (al 2026-08-08)

| Componente | Estado |
|---|---|
| App funcional en Streamlit | ✅ En producción (Streamlit Cloud) — sigue viva hasta el corte |
| Rediseño visual completo (legado) | ✅ Aplicado |
| Bug navegación (`radio_ui`) | ✅ Corregido |
| Landing page | ✅ Lista con logo real |
| Prototipo interactivo HTML | ✅ 11 pantallas navegables |
| Arquitectura nueva — decisión de stack | ✅ Aprobada 2026-08-08 |
| Git local | ✅ Creado 2026-08-08 |
| Comando `/cierre` (harness) | ✅ Creado 2026-08-08 |
| Fase 1 (frontend + Supabase Auth) | ⬜ Pendiente |
| Fase 2 (backend serverless + Gemini) | ⬜ Pendiente |
| Fase 3 (11 pantallas en React) | ⬜ Pendiente |
| Fase 4 (deploy Vercel) | ⬜ Pendiente |
| Fase 5 (app Android) | ⬜ Pendiente |
| Fase 6 (corte de Streamlit) | ⬜ Pendiente |

---

## Notas Importantes

- La hoja de ruta detallada de fases está arriba, en "Migración de arquitectura en curso".
- El dueño puede registrar clientes manualmente; los clientes usan la app de forma autónoma.
- La IA (Gemini, antes Claude) potencia cotizaciones con análisis inteligente y optimización de materiales.
- **Riesgo aceptado:** al no usar GitHub ni ningún remoto, el único respaldo del código es el git local en esta máquina. Si el equipo falla sin respaldo aparte, se pierde el historial completo.
- Se encontró `apikeyglm.txt` en la raíz del proyecto (aparenta ser una clave de API). Quedó excluido del git local vía `.gitignore` — no debe subirse a ningún repositorio ni compartirse.
- El plan "Google AI Pro" del usuario es una suscripción de consumo y **no** incluye acceso a la API de Gemini; se necesita una API key de pago por uso desde Google AI Studio.

---

## Reglas de Sesión

### Regla: Preguntar antes de ejecutar

Antes de responder cualquier consulta que implique planificación, implementación, análisis o toma de decisiones, debo hacer preguntas de aclaración al usuario hasta alcanzar **al menos el 95% de certeza** sobre lo que necesita. Solo después de que el usuario responda armo el plan con el formato de tres partes (Lo que entendí / Lo que haré / Lo que sugiero).

**Excepciones — no aplica cuando:**
- El usuario pide algo puntual y de intención obvia: "¿qué se trabajó en la última sesión?", "lee este archivo", "¿cuántas líneas tiene tal archivo?", consultas de estado o recuperación de información simple.
- La intención es inequívoca y ejecutarla no conlleva riesgo de malentendido ni trabajo desperdiciado.

**Parámetros de aplicación:**
- Entre 2 y 4 preguntas por ronda.
- Si tras la respuesta sigo debajo del 95%, una segunda ronda es válida antes de proceder.
- Si la consulta ya supera el 95% de claridad, hacer al menos 1 pregunta de confirmación antes de asumir en silencio.

### Regla: Cierre de sesión con `/cierre`

Cuando el usuario ejecute el comando `/cierre`, debo actualizar `PROGRESS.md`, `SESSION.md` y los archivos de memoria en `C:\Users\wases\.claude\projects\C--Costo360\memory\` reflejando todo lo trabajado en la sesión, de modo que la siguiente sesión pueda retomar exactamente donde quedó con solo leer `_harness_template\CLAUDE.md`.
