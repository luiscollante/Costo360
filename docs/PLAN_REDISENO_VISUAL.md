# Plan — Rediseño visual del producto (Objetivo 1 del roadmap)

*Ciclo `/goal`. Rama `goal/rediseno-visual` (sobre `master`, con la Fase 2.A ya fusionada).
Insumo: `docs/REVISION_UX_2026-08-29.md` (revisión por 3 agentes + decisión del fundador sobre
la barra lateral). Este documento es el plan de EJECUCIÓN — el "qué" y el "por qué" ya están en
la revisión.*

**Alcance:** la interfaz **del producto** (`web/src/pages/*` + `web/src/components/*`, sin
`components/landing/*`). La landing es el Objetivo 2 — solo se tocan aquí los cambios de marca
que cruzan producto y landing (logo, `manifest.json`). **No se toca** `motor/*` ni ningún
cálculo (roadmap). **No se toca** la lógica de datos de la Fase 2.A (auth, `db_rls`,
`SessionGuard` cambia solo de presentación y accesibilidad, no de máquina de estados).

---

## Estado actual verificado (2026-08-29)

- 15 páginas, ~20 componentes de producto, 13 módulos `api/`, `index.css` con tokens `@theme`.
- `index.css` ya tiene `.glass` (glass blanco) y `.glass-gold`. Falta `.glass-emerald` para la
  barra lateral.
- `hooks/useTheme.ts` + toggle sol/luna en `AppLayout.tsx` + ramas dark/light en `Sidebar.tsx`
  (default `'dark'`) → **se eliminan** (decisión del fundador + recomendación unánime de los
  agentes).
- `AdminPage.tsx` (usa `<table>` semántica + `aria-label`) y `index.css` (tokens, light-mode)
  son la referencia correcta; el resto se alinea a ellos.
- Baseline: `npm run build` limpio hoy.

---

## Bloques de ejecución (un micro-commit por bloque)

### R0 — Preflight
- Rama creada. `npm run build` de referencia. Instalar `@axe-core/react` (dev) para el chequeo
  de accesibilidad en R9. Anotar en `PATRONES_DE_ERROR.md` si aparece algo estructural.

### R1 — Capa de tokens y utilidades base (`web/src/index.css`)
- **Tokens de texto** (hallazgo A): `--color-brand-text-secondary: #5F5F5F` (≈4.6:1 sobre crema),
  `--color-brand-text-tertiary: #6E6E6E` (solo texto ≥18px). Regla de proyecto: **prohibido**
  aplicar opacidad `<100%` a nodos de texto — se usa el token sólido.
- **Tokens de estado** (hallazgo D): `--color-brand-success: #15612E`,
  `--color-brand-warning: #B4820E` (dorado oscuro AA sobre crema/blanco),
  `--color-brand-danger: #B23B3B`. Y tintes `-soft` para fondos de badge.
- **Tokens esmeralda** (decisión del fundador): `--color-brand-emerald: #156850`,
  `--color-brand-emerald-deep: #075343`.
- **`.glass-emerald`**: `background: linear-gradient(180deg, rgba(21,104,80,.88), rgba(15,90,68,.90)); backdrop-filter: blur(20px); border-right: 1px solid rgba(255,255,255,.10)`.
- **Foco visible global** (hallazgo I): `:focus-visible { outline: 2px solid var(--color-brand-primary); outline-offset: 2px; border-radius: 4px; }` y quitar los `focus:outline-none` sueltos.
- **`@media (prefers-reduced-motion: reduce)`**: `*,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; animation-iteration-count:1!important; }`.
- Quitar **Inter** del `@import` y de `--font-sans` (hallazgo K). Fallback `system-ui`.
- Shimmer infinito de la landing: fuera de alcance aquí (Objetivo 2), pero el `@media` de arriba
  ya lo acota.
- **`web/src/lib/format.ts`** (nuevo): `fmtCOP(n)`, `fmtNum(n)`, `fmtPct(n)` con
  `Intl.NumberFormat('es-CO')`. Un solo lugar para el formato colombiano (hallazgo G).

### R2 — Eliminar el sistema de tema
- Borrar `web/src/hooks/useTheme.ts`.
- `AppLayout.tsx`: quitar los dos botones sol/luna (móvil + escritorio) y todo `useTheme`.
- `grep -r "useTheme\|data-theme\|cm-theme"` en `web/src` → debe quedar vacío.

### R3 — Primitivos compartidos (`web/src/components/ui/`)
Crear y usar en todo el producto (reemplazan implementaciones ad-hoc):
- **`Dialog.tsx`** — `role="dialog"`/`alertdialog`, `aria-modal`, `aria-labelledby`, foco al
  abrir, trampa de foco, Escape, retorno de foco al disparador, `inert` en el fondo. Migrar:
  `CommandPalette`, `AgenteChat` (no-modal: al menos foco + Escape), `SessionGuard` (todos sus
  estados como `alertdialog`), la modal de cuenta de cobro de Historial, y las modales
  Invitar/Editar de `AdminPage`.
- **`Card.tsx`** — `bg-white` + `border border-brand-border` + `shadow-[0_1px_3px_rgba(74,74,74,.08)]`. Reemplaza el "todo flota" (hallazgo J).
- **`Badge.tsx`** + **`StatusBadge.tsx`** — solo colores de marca; `StatusBadge` mapea
  Aprobada→success, Pendiente→warning, Rechazada/Borrador→danger/neutro. Elimina morado/cian/
  naranja (hallazgo D).
- **`Field.tsx`** — `<label htmlFor>` + control + `id` + `aria-invalid` + `aria-describedby` +
  mensaje de error con `id`. Requisito para todos los formularios (hallazgo I).
- **`FormSection.tsx`** — `<fieldset><legend>` (o `role="group"` + `aria-labelledby`).
- **`SelectField.tsx`** — un único select estilizado (elimina los `<select>` nativos de
  Nesting/Express). Basado en el patrón de `MaterialCombobox`.
- **`DateField.tsx`** / **`DateRangeField.tsx`** — estilizado + etiquetado (elimina el
  `<input type="date">` nativo de Historial).
- **`SegmentedControl.tsx`** — `role="tablist"` o `aria-pressed`; indicador no-cromático
  (subrayado/negrita) además del fondo. Para las 2 barras de pestañas de Parámetros y el
  Días/Semanas/Meses del Dashboard.
- **`EmptyState.tsx`** — icono 32px `#6E6E6E` + mensaje de una línea + CTA opcional. Un solo
  patrón (Inventario, Historial, Retales, panel de resultado de Express/Nesting).
- **`DataTable.tsx`** (o helper) — `<table>` semántica con `<caption>`/`aria-label` y
  `<th scope="col">`. Para Historial (hoy es `<div>` + grid).
- **`AsyncBoundary.tsx`** — envuelve `useQuery`: skeletons con `role="status"`/`aria-busy`,
  rama `isError` con `role="alert"` + botón "Reintentar", timeout ~10s. Patrón global
  (hallazgo F).

### R4 — Barra lateral + shell (`Sidebar.tsx`, `AppLayout.tsx`)
- **Barra lateral esmeralda-glass** (decisión del fundador): `.glass-emerald`; ítem inactivo
  `text-[rgba(245,232,210,.72)]` (crema 72%, ≈4.6:1 sobre `#156850`), hover fondo
  `rgba(255,255,255,.10)`; ítem **activo** `text-white` sobre `rgba(255,255,255,.14)` (≈8:1);
  encabezados de grupo crema 60%, 11px/600. Sin `#07100D` ni `#F0F4F8`.
- **Logo**: usar la variante clara (ver R5) sobre el verde.
- **Skip-link** (`<a href="#main" class="sr-only focus:not-sr-only">Saltar al contenido</a>`)
  como primer elemento enfocable; `id="main"` + `tabindex="-1"` en `<main>`.
- Al cambiar de ruta: mover el foco al `<h1>` de la vista; actualizar `document.title`
  ("<Sección> · Costo360").
- Subir la identidad del usuario / nombre de empresa al top bar (hoy solo al pie del sidebar).
- El nombre de la empresa (de `usuario.empresa_id` → hay que exponer el nombre en `/api/auth/me`
  o pedirlo aparte — **decisión menor de la Fase 3**: ampliar `UsuarioOut` con `empresa_nombre`).

### R5 — Logo para fondo claro (hallazgo C)
- Crear **una** variante del lockup legible sobre crema: "Costo" en `--color-brand-text-dark`,
  "360" en dorado, símbolo del isotipo en `#156850`. Formato SVG con `currentColor` donde se
  pueda. Usarla en login, header, y (Objetivo 2) landing/navbar/footer.
- Sobre la barra lateral esmeralda: variante clara ("Costo360" en crema/blanco).
- `web/public/manifest.json` → `"description": "Costo360 — Cotización de piedra natural"`
  (quita "Mármoles Collante & Castro"). Revisar `name`/`short_name`.
- **Nota:** el arte del isotipo en sí no se rehace aquí; si el fundador quiere retocar la marca
  gráfica, es aparte. Aquí solo se recolorea el wordmark y se generan las variantes.

### R6 — Pasada página por página (aplicar primitivos + contraste + jerarquía + formato)
Orden por frecuencia de uso: Dashboard → Cotización Directa → Express → AIU → Historial →
Parámetros → Configuración → Inventario → Retales → Nesting → Login → ResetPassword → AdminPage.
Por cada página:
- Reemplazar tarjetas ad-hoc por `<Card>`; texto secundario a los tokens nuevos (cero opacidad
  en texto); micro-labels 9→11px/600.
- Números por `fmt*` + `font-mono` en todo dato numérico; una convención de `$` como prefijo.
- Formularios: `<Field>` + `<FormSection>` en Cotización Directa/AIU/Express y Configuración;
  `aria-current="step"` en el paso activo del wizard; `<h1>` real en Login/Reset; jerarquía
  tipográfica fija (página 28–30/700, sección 18–20/600).
- Historial → `<DataTable>`; filtros con `<DateRangeField>` + `<SelectField>` etiquetados;
  iconos de acción con `aria-label` + visibles también en `:focus-within`.
- Parámetros → `<SegmentedControl>` ×2; badges de inductor por `<Badge>` (marca); inputs de
  precio con `<Field>` + `aria-label` explícito + formato de miles.
- Dashboard → `<AsyncBoundary>`; KPIs en `<Card>` con `font-mono`; barra de estados apilada con
  los 3 colores + leyenda; gráficos Recharts envueltos en `role="img"` + `aria-label` + tabla
  `sr-only` equivalente; toggle de granularidad → `<SegmentedControl>`.
- AgenteChat: quitar "Beta · Gemini 3.5 Flash-Lite" de la UI; chips de sugerencia con contraste.
- Contenedor `max-width` centrado en Historial/Admin (hoy contenido arriba-izquierda con vacío).

### R7 — Estados de carga / error (hallazgo F)
- `AppLayout`/`AuthGate`: render inmediato del shell (sidebar + skeletons que calcen con el
  layout final); la verificación de sesión corre en segundo plano; redirección a login solo si
  falla. Objetivo: primer paint <1s (hoy ~9s de "Verificando la sesión…").
- `SessionGuard`: `role="alertdialog"` + `aria-live` en el estado de espera; botón "Cancelar y
  salir" también durante `reclamando`; fondo `inert`. **La máquina de estados no cambia**, solo
  su presentación/accesibilidad.
- Dashboard del rol Operativo: `<AsyncBoundary>` captura el 403 → mensaje "Tu rol no tiene
  acceso al panel — usa Nueva Cotización" con CTA. **Además:** ocultar "Dashboard" del menú y
  redirigir `/dashboard`→`/cotizacion` cuando `!puede_ver_dashboard` (Regla 6). Confirmar contra
  la matriz de `roles_catalogo` qué más ocultar al operativo ("Parámetros", "Configuración").

### R8 — Restos del piloto (hallazgo E)
- `CotizacionExpressPage` placeholder "Gramar" → "Buscar en el catálogo…".
- `CotizacionAIUPage` / `ConfigPage` placeholder "Barranquilla" → "Ciudad".
- (`manifest.json` ya en R5. La dirección del footer de la landing → Objetivo 2.)

### R9 — Verificación
- `tsc -b` + `npm run build` limpios.
- `@axe-core/react` sin violaciones nuevas en cada ruta (dev).
- Re-cálculo de ratios de contraste de los tokens finales (todos ≥4.5:1 texto / ≥3:1 UI).
- Recorrido en vivo con el navegador (admin + operativo): las 13 rutas, los 5 diálogos, la
  sesión única en 2 ventanas, teclado (Tab por toda la app, Escape en diálogos, skip-link).
- Actualizar `ARQUITECTURA_MAESTRA.md` §6 (barra lateral esmeralda-glass; "light-mode estricto"
  aplica al contenido) y `docs/REVISION_UX_2026-08-29.md` marcando lo resuelto.

---

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Reemplazar tarjetas/inputs por primitivos rompe layouts existentes en cascada | Un primitivo a la vez, `npm run build` + revisión visual por página. R3 antes de R6. |
| 2 | Tocar `SessionGuard` accidentalmente cambia su lógica (Fase 2.A recién verificada) | R7 solo cambia JSX de presentación + roles ARIA; los `useEffect`/`claim`/`heartbeat` no se tocan. Re-probar sesión única en R9. |
| 3 | El shell inmediato (R7) expone rutas antes de saber el rol → parpadeo o acceso momentáneo | El gate de `PrivateRoute`/`AdminRoute` sigue; el shell muestra skeletons, no contenido real, hasta que `usuario` está. |
| 4 | La barra esmeralda-glass sobre el `body::before` de textura (z-index 9999) puede verse rara | Revisar el stacking; probablemente bajar el z-index de la textura o excluir la barra. |
| 5 | El logo SVG claro necesita el arte real del isotipo | Si no hay SVG del isotipo, recolorear el PNG actual o hacer un lockup tipográfico + símbolo simple; marcar como "provisional" hasta tener el arte. |
| 6 | Alcance enorme; se puede diluir | Orden estricto R1→R2→R4 (pago visual grande y rápido: tokens + barra esmeralda + shell), luego R3, luego R6 por frecuencia de uso. Cada bloque es entregable. |

## Decisiones para la Fase 3 (fundador)

1. **Nombre de empresa en el top bar:** ¿ampliar `/api/auth/me` con `empresa_nombre` (toca
   backend, mínimo) o dejarlo para después?
2. **Logo:** ¿tienes el arte del isotipo en SVG / vectorial? Si no, se hace un lockup provisional.
3. **Qué ve el rol Operativo:** confirmar contra la matriz de permisos si además de "Dashboard"
   hay que ocultarle "Parámetros" y/o "Configuración" del menú.
4. **Landing:** confirmado fuera de alcance de este ciclo (es el Objetivo 2), salvo logo y
   `manifest.json`. ¿De acuerdo?
5. ¿Quieres una ronda de auditoría del plan por un agente distinto (Fase 2 del ciclo) antes de
   ejecutar, o con la revisión de los 3 agentes + tu aprobación es suficiente para arrancar?
