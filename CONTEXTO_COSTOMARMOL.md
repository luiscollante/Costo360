# CONTEXTO_COSTOMARMOL.md — Referencia Técnica del Proyecto
### Versión inicial · Creado el 2026-06-06

---

## ⚡ INSTRUCCIONES PARA LA IA — Lee esto primero

Este proyecto se llama **Costomarmol**. Es una app web profesional construida a partir de **Costo360** (app de cotización para talleres de piedra natural), adaptada completamente para **Mármoles Collante & Castro Ltda**.

Al iniciar cualquier sesión en este proyecto debes:
1. Leer este archivo completo.
2. Entender que el punto de partida es el código de Costo360 copiado en esta carpeta.
3. Entender que el objetivo es **transformar** ese código en Costomarmol: nueva identidad visual, nuevo nombre, mismo núcleo funcional.
4. Seguir la hoja de ruta por fases definida más abajo, sin saltar etapas sin aprobación.
5. Aplicar siempre la **Regla de Sesión** descrita al final de este archivo.

---

## 🏢 La Empresa

**Nombre:** Mármoles Collante & Castro Ltda
**Sector:** Piedra natural — mármol, granito, sinterizado, Quartzstone, Quartzita
**País:** Colombia
**Dominio comprado:** `marmolescollanteycastro.com`
**Correo corporativo objetivo:** Google Workspace con cuentas `@marmolescollanteycastro.com`

### Identidad Visual

| Token | Descripción |
|---|---|
| Azul navy profundo | Color primario (fondo oscuro del logo) |
| Azul brillante / eléctrico | Color de acento (hexágono y letra C del logo) |
| Blanco | Texto principal sobre fondos oscuros |
| Estilo del logo | Geométrico · Hexagonal · Tridimensional · Corporativo |
| Tipografía sugerida | A definir en Fase 1 (orientación: fuentes limpias y modernas) |

> **Nota para la IA:** El logo es un hexágono 3D en degradado de azul navy a azul brillante, con una "C" en el interior. El nombre "MARMOLES" aparece en negrita y "COLLANTE&CASTRO LTDA" en texto más delgado debajo. La paleta es completamente azul — sin verde, sin dorado.

---

## 🧬 Qué es Costo360 (el origen)

Costo360 es la app web que sirve de base para Costomarmol. Es un sistema de cotización para talleres de piedra natural en Colombia. Fue construida con:

| Capa | Tecnología actual |
|---|---|
| Frontend | Streamlit (Python) — a migrar |
| Base de datos | Supabase (PostgreSQL) con Row Level Security |
| IA | Claude API (Anthropic) |
| Autenticación | Token UUID4, PBKDF2-SHA256, 30 días de expiración |
| Hosting actual | Streamlit Cloud — a migrar |

### Archivos del proyecto (copiados como punto de partida)

```
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

└── .streamlit/
    └── config.toml          # Tema oscuro personalizado
```

### Módulos funcionales (11 pantallas)

1. **Login** — Tabs iniciar sesión / registro. Auth con token + cookie.
2. **Inicio** — Hero con nombre del taller, 4 métricas, accesos rápidos, insight de IA.
3. **Dashboard** — Gráficos Plotly, top materiales, métricas de rendimiento.
4. **Cotización Directa** — Wizard 5 pasos: datos → materiales → mano de obra → AIU → resumen + PDF.
5. **Cotización AIU** — Método formal para licitaciones. Fórmula: Precio = Costo Directo × (1 + A + I + U).
6. **Modo Express ⚡** — Cotización en ~60 segundos. IA completa los detalles.
7. **Historial** — Tabla paginada con filtros, badges de estado, exportación CSV.
8. **Banco de Retales** — Inventario digital de sobrantes de losas.
9. **Nesting Inteligente** — Optimización 2D del plan de corte, visual SVG, guarda retales automáticamente.
10. **Parámetros Operativos** — 5 tabs: materiales, mano de obra, transporte, AIU, descuentos.
11. **Mi Empresa / Configuración** — 4 tabs: empresa, facturación, usuarios, integraciones.

---

## 🎯 Qué es Costomarmol (el destino)

Costomarmol es **Costo360 adaptado para uso interno de Mármoles Collante & Castro Ltda**. No es un SaaS para vender a otros talleres — es la herramienta interna de esta empresa para gestionar sus cotizaciones, materiales y costos de forma profesional.

### Diferencias clave con Costo360

| Aspecto | Costo360 | Costomarmol |
|---|---|---|
| Modelo | SaaS multiusuario para vender a talleres | App interna para uso propio de la empresa |
| Identidad | Verde + dorado, marca Costo360 | Azul navy + azul eléctrico, marca Mármoles C&C |
| Hosting | Streamlit Cloud | Vercel (objetivo final) |
| Frontend | Streamlit | Python profesional — Django o FastAPI (a migrar en fases) |
| Base de datos | Supabase (Costo360) | Supabase nuevo proyecto separado (datos limpios) |
| Login | Token propio | Login con Google Workspace (@marmolescollanteycastro.com) |
| Dominio | costo360.streamlit.app | app.marmolescollanteycastro.com (objetivo) |

---

## 🗺️ Hoja de Ruta por Fases

### FASE 1 — Cambio de identidad visual y nombre *(punto de partida)*
- Reemplazar todos los textos "Costo360" por "Costomarmol" en el código
- Cambiar la paleta de colores: del verde/dorado al azul navy/azul eléctrico de Mármoles C&C
- Cambiar el logo en todas las pantallas
- Actualizar nombre de empresa, NIT, datos de contacto en los valores por defecto
- Ajustar tipografías si aplica

### FASE 2 — Ajustes funcionales
- Revisar si hay módulos de Costo360 que no aplican al negocio de Mármoles C&C
- Ajustar parámetros por defecto (materiales, tarifas, roles de mano de obra) a los reales de la empresa
- Crear una base de datos Supabase nueva y limpia, separada de la de Costo360

### FASE 3 — Migración de Streamlit a Python profesional
- Reescribir la app usando Django o FastAPI
- Mantener Supabase como base de datos (no cambiar)
- La app se verá y sentirá como un sistema empresarial moderno (menú propio, diseño personalizado, responsive)

### FASE 4 — Publicación profesional en Vercel
- Publicar la app en Vercel
- Conectar el dominio `marmolescollanteycastro.com` → `app.marmolescollanteycastro.com`
- La app solo accesible para empleados de la empresa

### FASE 5 — Integración con Google Workspace
- Login con cuenta corporativa `@marmolescollanteycastro.com`
- El empleado entra con el mismo usuario de su correo de empresa
- Sin contraseñas adicionales

### FASE 6 — Agente inteligente *(largo plazo)*
- Agente conectado a los datos de Supabase y Google Workspace
- El gerente puede preguntar al agente por ventas, cotizaciones, indicadores
- Generación de reportes automáticos (PDF, dashboard) por solicitud de voz o texto

---

## 🖥️ Stack Tecnológico Objetivo

| Capa | Tecnología objetivo |
|---|---|
| Frontend | Python profesional (Django o FastAPI) |
| Base de datos | Supabase — proyecto nuevo separado |
| IA | Claude API (Anthropic) |
| Autenticación | Google Workspace (OAuth con cuentas @marmolescollanteycastro.com) |
| Hosting | Vercel |
| Dominio | marmolescollanteycastro.com |
| Correo corporativo | Google Workspace Business Starter |

---

## 💡 Contexto de Negocio Adicional

- La empresa ya opera con Google de forma gratuita (sin correo corporativo aún)
- El objetivo a futuro es migrar a Google Workspace Business Starter (~$6 USD/usuario/mes)
- Son 2 a 3 personas que usarán la app internamente
- El dueño programa usando IA como asistente de desarrollo
- Costo360 sigue funcionando en paralelo como producto independiente — Costomarmol es un proyecto completamente separado

---

## 🔒 Reglas de Sesión

### Regla: Preguntar antes de ejecutar

Antes de responder cualquier consulta que implique planificación, implementación, análisis o toma de decisiones, hacer preguntas de aclaración hasta alcanzar **al menos el 95% de certeza** sobre lo que se necesita. Solo después armar el plan con formato de tres partes: **Lo que entendí / Lo que haré / Lo que sugiero**.

**Excepciones — no aplica cuando:**
- El usuario pide algo puntual y de intención obvia: consultas de estado, leer archivos, recuperar información simple.
- La intención es inequívoca y ejecutarla no conlleva riesgo de malentendido ni trabajo desperdiciado.

**Parámetros:**
- Entre 2 y 4 preguntas por ronda.
- Si tras la respuesta se sigue debajo del 95%, una segunda ronda es válida.
- Si la consulta ya supera el 95% de claridad, hacer al menos 1 pregunta de confirmación antes de asumir en silencio.

### Regla: Nunca modificar sin aprobación explícita

- Nunca crear, modificar ni eliminar archivos sin aprobación explícita del usuario.
- Nunca asumir que el silencio es aprobación.
- Siempre terminar la propuesta con una pregunta clara de aprobación.

---

*Archivo de contexto creado el 2026-06-06 · Mover a la raíz de C:\costomarmol\ antes de iniciar la primera sesión*
