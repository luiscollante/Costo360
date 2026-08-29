# Revisión de UI / UX / Accesibilidad / Marca — prototipo `web/`

*Fecha: 2026-08-29. Insumo para la siguiente fase del roadmap (Objetivo 1 — rediseño visual
del producto). Recorrido en vivo de los 12 módulos con la cuenta de dueña (`admin`) y la de
empleado (`operativo`), más el tema claro/oscuro, la paleta de comandos y el asistente de IA
(25 capturas). Análisis por tres agentes: **UI Designer**, **Brand Guardian**, **Accessibility
Auditor**. Este documento sintetiza y prioriza los tres reportes; los reportes completos están
en los transcripts de la sesión.*

---

## Lo que funciona bien (no tocar sin razón)

- Los 12 módulos cargan y renderizan; la estructura sidebar + contenido es correcta.
- **El aislamiento por rol se ve en la UI**: el `operativo` no ve "Panel Admin" y en Historial
  ve cero cotizaciones de la dueña.
- Login, paleta de comandos (Ctrl+K) y el drawer del asistente de IA abren y funcionan.
- Botones primarios verdes: buen contraste. `AdminPage` usa `<table>` semántica y `aria-label`
  correctos — es el patrón de referencia para el resto.
- `web/src/index.css` es coherente con el estándar de marca (`html{color-scheme:light}`,
  tokens en `@theme`). **El desvío está enteramente en el código que se construyó encima.**

---

## Hallazgos consolidados (por tema, ordenados por impacto)

### A. Contraste / legibilidad — *el problema dominante* · severidad **Alta** · los 3 agentes

- `--color-brand-muted` (`#8A8A8A`) sobre crema (`#F5E8D2`) ≈ **2.6–2.85:1** → reprueba WCAG AA
  (mínimo 4.5:1 texto normal). Es el color por defecto de casi toda la información secundaria.
- Encima se aplican modificadores de opacidad en texto: `text-brand-muted/50 · /45 · /40 · /30`
  → ≈ **1.3–1.6:1** ("texto casi invisible"). En: etiquetas de tarjeta del Dashboard
  (`text-[9px] text-brand-muted/50`), encabezados de grupo del sidebar (`/45`), contador
  "1 cotización" (`/40`), hint y placeholder de la paleta de comandos, "COP"/"%" en Parámetros.
- Dorado `#D4AF37` usado como **color de texto** sobre crema ≈ **1.7–1.9:1**: título
  "Precisión Industrial" y píldora de la landing, valor KPI del Dashboard, ranking "01" y
  "$6,7M" de Top materiales, badge "AIU" en Historial.
- Colores de estado de Tailwind como texto: `text-amber-400` (número "Pendientes de aprobar"
  ≈ 1.4:1), `text-emerald-400` ("Margen promedio" ≈ 1.6:1), `text-red-400` (errores de Login/
  Reset/Admin ≈ 2.8:1), toast de éxito `#22D3A5` ≈ 1.85:1.
- Iconos de acción de tabla (`text-brand-muted/40`, Historial: ver/PDF/editar/borrar) ≈ 1.5:1;
  el mínimo para un control es 3:1. Solo alcanzan color legible en `:hover`.
- Micro-tipografía: `text-[8px]` (subtítulo sidebar), `text-[9px]` masivo en etiquetas.

**Corrección:** token de texto secundario → **`#5F5F5F`** (≈4.6:1). **Prohibir opacidad `<100%`
en cualquier nodo de texto.** Micro-labels a 11px / peso 600 / `tracking-wide` (no `widest`).
Dorado nunca como color de texto sobre fondo claro (usar `--color-brand-primary #15612E` para
cifras KPI, o un token nuevo `--color-brand-gold-text: #6E5410` para texto grande). Badges de
estado con variantes `700/800` sobre tinte `100`. Iconos accionables: color en reposo `#5F5F5F`
mínimo, hover/focus `brand-primary`.

### B. Modo oscuro / tema — severidad **Crítica** · recomendación unánime de los 3 agentes

- Existe `web/src/hooks/useTheme.ts` con `localStorage('cm-theme')`, escribe `data-theme` en
  `<html>`, y **su valor por defecto es `'dark'`** → por eso la barra lateral se ve verde casi
  negra (gradiente `#07100D`, `Sidebar.tsx:69-79`).
- Hay un toggle sol/luna en el header (`AppLayout.tsx`, dos botones: móvil + escritorio).
- El estándar (`ARQUITECTURA_MAESTRA.md` §6) dice, textual: *"light-mode estricto — la app NO
  tiene ni debe tener modo oscuro"*.
- El estado "claro" del toggle está a medio construir: pinta la barra lateral `#F0F4F8`
  (gris-azul **frío**, ajeno a la paleta cálida), **el logo desaparece** (texto claro sobre
  fondo claro, ≈1.1:1), y el nav "Panel Admin" activo (morado) queda invisible sobre ese gris.
  El resto de la app no reacciona al toggle (los tokens `@theme` nunca se redefinen por
  `[data-theme]`).
- En el sidebar oscuro (el default), el ítem de navegación **activo** (`text-brand-text`
  `#4A4A4A` sobre negro ≈ 1.7:1) es *menos* legible que los inactivos.

**Corrección (unánime):** **eliminar el modo oscuro por completo.** Borrar `useTheme.ts` y toda
referencia (`theme`, `cm-theme`, `data-theme`); quitar los dos botones sol/luna de `AppLayout`;
en `Sidebar.tsx` reemplazar `sidebarBg`/`activeNav`/`inactiveNav` por valores fijos sobre
tokens: fondo `--color-brand-surface` (o crema un punto más claro, `#FBF3E4`), separador
`--color-brand-border`, ítem inactivo `text-brand-muted` con hover `bg-brand-primary/[0.06]`,
ítem activo `bg-brand-primary/10 text-brand-primary`. Una sola barra lateral clara y cálida.
(Con la barra lateral clara, el problema del logo se resuelve con **una** variante en vez de
dos.)

### C. Logo — severidad **Alta** · UI + Marca + Accesibilidad

- Un solo `public/logo.png` (wordmark "Costo" en tono claro) usado sobre todos los fondos:
  sidebar, `LoginPage.tsx:75` (220px sobre crema), header, navbar y footer de la landing.
- Sobre crema (landing, login, tema claro) "Costo" **casi no se ve**; solo se lee "360" (verde)
  y el símbolo. `Footer.tsx` y `QuoteModal.tsx` usan además un tercer tratamiento (`text-white`
  ad hoc). Tres lockups = ninguno.

**Corrección:** un lockup legible sobre crema — "Costo" en `--color-brand-text-dark` (o verde
de marca), "360" en dorado, símbolo en verde. Reemplazar el PNG por SVG con `currentColor`
donde se pueda. Documentar **un** wordmark oficial (color, proporción, uso del símbolo) y
reutilizarlo en sidebar, login, header y navbar; el footer sobre fondo oscuro usa la variante
clara oficial, no `text-white`.

### D. Colores fuera de la paleta de marca — severidad **Alta** · UI + Marca + Accesibilidad

La marca es verde + dorado + crema + neutros. Se encontraron **5 familias ajenas** en UI central:

- **Morado/violeta**: nav "Panel Admin" activo (`Sidebar.tsx:143`, `bg-purple-500/15
  text-purple-300`) y badge "Administrador" (`AdminPage.tsx:85`). Además el badge "Administrador"
  tiene texto morado claro sobre fondo morado claro ≈ **1.3:1** (ilegible).
- **Cian / turquesa / naranja / rosa**: los 7 badges de tipo de inductor en `ParametrosPage.tsx`
  (`INDUCTOR_BADGE`, líneas 17-25) con hex crudos `bg-[#22D3A5]/15`, `#2DD4BF`, `#F59E0B`, etc.
  Todos fallan contraste (≈1.3–2:1).
- **`amber-400`** suelto de Tailwind como color de estado "Pendiente / Reservado / IVA / stock
  bajo" en Dashboard, Historial, Inventario, Retales, Cotización — cada pantalla improvisa; es
  un ámbar frío, distinto del dorado de marca `#D4AF37`.

**Corrección:** todo color por token (`--color-brand-*`), cero hex crudos en JSX. Nav "Panel
Admin" activo = mismo verde que el resto. Badge "Administrador" = `bg-brand-primary/12
text-brand-primary`; "Operativo" = neutro. Los 7 badges de inductor → variar sobre verde y
dorado con opacidad/borde + neutros; si hacen falta 7 categorías, distinguir con icono + texto,
no con 7 matices. Definir **3 colores de estado fijos y documentados**: Aprobada = verde de
marca; Pendiente/atención = dorado de marca **o** un token nuevo `--color-brand-warning`;
Rechazada/error = rojo contenido `#B23B3B`. Aplicarlos igual en Historial, Dashboard y PDF.

### E. Restos del taller piloto — severidad **Alta** · Marca

Costo360 es un producto multi-empresa; no debe mostrar datos de un cliente concreto.

- `web/public/manifest.json:4` → `"description": "Herramienta de cotización — Mármoles Collante
  & Castro"`. Es el nombre que se ve al **instalar la app** (PWA).
- `CotizacionExpressPage.tsx:600` → `placeholder="Buscar en catálogo Gramar…"`.
- `CotizacionAIUPage.tsx:251` y `ConfigPage.tsx:125` → `placeholder="Barranquilla"`.
- `landing/Footer.tsx:54` → `"Barranquilla, Colombia"` hardcodeado como dirección.

**Corrección:** `manifest.json` → `"Costo360 — Cotización de piedra natural"`; placeholders →
`"Buscar en el catálogo…"` / `"Ciudad"`; footer → dirección real de Costo360 S.A.S. o quitar
la línea. *"Un cliente que ve el nombre de otro taller en el producto pierde confianza en el
aislamiento multi-empresa."*

### F. Estados de carga y error — varios **Críticos** · los 3 agentes

- **"Verificando la sesión…"** (`SessionGuard`, estado `reclamando`) bloquea toda la pantalla
  ~9 s en cada carga completa. No tiene `role="status"`/`aria-live`, no hay elemento enfocable
  ni forma de cancelar, y el fondo sigue en el árbol de accesibilidad. Un lector de pantalla
  percibe que la app "se congeló" sin explicación.
- **Dashboard del rol Operativo**: la API responde **403** (Regla 6 — el operativo no ve BI) y
  `DashboardPage` **no maneja `isError`** → skeletons infinitos, para siempre, sin mensaje.
- No hay componente de error inline en **ningún** flujo. Spinners y skeletons sin `role="status"`
  / `aria-busy` / texto "Cargando". Cada tarjeta hace su propio fetch → layout shift.

**Corrección:** render inmediato del shell (sidebar + skeletons que calcen con el layout final)
+ verificación de sesión en segundo plano; redirigir a login solo si falla. `SessionGuard` como
`role="alertdialog"` con `aria-live`, foco gestionado, y botón "Cancelar y salir" también
durante `reclamando`, fondo `inert`. En el Dashboard: rama `isError` con `role="alert"`
("Tu rol no tiene acceso al panel — usa Nueva Cotización", con CTA), `aria-busy` en la zona de
skeletons, y `retry` acotado. Patrón global de error: icono + mensaje + "Reintentar", timeout
~10 s.

### G. Formato de datos numéricos — severidad **Media/Alta** · UI + Marca

- Parámetros: montos sin separador de miles en los inputs ("60000", "35000", "2200"). En otras
  pantallas sí se formatea ("$ 6.669.152").
- Landing (mockup): agrupación de EE. UU. — "$ 382,450,000", "$ 362,327,500 - $ 402,572,500".
  Colombia usa punto.
- Dashboard: "$ 0" y "40 , 0 %" con espaciado raro (el `letter-spacing` de la mono se aplica a
  la puntuación).
- Afijo de moneda inconsistente: "COP" prefijo (Parámetros), "COP" sufijo (Express), "$"
  prefijo (AIU, otras).
- Datos numéricos del Dashboard renderizados en la tipografía sans, no en JetBrains Mono (el
  estándar §6 dice mono para datos numéricos; el token existe pero no se aplica de forma
  consistente).

**Corrección:** `Intl.NumberFormat('es-CO')` en todas partes, incluidos los inputs de Parámetros
y el mockup de la landing (`$ 382.450.000`). Una sola convención: `$` como prefijo dentro del
campo. Regla de sistema: **todo** dato numérico (montos, m², %, contadores, folios) en
`font-mono`, sin `letter-spacing` en la puntuación.

### H. Componentes inconsistentes — severidad **Media/Alta** · UI + Accesibilidad

- `<select>` nativo (Nesting/Express categoría, con chevron del navegador) mezclado con combobox
  custom (`MaterialCombobox`). Alturas, radios y focus ring distintos.
- Historial usa `<input type="date">` nativo ("dd/mm/aaaa" + calendario del navegador) — rompe
  la consistencia y no tiene `<label>` visible.
- Parámetros: dos estilos de "tabs" apilados (tab relleno vs pastilla pálida).
- Iconos de estado vacío distintos por página (cubo en Inventario, líneas de lista en Historial,
  rayo en Express) y con contraste dispar.
- Radios de botón distintos: landing `rounded-full`, app `rounded-lg`. Badges de rol con formas
  distintas.
- **Historial está hecho con `<div>` + `grid`, no con `<table>`** → un lector de pantalla lee
  cada fila como texto corrido sin nombres de columna. `AdminPage` sí usa `<table>` — tomarlo
  de referencia.

**Corrección:** un componente por patrón — un solo select (el custom, elimina el nativo), un
date-picker propio, un segmented-control único para Parámetros, un patrón único de estado vacío
(icono 32px `#6B6B6B` + mensaje de una línea + CTA opcional). Historial → `<table>` semántica
con `<caption>` y `<th scope="col">`. App: `rounded-lg` (8px) en todos los botones; badges de
una sola forma.

### I. Accesibilidad estructural — varios **Críticos** · Accessibility Auditor

- **Campos de formulario sin `<label htmlFor>`+`id` ni `aria-label`**: búsqueda/estado/fechas
  de Historial (solo `placeholder`/`title`), **todos** los `<input type="number">` de Parámetros
  (Tarifas y Adicionales — el lector anuncia "spin button, 60000" sin saber de qué costo se
  trata), contraseñas de Reset, input del drawer IA, y los modales Invitar/Editar de Admin
  (los `<label>` existen pero **sin `htmlFor`** y los `<input>` **sin `id`**).
- **Diálogos sin semántica ni gestión de foco**: paleta de comandos, drawer IA, `SessionGuard`
  (todos los estados), `CCModal` (cuenta de cobro), modales de Admin. Son `<div>` sin
  `role="dialog"`/`aria-modal`/`aria-labelledby`; al abrir no mueven el foco; sin trampa de
  foco (el `Tab` sale al fondo, que sigue operable); al cerrar no devuelven el foco al
  disparador; `drawer IA`, `CCModal` y modales de Admin **no cierran con Escape**.
- **Foco no visible**: `focus:outline-none` global + reemplazo por borde al 50% de opacidad o
  sombra casi transparente. La paleta de comandos marca el ítem activo con un cambio de fondo
  del ~1% (invisible).
- **Botones de icono que dependen solo de `title`** (Historial, Parámetros): no aparece con
  foco de teclado ni en táctil. `AdminPage` sí usa `aria-label` — replicar.
- Sin `<h1>` en Login. Paneles del Dashboard ("Estado cotizaciones", "Top materiales", "Accesos
  Rápidos") son `<p>` en versalitas, no `<h2>/<h3>`.
- Sin enlace "Saltar al contenido"; el foco no se reubica al cambiar de ruta (queda en un
  `NavLink` que se desmonta); `document.title` fijo en "Costo360" para toda la SPA.
- Gráficos de Recharts sin `role="img"`/`aria-label` ni tabla equivalente; tooltip solo por
  hover (sin teclado).
- Sin `@media (prefers-reduced-motion: reduce)`; Framer Motion anima transiciones de ruta,
  entrada de filas, conteo ascendente de KPIs y shimmer infinito en la landing.
- Objetivos táctiles pequeños: toggle Días/Semanas/Meses ≈ 22px de alto (< 24px).

**Corrección:** ver "Top prioridades" abajo. Es el bloque más extenso; el reporte de
accesibilidad tiene 37 hallazgos numerados con criterio WCAG y remediación concreta cada uno.

### J. Jerarquía y layout — severidad **Media/Alta** · UI Designer

- **Tarjetas sin elevación**: blanco sobre crema, borde `#E5D5BA` casi invisible, sin sombra
  perceptible → "todo flota". Afecta Dashboard (KPIs), Configuración, wizards.
- Inversión de jerarquía: el H2 de sección ("Material", "Ítems del Contrato") es más grande que
  el H1 de página ("Cotización Directa").
- Borde-acento verde a la izquierda del título solo en 3 de 11 pantallas (Directa/Express/AIU),
  ausente en las demás.
- Historial y Panel Admin: contenido arriba-izquierda con un vacío enorme debajo → sensación de
  página incompleta. Falta contenedor `max-width` centrado.
- Top bar casi vacía (solo "Buscar Ctrl K" + el toggle); al quitar el toggle queda más vacía.
- Dashboard: la barra "ESTADO COTIZACIONES" es una línea dorada plana; no se lee como barra
  apilada Aprobadas/Pendientes/Rechazadas.

**Corrección:** tarjetas `bg-white` + `border-brand-border` visible + `shadow-[0_1px_3px_rgba(74,74,74,0.08)]`.
Escala tipográfica fija: título de página 28–30px/700, sección 18–20px/600, card title 15–16px/600.
Decidir: o todas las páginas llevan el acento verde, o ninguna. Contenedor `max-width` centrado.
Subir la identidad de usuario / nombre de empresa al top bar. Barra de estados apilada con los 3
colores + leyenda.

### K. Voz / copy — severidad **Media/Baja** · Brand Guardian

- Landing épica ("Domina el Arte de la Piedra con **Precisión Industrial**") vs app sobria y
  funcional ("Sistema de Cotizaciones", "Resumen del mes en curso"). Un inversionista que pasa
  de una a otra percibe dos marcas. Elegir un registro (recomendado: profesional-directo en
  ambos).
- "Nueva Cotización" (sidebar) / "Cotización Directa" (página) / "Crear cotización guiada"
  (Ctrl+K) — tres nombres para lo mismo.
- Términos de taller en el menú (AIU, Nesting, Retales) sin tooltip para público no experto.
- El drawer de IA expone "Beta · Gemini 3.5 Flash-Lite" al usuario final.
- `index.css:1` importa **Inter** además de Plus Jakarta Sans + JetBrains Mono (no es de la
  marca, pesa de más). Quitar del `@import` y del `--font-sans`; fallback a `system-ui`.

---

## Empezar por aquí (orden de prioridad para el rediseño)

| # | Qué | Por qué primero | Tema |
|---|---|---|---|
| 1 | **Contraste global**: token de texto secundario → `#5F5F5F`, prohibir opacidad en texto, micro-labels 9→11px/600, dorado nunca como texto sobre claro | Es lo que más ensucia **todas** las pantallas; corrige cientos de instancias de una vez | A |
| 2 | **Eliminar el modo oscuro**: borrar `useTheme.ts`, el toggle, el gradiente `#07100D` y la rama `#F0F4F8`; una sola barra lateral clara con tokens de marca | Es lo primero que se ve; incumple la regla de marca más enfática; duplica el QA visual de cada pantalla | B |
| 3 | **Logo legible sobre crema**: variante con wordmark oscuro/verde, misma en sidebar/login/header/navbar | Sin él, en login y landing la marca literalmente no se lee | C |
| 4 | **Purga de colores fuera de marca** (morado, cian, naranja, `amber-400` suelto) + definir 3 colores de estado documentados | Aparecen en pantallas centrales (Panel Admin, Parámetros, estados de cotización); varios además fallan contraste | D |
| 5 | **Purgar datos del piloto**: `manifest.json`, "Gramar", "Barranquilla" ×3, dirección del footer | Riesgo de confianza en el aislamiento multi-empresa; bloqueante para mostrar a un cliente | E |
| 6 | **Arreglar los estados de carga/error**: shell inmediato en vez del bloqueo de 9 s; manejar el 403 del Operativo; patrón global de error con "Reintentar" | Hay un flujo (Dashboard del Operativo) que se cuelga para siempre; el arranque tarda ~10 s de pantallas de carga | F |
| 7 | **Etiquetar todos los campos de formulario** (`label`+`id` o `aria-label` explícito) | Sin esto, el flujo de cotización y Parámetros son inoperables con lector de pantalla | I |
| 8 | **Componente `Dialog` común** (rol, `aria-modal`, foco al abrir, trampa de foco, Escape, retorno de foco) para los 5 modales/drawers | Patrón roto repetido en paleta, drawer IA, SessionGuard, CCModal y modales de Admin | I |
| 9 | **Tarjetas con elevación real** (blanco + borde visible + sombra sutil) | Resuelve el "todo flota" en Dashboard, Configuración y wizards | J |
| 10 | **Formato `es-CO` de números en todas partes** + `font-mono` para todo dato numérico + una convención de "$" | Inconsistencia visible en Parámetros y en el mockup de la landing | G |
| 11 | **Unificar controles**: un select (elimina el nativo), un date-picker propio, un segmented-control, `<table>` semántica en Historial | Consistencia y accesibilidad de una sola vez | H |
| 12 | **Accesibilidad estructural**: foco visible global (`:focus-visible{outline:2px solid #15612E}`), `<h1>` en Login, "Saltar al contenido", foco al `<h1>` por ruta, `document.title` por vista, `prefers-reduced-motion`, `role="img"`+alt en gráficos | Complementos de alto valor y bajo coste | I |

---

## Nota

- El rediseño **no toca** `motor/calculos.py` ni `motor/parametros.py` (lógica de cálculo
  validada) — es solo interfaz, igual que dice el roadmap.
- Varios hallazgos son a la vez de contraste (A) y de marca (D) — al purgar los colores fuera
  de paleta se resuelven ambos.
- La tabla de `AdminPage` (`<table>` + `<th>` + `aria-label` en botones) y el archivo
  `index.css` (tokens `@theme`, light-mode) son la referencia correcta; el resto se alinea a
  ellos.
