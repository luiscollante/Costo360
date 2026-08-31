# Plan — Rediseño visual del producto (Objetivo 1 del roadmap)

*Ciclo `/goal`. Rama `goal/rediseno-visual` (sobre `master`, con la Fase 2.A ya fusionada).
Insumos: `docs/REVISION_UX_2026-08-29.md` (revisión por 3 agentes) + **auditoría del plan
(Fase 2 del ciclo, 2026-08-30) por UX Architect y Frontend Developer** — ambos "APRUEBA CON
CAMBIOS", ambos piden **partir en 2 ciclos**. Este documento ya incorpora esas correcciones
(marcadas `[aud]`) y el corte.*

**Alcance:** la interfaz **del producto** (`web/src/pages/*` + `web/src/components/*`, sin
`components/landing/*`). **No se toca** `motor/*` ni ningún cálculo. **No se toca** la máquina
de estados de `SessionGuard` ni `db_rls`/RLS — sí su presentación, y un `Depends` de rol
aditivo en 2-3 endpoints `GET`. La landing es el Objetivo 2 (la rediseña el fundador aparte);
aquí solo el logo y `manifest.json`.

---

## Estado actual verificado (2026-08-29, ampliado por la auditoría 2026-08-30)

**Tema / tokens**
- `index.css` con `@theme`; ya tiene `.glass` y `.glass-gold`; falta `.glass-emerald`.
- **No hay** `[data-theme]` redefinido en CSS, **no hay** clases `dark:` en `web/src`.
  `useTheme` solo se importa en `AppLayout.tsx` y `Sidebar.tsx` → R2 es más chico de lo previsto.
- `web/index.html` tiene un `<script>` inline que lee `localStorage['cm-theme']` y escribe
  `data-theme`, más `<meta name="theme-color" content="#07100D">` y status bar iOS oscuro.
- "Inter" aparece **3 veces** en `index.css`: `@import` (L1), `--font-sans` (L19) y un
  `font-family` literal en `body` (L41).
- `body::before` (textura de ruido) tiene `z-index: 9999` → se pinta sobre modales y sobre la barra.
- `AppLayout.tsx` L18-20: 3 "orbes atmosféricos" (estética oscura); `AppLayout` se renderiza
  **por página**, no es layout route.

**Formato / utilidades**
- Ya existe `web/src/lib/utils.ts` con `formatCOP`/`formatNum` (Intl `es-CO`), usado en
  Dashboard/Historial/Parámetros/Nesting/Cotización → **extender ese, no crear `format.ts`**.
- **No hay `react-hook-form` en uso**: todos los formularios son `useState` a mano
  (`CotizacionPage` = 2.551 líneas).

**Carga inicial / rutas**
- `AuthGate` (`App.tsx`) bloquea toda la app con spinner hasta `hydrated` (`getSession` + `getMe`).
- El "cuelgue de ~9 s" es el overlay de `SessionGuard` estado `reclamando`
  (`fixed inset-0 z-[100]`) tapando una página **ya pintada**.
- `PrivateRoute.tsx`: `!usuario` → `Navigate to /login` (hoy expulsaría a un usuario logueado
  mientras carga el perfil).
- `App.tsx` catch-all y fallback de `AdminRoute` → `Navigate to /dashboard` (ruta que se le va
  a ocultar al Operativo → rebote).

**Roles / backend**
- `GET /api/dashboard/resumen` → `require_dashboard` → Operativo recibe **403** ✓.
- `GET /api/parametros`, `GET /api/config/empresa`, `GET /api/config/logo` → **solo**
  `get_current_user`, sin gate de rol → Operativo los lee hoy. Solo los `PUT` están gateados.
- Capacidades del frontend = 4 flags de `roles_catalogo` (`web/src/api/auth.ts`):
  `puede_ver_dashboard`, `puede_usar_modo_bi_senior`, `puede_pedir_datos_agregados_agente`,
  `puede_gestionar_usuarios`. **No hay** `puede_ver_parametros`.
- `_PERFIL_SQL` (`backend/middleware/auth.py`) corre en conexión de **servicio** (BYPASSRLS).

**Otros**
- `recharts` 3.8 trae `accessibilityLayer` (teclado) por defecto.
- Toolchain atípico: `eslint` 10, `typescript` 6.0, `vite` 8, `lucide-react` 1.17.0.
  `@axe-core/react` está semi-abandonado → verificar compat con React 19.2 en R0, o usar
  `axe-core` + hook propio.
- `AdminPage.tsx` (tabla semántica + `aria-label`) y `index.css` (tokens, light-mode) son la
  referencia correcta.
- Baseline: `npm run build` limpio.

---

## Decisiones — cerradas

1. **Nombre de empresa en el top bar:** SÍ. `GET /api/auth/me` / `UsuarioOut` gana
   `empresa_nombre` (JOIN aditivo a `public.empresas` en `_PERFIL_SQL`; no toca RLS ni motor;
   re-correr smoke de auth). En el frontend, `interface Usuario` gana
   `empresa_nombre: string | null` **opcional** hasta que el backend lo sirva.
2. **Logo:** arte nuevo entregado por el fundador. Activos ya generados y optimizados en
   `web/public/`: `favicon.png` (512², 47 KB), `apple-touch-icon.png` (180², 10 KB),
   `logo.png` (640×213, 28 KB), `isotipo.png` (256², 17 KB). Originales en `assets/marca/`. El
   SVG vectorizado **no se publica** (1,1 MB, autotrazado). **R5 además** entrega una variante
   del wordmark legible sobre fondo claro ("Costo" hoy es gris casi invisible sobre crema) y
   reescribe `manifest.json` (hoy "Costomarmol", colores azul oscuro, logo ancho como icono
   cuadrado).
3. **Rol Operativo — frontera real donde no rompa su flujo de cotizar (decisión delegada al
   asistente, 2026-08-30):**
   - `GET /api/config/empresa` y `GET /api/config/logo` → `Depends(require_dashboard)`
     (aditivo; el Operativo no necesita el perfil de empresa ni el logo administrativo para
     cotizar — el PDF lee el logo de la BD, no del endpoint).
   - `GET /api/parametros`: en R0 se verifica si `CotizacionPage`/`Express`/`AIU` lo consumen.
     Si **no** → `Depends(require_dashboard)`. Si **sí** → queda legible (ya está protegido en
     escritura; las tarifas del propio taller no son dato sensible entre usuarios del mismo
     taller — RLS ya aísla por empresa) y "Parámetros" se oculta solo de menú/ruta.
   - Menú + rutas: componente `RoleRoute` oculta y redirige "Dashboard", "Parámetros" y
     "Configuración" cuando `!puede_ver_dashboard`. Gate del frontend centralizado en
     `web/src/lib/capabilities.ts` (módulo único), reutilizando `puede_ver_dashboard` como
     llave de las tres — no se inventa `puede_ver_parametros` (Regla 3).
4. **Landing:** fuera de alcance. Solo logo + `manifest.json`.
5. **R7 — carga inicial:** el fundador eligió **reconstruir el flujo completo** (no solo el
   arreglo mínimo del overlay). Detalle en el bloque R7.
6. **Auditoría (Fase 2):** hecha — 2× "APRUEBA CON CAMBIOS", partir en 2 ciclos. Correcciones
   incorporadas abajo, marcadas `[aud]`.

---

## Corte en 2 ciclos

- **CICLO 1 — "detener la hemorragia"** (bajo riesgo, gran pago visual): bloques **R0, R1, R2,
  R4, R5, R7, R8**. Tokens y contraste corregido, eliminar el modo oscuro, barra lateral
  esmeralda, logo + `manifest`, reconstrucción de la carga inicial, quitar restos del piloto.
  Cada pantalla queda correcta, sin tema roto, sin colores fuera de marca, y arranca rápido.
  Entregable y verificable solo.
- **CICLO 2 — "sistematizar":** bloques **R3, R6, R9**. Los 12-14 componentes base con
  accesibilidad real + la pasada pantalla por pantalla + la verificación completa (axe por
  ruta, teclado, sesión única en 2 ventanas).

Numeración de bloques conservada del plan original para trazar con las auditorías.

---

# CICLO 1

### R0 — Preflight + cambios de backend
- Rama ya creada. `npm run build` de referencia.
- **Verificar compat de `@axe-core/react` con React 19.2** `[aud]`; si falla, `axe-core` +
  hook propio en R9. Fijar versión exacta.
- **Backend, cambio aislado** `[aud]` (no toca `db_rls` ni `motor`):
  - `empresa_nombre`: `join public.empresas e on e.id = u.empresa_id` en `_PERFIL_SQL`
    (`middleware/auth.py`); propagar a `UsuarioOut` (`models/auth.py`) y a `me()`
    (`routers/auth.py`).
  - `Depends(require_dashboard)` en `GET /api/config/empresa` y `GET /api/config/logo`.
  - Verificar si el flujo de cotizar del Operativo consume `GET /api/parametros`; gatearlo
    solo si no. Anotar aquí el resultado.
  - Re-correr el smoke de auth/aislamiento de la Fase 2.A (2 empresas, admin + operativo).
- Micro-commit.

### R1 — Capa de tokens y utilidades (`web/src/index.css`, `web/src/lib/utils.ts`)
Contrastes **recalculados en la auditoría** `[aud]` — usar estos, no los del borrador:
- `--color-brand-text-secondary: #5F5F5F` → 5,3:1 sobre crema. **Es el color de los
  micro-labels 11px/600** (11px negrita NO es "texto grande" WCAG).
- `--color-brand-text-tertiary: #6E6E6E` → 4,2:1 → **restringido a texto ≥18px y a íconos no
  esenciales**. Prohibido en micro-labels.
- Estados, separando texto de relleno `[aud]`:
  - `--color-brand-success: #15612E` (6,2:1 — vale como texto) + `-soft` para fondo de badge.
  - `--color-brand-warning-text: #6E5410` (5,9:1 crema / 7,1:1 blanco) para texto/íconos;
    `--color-brand-warning-soft: #B4820E` **solo** para relleno/borde de badge (`#B4820E` como
    texto reprueba: 2,8:1).
  - `--color-brand-danger: #B23B3B` (4,8:1 — vale como texto) + `-soft`.
- Esmeralda: `--color-brand-emerald: #156850`, `--color-brand-emerald-deep: #075343`.
- `.glass-emerald`: `linear-gradient(180deg, rgba(21,104,80,.88), rgba(15,90,68,.90))` +
  `backdrop-filter: blur(20px)` + `border-right: 1px solid rgba(255,255,255,.10)`. La
  transparencia va en el **fondo**, nunca en el texto (ver R4).
- **Regla de proyecto:** prohibido `opacity`/alfa `<100%` en nodos de **texto**; siempre el
  token sólido.
- `:focus-visible` global: `outline: 2px solid var(--color-brand-primary); outline-offset: 2px`.
  Quitar `focus:outline-none` **solo donde no haya indicador de foco alternativo** `[aud]`
  (`inputBase` de Parámetros y `MonoInput` de Nesting ya tienen uno — dejarlos).
- `@media (prefers-reduced-motion: reduce)`: reset de `animation`/`transition` CSS. **No
  basta** `[aud]` — ver R2 para el movimiento en JS.
- Quitar "Inter" de las **3** apariciones (`@import`, `--font-sans`, `body`) `[aud]`. Fallback
  `'Plus Jakarta Sans', system-ui, sans-serif`.
- `web/src/lib/utils.ts` `[aud]`: añadir `formatPct` y una utilidad de número con
  `font-variant-numeric: tabular-nums; letter-spacing: 0` (bug "40 , 0 %" del hallazgo G).
  Migrar los helpers locales (`formatMillones`/`mesCorto` de Dashboard, `formatFecha` de
  Historial). **No crear `lib/format.ts`.**
- Micro-commit.

### R2 — Eliminar el sistema de tema
- Borrar `web/src/hooks/useTheme.ts`.
- `AppLayout.tsx`: quitar los 2 botones sol/luna y todo `useTheme`. **Quitar los 3 "orbes
  atmosféricos"** (L18-20) `[aud]` — estética oscura, no aplica en light-mode.
- `Sidebar.tsx`: quitar las ramas dark/light (default actual `'dark'`).
- **`web/index.html`** `[aud]`: eliminar el `<script>` inline de `cm-theme`/`data-theme`;
  `<meta name="theme-color">` → color de marca fijo (crema `#F5E8D2` o esmeralda); revisar
  `apple-mobile-web-app-status-bar-style`.
- `body::before` (textura): bajar `z-index` de `9999` a `1` (o moverla a `::after` de
  `<main>`) `[aud]` — hoy tapa modales y la barra.
- **Movimiento en JS** `[aud]`: envolver la app en `<MotionConfig reducedMotion="user">`
  (framer ya instalado); `hooks/useCountUp.ts` lee
  `matchMedia('(prefers-reduced-motion: reduce)')` y salta al valor final; spinners
  `repeat: Infinity` → spinner CSS + texto "Cargando".
- `grep -r "useTheme\|data-theme\|cm-theme\|prefers-color-scheme"` sobre **`web/`** completo →
  vacío (salvo el `@media` de R1 y el `matchMedia` de `useCountUp`).
- Micro-commit.

### R4 — Barra lateral esmeralda + shell visual (`Sidebar.tsx`, `AppLayout.tsx`)
- **Barra lateral `.glass-emerald`**, con texto en **colores sólidos** `[aud]`:
  - inactivo: crema sólida `#F5E8D2` sobre `#156850` → 5,5:1.
  - activo: `#FFFFFF` sobre `rgba(255,255,255,.14)`+esmeralda → ~4,9:1; indicador **no
    cromático** además del fondo (barra lateral / negrita).
  - encabezados de grupo: crema sólida apenas atenuada `#E4D8BF` (~4,7:1 — verificar en la
    verificación del ciclo), 11px/600. **Sin alfa en el texto. Sin `#07100D` ni `#F0F4F8`.**
- Logo: variante clara (crema/blanco) sobre el verde (`/isotipo.png` o el wordmark claro).
- Skip-link (`<a href="#main" class="sr-only focus:not-sr-only">Saltar al contenido</a>`) como
  primer elemento enfocable; `id="main"` + `tabindex="-1"` en `<main>`.
- `document.title` por ruta ("<Sección> · Costo360") — un `useEffect` en `AppLayout`.
- Identidad de usuario + **nombre de empresa** (`empresa_nombre` de R0) al top bar.
- **Foco al `<h1>` al cambiar de ruta:** en el Ciclo 1, enfocar `<main tabindex="-1">`. El
  `<h1 tabindex="-1">` por página lo absorbe el primitivo `PageHeader` en el Ciclo 2 `[aud]`.
- Revisar el stacking de la barra sobre `body::before` (ya bajado en R2).
- Micro-commit.

### R5 — Logo sobre fondo claro + `manifest.json`
- **Variante del wordmark legible sobre crema/blanco** `[aud]`, **obligatorio**: "Costo" en
  `--color-brand-text-dark` o `--color-brand-primary` (SVG con `currentColor` si se puede),
  "360" en dorado, símbolo en `#156850`. Usarla en login y header. Si no hay SVG limpio del
  arte, lockup tipográfico + `/isotipo.png`, marcado "provisional".
- Sobre la barra esmeralda: variante clara.
- **`web/public/manifest.json`** `[aud]` — reescribir:
  - `name`/`short_name` → `"Costo360"`.
  - `description` → `"Costo360 — Cotización de piedra natural"`.
  - `background_color`/`theme_color` → color de marca (hoy `#060D1B`/`#0C1B3A`).
  - `icons` → `/favicon.png` (512², cuadrado) + `/apple-touch-icon.png`; **no** `/logo.png`
    (apaisado, se recorta como maskable).
- `web/index.html` `[aud]`: sumar `<link rel="icon" type="image/svg+xml">` solo si hay SVG
  limpio; si no, `favicon.png` + `apple-touch-icon` bastan.
- Micro-commit.

### R7 — Reconstrucción del flujo de carga inicial (decisión del fundador: alcance completo)
- **`web/src/store/auth.ts`** `[aud]`: estados explícitos —
  `'authenticating' | 'profile-pending' | 'ready' | 'anon'` (o `sessionResolved` + `profileLoaded`).
- **`App.tsx` / `AuthGate`:** renderizar el shell (sidebar + skeletons que calcen con el
  layout final) en cuanto la sesión esté resuelta; `getMe()` corre detrás. Objetivo: primer
  paint <1 s.
- **`PrivateRoute.tsx`** `[aud]`: distinguir "cargando" (sesión resuelta, perfil pendiente →
  shell/skeleton) de "anónimo" (sin sesión → `Navigate to /login`). **Nunca** expulsar a un
  usuario logueado a mitad de carga.
- **`SessionGuard.tsx`:** estado `reclamando` → indicador **no modal** (sin `fixed inset-0`,
  sin `backdrop-blur`); la app renderiza detrás. Solo `esperando` / `aviso-titular` /
  `expulsado` son modales. **La máquina de estados (`useEffect`/`claim`/`heartbeat`) no se toca.**
- **`RoleRoute`** `[aud]` (componente nuevo, reutilizable): oculta del menú y redirige
  "Dashboard", "Parámetros", "Configuración" cuando `!puede_ver_dashboard`
  (`lib/capabilities.ts`). Cambiar el catch-all de `App.tsx` y el fallback de `AdminRoute` de
  `/dashboard` → destino rol-aware (`/cotizacion` para el Operativo) `[aud]`.
- **`AsyncBoundary` mínimo** `[aud]`: versión **presentacional** (recibe
  `isPending`/`isError`/`onRetry` por props) para capturar el 403 del Dashboard del Operativo →
  "Tu rol no tiene acceso — usa Nueva Cotización" + CTA. El primitivo completo y su adopción en
  todas las pantallas van en el Ciclo 2. React Query v5 no permite envolver `useQuery` desde
  fuera; **no** se usa Suspense aquí.
- **`web/src/api/client.ts`** `[aud]`: añadir `timeout: 10000` al `axios.create` (hoy no tiene).
- Micro-commit.

### R8 — Restos del piloto
- `CotizacionExpressPage` placeholder "Gramar" → "Buscar en el catálogo…".
- `CotizacionAIUPage` / `ConfigPage` placeholder "Barranquilla" → "Ciudad".
- (`manifest.json` ya en R5.)
- Micro-commit.

### Verificación del Ciclo 1
- `tsc -b` + `npm run build` limpios.
- `grep` de tema vacío sobre `web/`.
- Recalcular ratios de los tokens finales (todos ≥4,5:1 texto / ≥3:1 UI).
- Recorrido manual (admin + operativo): las 13 rutas cargan <1 s, la barra esmeralda se lee, el
  logo se ve sobre claro y sobre verde, el Operativo no ve Dashboard/Parámetros/Config y no
  rebota, sesión única en 2 ventanas sigue funcionando (login, logout, refresh a mitad de
  carga, sesión vencida, 403 del Dashboard).
- Actualizar `ARQUITECTURA_MAESTRA.md` §6 (barra esmeralda; "light-mode estricto" aplica al
  contenido) y marcar en `REVISION_UX_2026-08-29.md` los hallazgos cerrados por el Ciclo 1.
- Cierre de sesión (`PROGRESS.md`/`SESSION.md`).

---

# CICLO 2

### R3 — Primitivos compartidos (`web/src/components/ui/`)
*`[aud]` Añadidos frente al borrador: `Button`/`IconButton`, `PageHeader`. `DateField` y
`SelectField` pasan a ser envoltorios de los controles nativos, no widgets custom.*
- **`Button.tsx` / `IconButton.tsx`** `[aud]`: radio único (`rounded-lg`), color por token;
  `IconButton` exige `aria-label` y target ≥24px (el toggle de tema medía 22px).
- **`PageHeader.tsx`** `[aud]`: kicker + regla + `<h1 tabindex="-1">` (foco al cambiar de
  ruta) + slot de acciones + fija `document.title` + decide el acento verde una sola vez.
  Reemplaza el encabezado hand-rolled de Admin/Historial/Parámetros/Dashboard.
- **`Dialog.tsx`**: `role="dialog"`/`alertdialog`, `aria-modal`, `aria-labelledby`, foco al
  abrir, trampa de foco, Escape, retorno de foco, `inert` en `#root` (portal a
  `document.body`). Para la paleta, reusar `<Command.Dialog>` de `cmdk` `[aud]`. **Migrar
  `SessionGuard` a `Dialog` portalado cambia dónde monta** `[aud]` — más que "solo JSX";
  re-probar sesión única. Migrar también: `AgenteChat` (no-modal: foco + Escape), `CCModal` de
  Historial, y las modales de `AdminPage`.
- **`Card.tsx`**: `bg-white` + `border-brand-border` + `shadow-[0_1px_3px_rgba(74,74,74,.08)]`.
- **`Badge.tsx` + `StatusBadge.tsx`**: solo colores de marca; `Badge` con **slot de icono**
  `[aud]` (los 7 inductores de Parámetros se distinguen por icono+texto, no por 7 matices);
  `StatusBadge` mapea Aprobada→success, Pendiente→warning, Rechazada/Borrador→danger/neutro.
- **`Field.tsx`**: `<label htmlFor>` + control + `aria-invalid` + `aria-describedby` + error
  con `id`. Opera sobre inputs **controlados planos** `[aud]` (no hay react-hook-form).
- **`FormSection.tsx`**: `<fieldset><legend>` o `role="group"` + `aria-labelledby`.
- **`SelectField.tsx`** `[aud]`: **envoltorio del `<select>` nativo** (altura/radio/foco/label
  consistentes) — no listbox custom.
- **`DateField.tsx` / `DateRangeField.tsx`** `[aud]`: **envoltorio del `<input type="date">`
  nativo** + `<label>` real. El calendario custom se difiere.
- **`SegmentedControl.tsx`** `[aud]`, **dos semánticas**: Parámetros (Tarifas/Adicionales —
  intercambian panel) → `role="tablist"` + `tabpanel` + `aria-controls` + roving tabindex +
  flechas. Dashboard (Días/Semanas/Meses — no cambian de panel) → `role="radiogroup"` /
  `aria-pressed`. Indicador no cromático (subrayado/negrita).
- **`EmptyState.tsx`**: icono 32px `#6E6E6E` + mensaje + CTA opcional.
- **`DataTable.tsx`**: `<table>` semántica, `<caption>`/`aria-label`, `<th scope="col">`.
- **`AsyncBoundary.tsx`** (completo, presentacional) `[aud]`: skeletons `role="status"`/
  `aria-busy`, rama `isError` `role="alert"` + "Reintentar". Cada `useQuery` le pasa su estado.
  El timeout ya vive en `client.ts` (R7).
- Micro-commits (uno por primitivo o grupo).

### R6 — Pasada pantalla por pantalla
Orden por frecuencia de uso: Dashboard → Cotización Directa → Express → AIU → Historial →
Parámetros → Configuración → Inventario → Retales → Nesting → Login → ResetPassword →
AdminPage. Por cada una:
- Tarjetas ad-hoc → `<Card>`; texto secundario a los tokens (cero opacidad en texto);
  micro-labels 9→11px/600 con `--color-brand-text-secondary`.
- Números por `utils.ts` + `font-mono` + `tabular-nums`; `$` como prefijo, una sola convención.
- Encabezado → `<PageHeader>`; jerarquía fija (página 28-30/700, sección 18-20/600); `<h1>`
  real en Login/Reset; `aria-current="step"` en el paso activo del wizard.
- Formularios → `<Field>` + `<FormSection>` en Cotización Directa/AIU/Express y Configuración.
- Historial → `<DataTable>`; filtros con `<DateRangeField>` + `<SelectField>` etiquetados;
  iconos de acción con `aria-label`, visibles en `:focus-within`.
- Parámetros → `<SegmentedControl>` ×2; badges de inductor `<Badge>` con icono; inputs de
  precio `<Field>` + `aria-label` + miles.
- Dashboard → `<AsyncBoundary>` en cada `useQuery`; KPIs en `<Card>` + `font-mono`; barra de
  estados apilada con 3 colores + leyenda; gráficos Recharts con `accessibilityLayer` `[aud]`
  + `role="img"` + `aria-label`, y **tabla `sr-only` hermana** (no hija) del nodo `role="img"`
  `[aud]`; granularidad → `<SegmentedControl>` radiogroup.
- `AgenteChat`: quitar "Beta · Gemini 3.5 Flash-Lite" de la UI; chips con contraste.
- `max-width` centrado en Historial/Admin.
- Nombre único para "Nueva Cotización / Cotización Directa / Crear cotización guiada" `[aud]` —
  elegir uno y aplicarlo en sidebar, `<h1>` y CommandPalette.
- Micro-commit por pantalla.

### R9 — Verificación final
- `tsc -b` + `npm run build` limpios.
- `axe-core` sin violaciones nuevas por ruta (o `@axe-core/react` si R0 lo validó).
- Recalcular todos los ratios de contraste finales (≥4,5:1 texto / ≥3:1 UI).
- Recorrido en vivo (admin + operativo): 13 rutas, los 5 diálogos, sesión única en 2 ventanas,
  teclado completo (Tab por toda la app, Escape en diálogos, skip-link, roving tabindex en los
  `SegmentedControl`).
- `ARQUITECTURA_MAESTRA.md` §6 y `REVISION_UX_2026-08-29.md` al día (hallazgos A-K cerrados).
- Reindexar el grafo; cierre de sesión.

---

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Reemplazar tarjetas/inputs por primitivos rompe layouts en cascada | Ciclo 2; un primitivo a la vez, `build` + revisión visual por página; R3 antes de R6. |
| 2 | Migrar `SessionGuard` a `Dialog` portalado cambia dónde monta (no solo JSX) `[aud]` | Ciclo 2; su máquina de estados no se toca; re-probar sesión única en 2 ventanas en R9. En el Ciclo 1 el `SessionGuard` sigue inline, solo se hace no-modal el estado `reclamando`. |
| 3 | Reconstruir la carga inicial (R7) puede expulsar a un usuario logueado a mitad de carga `[aud]` | Estado explícito `profile-pending` en `store/auth.ts`; `PrivateRoute` distingue "cargando" de "anónimo"; prueba de refresh a mitad de carga en la verificación del Ciclo 1. |
| 4 | El cambio de `_PERFIL_SQL` toca el archivo de auth que endureció la Fase 2.A `[aud]` | Cambio aditivo (un JOIN, sin tocar RLS ni `db_service`); re-correr el smoke de auth/aislamiento (2 empresas, admin+operativo) en R0. |
| 5 | Gatear `GET /api/parametros` rompe el flujo de cotizar del Operativo `[aud]` | R0 verifica el consumo real antes de gatear; si lo usa, queda legible (ya protegido en escritura, RLS aísla por empresa) y "Parámetros" se oculta solo de menú. |
| 6 | La barra esmeralda-glass sobre `body::before` (textura) se ve rara | R2 baja el `z-index` de la textura a 1. |
| 7 | El wordmark nuevo no se lee sobre fondo claro `[aud]` | R5 entrega una variante recoloreada obligatoria; si no hay SVG limpio, lockup provisional + `isotipo.png`. |
| 8 | Alcance enorme | Partido en 2 ciclos; dentro de cada uno, orden estricto y un commit por bloque/pantalla. |
| 9 | `@axe-core/react` semi-abandonado / toolchain atípico `[aud]` | R0 valida compat con React 19.2; alternativa `axe-core` + hook. Versiones fijadas. |

---

*Auditado en la Fase 2 del ciclo `/goal` (2026-08-30) por UX Architect y Frontend Developer —
ambos "APRUEBA CON CAMBIOS". Correcciones marcadas `[aud]`. Pendiente: aprobación del fundador
del Ciclo 1 (Fase 3) antes de ejecutar.*
