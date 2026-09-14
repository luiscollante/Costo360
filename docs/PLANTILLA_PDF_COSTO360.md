# PLANTILLA_PDF_COSTO360.md — Reglas fijas del PDF de cotización/cuenta de cobro

Referencia única para `backend/motor/generador_pdf.py`. El objetivo de este
documento es que un ajuste futuro (mío o de otra sesión) parta de esta
referencia en vez de reinterpretar el diseño desde cero cada vez.

**El generador es 100% determinístico (ReportLab).** No hay ningún LLM
diseñando el layout — la estructura de secciones, tipografías y tamaños está
fija en código. Lo único que varía por taller es la paleta de color (ver
abajo) y los datos propios del negocio.

---

## 1. Los 3 documentos y su estructura de secciones

| Documento | Función | Endpoint |
|---|---|---|
| Cotización | `generar_pdf_cotizacion` | `GET /api/cotizacion/{id}/pdf` |
| Oferta AIU (obra pública) | `generar_pdf_cotizacion_aiu` | `GET /api/cotizacion/{id}/aiu-pdf` |
| Cuenta de cobro | `generar_cuenta_cobro` | `POST /api/cotizacion/{id}/cuenta-cobro` |

Los 3 comparten los mismos bloques reutilizables: `_encabezado_doc`,
`_seccion_alcance`, `_seccion_terminos`, `_bloque_firma_cliente`/`_caja_firma`,
`_footer_doc`. **Un fix a uno de estos bloques corrige los 3 documentos a la
vez** — nunca dupliques lógica de encabezado/pie/alcance dentro de una función
específica de un documento.

Flujo de cotización/AIU: Encabezado → Hero de precio → Datos del cliente →
Alcance (inclusiones/exclusiones, **se omite si ambas listas llegan vacías**)
→ Adicionales (si aplica) → Despiece técnico / Costo Directo → Resumen
financiero → Términos → Firma → Footer.

Flujo de cuenta de cobro: Encabezado → Partes (Prestador/Pagador) →
Descripción + Valor → Datos para pago (si hay banco) → Firma → Footer.

## 2. Roles de color (los únicos 3 que varían por taller)

La función `_extraer_paleta_logo(logo_bytes)` deriva estos 3 colores del logo
del taller subido en Configuración. Sin logo, o si la extracción falla, se
usa la paleta oficial de Costo360 (`_DEFAULT_PALETTE`) sin cambios.

| Rol (`palette[...]`) | Dónde se usa | Regla de legibilidad |
|---|---|---|
| `primary` / `header_dark` / `total_bg` | Fondo de la barra de encabezado, el hero de precio, y la fila TOTAL | El color más oscuro del logo, forzado a luminancia ≤ 60 — siempre sostiene texto blanco encima |
| `secondary` / `anticipo_bg` | Texto de títulos de sección sobre blanco, y fondo de la fila ANTICIPO | Un color restante del logo, forzado a luminancia ≤ 100 |
| `accent` | Líneas doradas/divisores, texto de énfasis (anticipo, validez) | El color más saturado del logo, forzado a luminancia entre 130 y 200 — vivo pero legible tanto sobre blanco como sobre `primary` |

**No agregar un 4º color.** La plantilla no tiene un hueco de diseño para
uno — todo color adicional terminaría reemplazando alguno de estos 3 roles de
todas formas.

Los demás colores del PDF (texto de cuerpo, bordes, cebra de tablas, blancos)
son **fijos** y no varían por taller — mantienen siempre los valores de
`_DEFAULT_PALETTE` (`text`, `border`, `zebra_a`/`zebra_b`, `light`,
`ultralight`, `gray`, `white`).

## 3. El logo Costo360 (la marca de agua, no la del taller)

Existen 2 archivos porque el logo tiene texto claro pensado para fondo
oscuro y no funciona sobre fondo blanco (y viceversa):

- `logo_costo360_oscuro.png` — para el encabezado (fondo oscuro, `primary`).
- `logo_costo360_claro.png` — para el pie de página (fondo blanco de la página).

**Nunca usar el mismo archivo en ambos lugares.** Si se reemplaza alguno de
estos 2 archivos, verificar en vivo (generando un PDF real) que el texto siga
siendo legible contra su fondo correspondiente antes de comitear.

## 4. Compositing de logos con transparencia

`_logo_img(logo_bytes, max_h, fondo=(255,255,255))` compone el canal alfa de
cualquier logo (del taller o de Costo360) sobre el color `fondo` — **este
parámetro debe coincidir siempre con el color real donde se va a colocar la
imagen**. Si no coincide, la transparencia deja un recuadro visible del color
equivocado detrás del logo. En el encabezado (fondo `primary`, dinámico por
taller) siempre se pasa `fondo=_color_a_rgb(C["primary"])`; en el pie de
página (fondo blanco fijo) se usa el valor por defecto.

## 5. Valores por defecto cuando falta información

- Nombre de la empresa vacío → `"Tu Taller"` (nunca un nombre de empresa real
  hardcodeado — antes decía "Mármoles Collante & Castro Ltda").
- Inclusiones y exclusiones ambas vacías → la sección completa se omite, no
  se imprime con placeholders vacíos.
- Cuenta de cobro: el nombre del prestador sigue la misma regla que el
  encabezado (`"Tu Taller"` si no está configurado) — nunca queda en blanco.
