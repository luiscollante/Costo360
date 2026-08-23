# generador_pdf.py — Costo360 Motor PDF
#
# ARQUITECTURA v10 (Balance Premium):
#   - Sistema de espaciado jerárquico: _SP_SECCION=10, _SP_BLOQUE=4, _SP_HEADER=3
#   - Tipografía con contraste por nivel: sec=10pt bold, label=9pt bold, body=9pt, nota=8pt
#   - Leading = fontSize + 2 en todos los estilos (respira sin inflar)
#   - Padding por nivel: _PAD_HDR=6, _PAD_DATA=5, _PAD_NOTA=4, _PAD_FIRMA=10
#   - Borde dorado 3pt encima de fila TOTAL — máxima jerarquía visual
#   - KeepTogether SOLO en Resumen Financiero (tabla+letras) y Firma
#   - T&C numerado con leading=12 para escaneo fácil
#   - Cierre de contrato: línea superior 2pt + celdas generosas
#   - Flujo: Encabezado→Cliente→Adicionales→Despiece→Resumen(KT)→Alcance→T&C→Firma(KT)→Footer

import io
import os
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from PIL import Image as PILImage

_BOG = ZoneInfo("America/Bogota")

def _hoy() -> date:
    return datetime.now(_BOG).date()

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle

# ── Ancho maestro del documento ───────────────────────────────────────────────
ancho_util = 16.5 * cm
_AU = ancho_util
_margen_lateral = (letter[0] - _AU) / 2.0

# ── Constantes globales de columnas ──────────────────────────────────────────
COL_2_30_70   = [_AU * 0.301, _AU * 0.699]
COL_2_75_25   = [_AU * 0.753, _AU * 0.247]
COL_2_50_50   = [_AU * 0.50,  _AU * 0.50]
COL_5_STD     = [_AU * 0.06, _AU * 0.38, _AU * 0.20, _AU * 0.20, _AU * 0.16]
COL_ENCAB     = [_AU * 0.588, _AU * 0.412]
COL_FIRMA_CC  = [_AU * 0.482, _AU * 0.090, _AU * 0.428]
COL_FIRMA_CLI = [_AU * 0.314, _AU * 0.686]
COL_AIU_3     = [_AU * 0.633, _AU * 0.121, _AU * 0.247]
COL_AIU_5     = [_AU * 0.430, _AU * 0.100, _AU * 0.104, _AU * 0.183, _AU * 0.183]

# ── Sistema de espaciado jerárquico ──────────────────────────────────────────
_SP_SECCION = 10   # Entre secciones mayores
_SP_BLOQUE  = 4    # Dentro de un bloque
_SP_HEADER  = 3    # Spacer interior del _seccion_header

# ── Sistema de padding por nivel ─────────────────────────────────────────────
_PAD_HDR   = 6    # Cabeceras de tabla (fila 0 con fondo oscuro)
_PAD_DATA  = 5    # Filas de datos
_PAD_NOTA  = 4    # Tablas de notas / avisos
_PAD_FIRMA = 10   # Celdas de firma (altura escribible)

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, KeepTogether, PageBreak,
)
from reportlab.lib.utils import ImageReader
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from calculos import cop

# ── Paleta corporativa — Verde Oscuro + Dorado ───────────────────────────────
_DEFAULT_PALETTE = {
    "header_dark": "#07100D",   # Fondo oscuro principal
    "primary":     "#07100D",   # Fondo principal
    "secondary":   "#11291E",   # Fondo de superficie / acentos oscuros
    "accent":      "#D4AF37",   # Dorado de marca — énfasis máximo
    "light":       "#E8F0EB",   # Texto claro
    "ultralight":  "#F4F7F5",   # Para cebras
    "zebra_a":     "#FFFFFF",
    "zebra_b":     "#F4F7F5",
    "total_bg":    "#07100D",   # Verde oscuro para fila TOTAL
    "anticipo_bg": "#11291E",   # Verde medio para anticipo
    "gray":        "#7F9489",   # Gris con tinte verde
    "text":        "#07100D",   # Texto principal
    "white":       "#FFFFFF",
    "terms_text":  "#2C3E35",
    "border":      "#A3B5AC",   # Borde verde claro
}

_LOGO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logo_corporativo.png")
_LOGO_COSTO360_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logo_costo360.png")


# ── Utilidades ────────────────────────────────────────────────────────────────

def _cargar_logo_corporativo():
    try:
        with open(_LOGO_PATH, "rb") as f:
            return f.read()
    except Exception:
        return None


def _extraer_paleta_logo(logo_bytes):
    # En Costo360 se obliga el uso de la paleta oficial (Verde Oscuro y Dorado)
    # sin importar los colores del logo de la empresa para mantener la marca.
    return _DEFAULT_PALETTE.copy()


def _C(palette):
    return {k: colors.HexColor(v) for k, v in palette.items()}


def _num(valor):
    return f"${int(round(valor)):,}".replace(",", ".")


def _fecha_es():
    f = _hoy()
    meses = ["enero","febrero","marzo","abril","mayo","junio",
             "julio","agosto","septiembre","octubre","noviembre","diciembre"]
    return f"{f.day} de {meses[f.month-1]} de {f.year}"


def _fecha_hasta(dias):
    f = _hoy() + timedelta(days=int(dias))
    return f.strftime("%d/%m/%Y")


def _logo_img(logo_bytes, max_h=1.4*cm):
    if not logo_bytes:
        return None
    try:
        pil_img = PILImage.open(io.BytesIO(logo_bytes))
        _tiene_alpha = (
            pil_img.mode in ("RGBA", "LA") or
            (pil_img.mode == "P" and "transparency" in pil_img.info)
        )
        if _tiene_alpha:
            pil_rgba = pil_img.convert("RGBA")
            fondo_blanco = PILImage.new("RGB", pil_rgba.size, (255, 255, 255))
            fondo_blanco.paste(pil_rgba, mask=pil_rgba.split()[3])
            pil_clean = fondo_blanco
        else:
            pil_clean = pil_img.convert("RGB")
        clean_io = io.BytesIO()
        pil_clean.save(clean_io, format="JPEG", quality=95)
        clean_io.seek(0)
        img = Image(clean_io, width=4.2*cm, height=1.6*cm, kind='proportional')
        ratio = img.imageWidth / img.imageHeight
        img.drawWidth  = max_h * ratio
        img.drawHeight = max_h
        return img
    except Exception:
        return None


# ── Estilos tipográficos — Sistema Premium con contraste por nivel ────────────
# leading = fontSize + 2 en todos los estilos
# NIVEL 1 — Títulos de sección : 10pt bold  / secondary blue
# NIVEL 2 — Labels / subtítulos: 9pt bold
# NIVEL 3 — Cuerpo             : 9pt regular
# NIVEL 4 — Notas / pie        : 8pt

def _estilos(C):
    return {
        # ── Encabezado corporativo ─────────────────────────────────────────────
        "doc_empresa": ParagraphStyle("doc_empresa", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["white"]),
        "doc_emp_sub": ParagraphStyle("doc_emp_sub", fontSize=7.5, fontName="Helvetica",
                                       leading=10, textColor=C["light"]),
        "doc_num":     ParagraphStyle("doc_num", fontSize=14, fontName="Helvetica-Bold",
                                       leading=17, textColor=C["white"], alignment=TA_RIGHT),
        "doc_validez": ParagraphStyle("doc_validez", fontSize=7.5, fontName="Helvetica-Bold",
                                       leading=10, textColor=C["accent"], alignment=TA_RIGHT),

        # ── NIVEL 1: Títulos de sección ───────────────────────────────────────
        "seccion":     ParagraphStyle("seccion", fontSize=10, fontName="Helvetica-Bold",
                                       leading=12, textColor=C["secondary"], letterSpacing=1.2),

        # ── NIVEL 2: Labels / subtítulos ──────────────────────────────────────
        "cell_b":      ParagraphStyle("cell_b", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["text"]),
        "cell_br":     ParagraphStyle("cell_br", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["text"], alignment=TA_RIGHT),
        "th":          ParagraphStyle("th", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["white"]),
        "th_r":        ParagraphStyle("th_r", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["white"], alignment=TA_RIGHT),
        "th_c":        ParagraphStyle("th_c", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["white"], alignment=TA_CENTER),
        "subtotal_l":  ParagraphStyle("subtotal_l", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["text"]),
        "subtotal_v":  ParagraphStyle("subtotal_v", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["text"], alignment=TA_RIGHT),
        "anticipo_l":  ParagraphStyle("anticipo_l", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["accent"]),
        "anticipo_v":  ParagraphStyle("anticipo_v", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["accent"], alignment=TA_RIGHT),

        # ── NIVEL 3: Cuerpo ───────────────────────────────────────────────────
        "cell":        ParagraphStyle("cell", fontSize=9, fontName="Helvetica",
                                       leading=11, textColor=C["text"]),
        "cell_r":      ParagraphStyle("cell_r", fontSize=9, fontName="Helvetica",
                                       leading=11, textColor=C["text"], alignment=TA_RIGHT),
        "cell_c":      ParagraphStyle("cell_c", fontSize=9, fontName="Helvetica",
                                       leading=11, textColor=C["text"], alignment=TA_CENTER),
        "iva_l":       ParagraphStyle("iva_l", fontSize=9, fontName="Helvetica-Oblique",
                                       leading=11, textColor=C["secondary"]),
        "iva_v":       ParagraphStyle("iva_v", fontSize=9, fontName="Helvetica-Oblique",
                                       leading=11, textColor=C["secondary"], alignment=TA_RIGHT),

        # ── TOTAL: máxima jerarquía visual ────────────────────────────────────
        "total_label": ParagraphStyle("total_label", fontSize=11, fontName="Helvetica-Bold",
                                       leading=14, textColor=C["white"], letterSpacing=1.0),
        "total_val":   ParagraphStyle("total_val", fontSize=11, fontName="Helvetica-Bold",
                                       leading=14, textColor=C["white"], alignment=TA_RIGHT),
        "letras":      ParagraphStyle("letras", fontSize=8, fontName="Helvetica-Bold",
                                       leading=10, textColor=C["white"]),

        # ── NIVEL 4: Notas / pie ──────────────────────────────────────────────
        "footer":      ParagraphStyle("footer", fontSize=6.5, fontName="Helvetica",
                                       leading=8, textColor=C["gray"], alignment=TA_CENTER),
        "aviso":       ParagraphStyle("aviso", fontSize=8, fontName="Helvetica",
                                       leading=10, textColor=C["text"]),
        "nota_legal":  ParagraphStyle("nota_legal", fontSize=8, fontName="Helvetica-Oblique",
                                       leading=10, textColor=C["terms_text"]),
        "terms_title": ParagraphStyle("terms_title", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["secondary"]),
        "terms_body":  ParagraphStyle("terms_body", fontSize=8.5, fontName="Helvetica",
                                       leading=12, textColor=C["terms_text"]),
        "inc_hdr":     ParagraphStyle("inc_hdr", fontSize=8.5, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["white"]),
        "inc_row":     ParagraphStyle("inc_row", fontSize=8.5, fontName="Helvetica",
                                       leading=11, textColor=C["text"],
                                       leftIndent=14, firstLineIndent=-14),
        "white_s":     ParagraphStyle("white_s", fontSize=8.5, fontName="Helvetica",
                                       leading=11, textColor=C["white"]),
        "accent_s":    ParagraphStyle("accent_s", fontSize=8.5, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["accent"]),
        "firma_titulo":ParagraphStyle("firma_titulo", fontSize=9, fontName="Helvetica-Bold",
                                       leading=11, textColor=C["text"]),
        "firma_campo": ParagraphStyle("firma_campo", fontSize=8.5, fontName="Helvetica",
                                       leading=11, textColor=C["text"]),

        # ── Matriz inclusiones/exclusiones ────────────────────────────────────
        "matriz_inc":     ParagraphStyle("matriz_inc", fontSize=8.5, fontName="Helvetica-Bold",
                                          leading=11, textColor=colors.HexColor("#FFFFFF"),
                                          alignment=TA_CENTER, spaceAfter=0),
        "matriz_exc":     ParagraphStyle("matriz_exc", fontSize=8.5, fontName="Helvetica-Bold",
                                          leading=11, textColor=colors.HexColor("#FFFFFF"),
                                          alignment=TA_CENTER, spaceAfter=0),
        "matriz_inc_row": ParagraphStyle("matriz_inc_row", fontSize=8.5, fontName="Helvetica",
                                          leading=11, textColor=C["text"],
                                          leftIndent=0, firstLineIndent=0, spaceAfter=0),
        "matriz_exc_row": ParagraphStyle("matriz_exc_row", fontSize=8.5, fontName="Helvetica",
                                          leading=11, textColor=C["text"],
                                          leftIndent=0, firstLineIndent=0, spaceAfter=0),
        "resumen_ia":     ParagraphStyle("resumen_ia", fontSize=10, fontName="Helvetica-Oblique",
                                          leading=14, textColor=C["text"],
                                          leftIndent=15, rightIndent=15, spaceBefore=4, spaceAfter=4),
    }


# ── Bloques reutilizables ─────────────────────────────────────────────────────

def _seccion_header(titulo, E):
    return [
        HRFlowable(width="100%", thickness=0.4, color=colors.HexColor(_DEFAULT_PALETTE["border"])),
        Spacer(1, _SP_HEADER),
        Paragraph(titulo.upper(), E["seccion"]),
        HRFlowable(width="40%", thickness=1.5, color=colors.HexColor(_DEFAULT_PALETTE["accent"]), spaceAfter=0),
        Spacer(1, _SP_HEADER),
    ]


def _encabezado_doc(E, C, doc_type, numero, fecha_str, empresa_info, logo_bytes, valido_hasta=None):
    emp = empresa_info or {}
    _lb = logo_bytes or _cargar_logo_corporativo()
    logo_img = _logo_img(_lb, max_h=1.4*cm)

    izq = []
    if logo_img:
        izq.append(logo_img)
        izq.append(Spacer(1, 4))
    izq.append(Paragraph(emp.get("nombre") or "Mármoles Collante & Castro Ltda", E["doc_empresa"]))
    if emp.get("nit"):
        izq.append(Paragraph(emp["nit"], E["doc_emp_sub"]))
    if emp.get("tel") and emp.get("email"):
        izq.append(Paragraph(f"{emp['tel']}  ·  {emp['email']}", E["doc_emp_sub"]))
    elif emp.get("tel"):
        izq.append(Paragraph(emp["tel"], E["doc_emp_sub"]))
    if emp.get("ciudad"):
        izq.append(Paragraph(emp["ciudad"], E["doc_emp_sub"]))

    logo_c360_bytes = None
    try:
        with open(_LOGO_COSTO360_PATH, "rb") as f:
            logo_c360_bytes = f.read()
    except Exception:
        pass
    logo_c360 = _logo_img(logo_c360_bytes, max_h=0.9*cm) if logo_c360_bytes else None

    der = []
    if logo_c360:
        der.append(logo_c360)
        der.append(Spacer(1, 4))

    der.extend([
        Paragraph(doc_type,
            ParagraphStyle("dt", fontSize=7.5, fontName="Helvetica-Bold",
                           leading=10, textColor=C["accent"], alignment=TA_RIGHT)),
        Spacer(1, 4),
        Paragraph(f"<b>{numero}</b>", E["doc_num"]),
        Spacer(1, 3),
        Paragraph(fecha_str,
            ParagraphStyle("fch", fontSize=7.5, fontName="Helvetica",
                           leading=10, textColor=C["light"], alignment=TA_RIGHT)),
    ])
    if emp.get("email"):
        der.append(Paragraph(emp["email"],
            ParagraphStyle("em2", fontSize=6.5, fontName="Helvetica",
                           leading=9, textColor=C["light"], alignment=TA_RIGHT)))
    if valido_hasta:
        der.append(Spacer(1, 4))
        der.append(Paragraph(f"Válida hasta: {valido_hasta}", E["doc_validez"]))

    tbl = Table([[izq, der]], colWidths=COL_ENCAB)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C["primary"]),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (0,-1),  16),
        ("RIGHTPADDING",  (-1,0),(-1,-1), 16),
        ("LEFTPADDING",   (-1,0),(-1,-1), 10),
        ("LINEABOVE",     (0,0), (-1, 0), 4.0, C["accent"]),
        ("LINEBELOW",     (0,0), (-1,-1), 2.0, C["accent"]),
    ]))
    return tbl


def _tabla_datos_cliente(E, C, filas_datos):
    _lbl_style = ParagraphStyle("_lbl_dc", fontSize=8.5, fontName="Helvetica",
                                 leading=11, textColor=C["gray"])
    rows = []
    for label, valor in filas_datos:
        rows.append([Paragraph(label, _lbl_style), Paragraph(f"<b>{valor}</b>", E["cell_b"])])
    tbl = Table(rows, colWidths=COL_2_30_70, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [C["zebra_a"], C["zebra_b"]]),
        ("TOPPADDING",     (0,0), (-1,-1), _PAD_DATA),
        ("BOTTOMPADDING",  (0,0), (-1,-1), _PAD_DATA),
        ("LEFTPADDING",    (0,0), (-1,-1), 10),
        ("RIGHTPADDING",   (0,0), (-1,-1), 10),
        ("LINEBELOW",      (0,0), (-1,-1), 0.3, C["border"]),
        ("BOX",            (0,0), (-1,-1), 0.5, C["border"]),
    ]))
    return tbl


def _tabla_2col(E, C, filas_datos):
    return _tabla_datos_cliente(E, C, filas_datos)


def _footer_doc(E, C, emp_nombre, fecha_str, numero="", ciudad=""):
    _ciudad_str = ciudad.strip() if ciudad and ciudad.strip() else ""
    _sep_ciudad = f"{_ciudad_str}  •  " if _ciudad_str else ""
    linea = (
        f"{emp_nombre or 'Mármoles Collante & Castro Ltda'}  |  "
        f"{_sep_ciudad}{fecha_str}"
    )
    _footer_style = ParagraphStyle(
        "footer_premium", fontSize=6.5, fontName="Helvetica-Bold",
        leading=8, textColor=C["gray"], alignment=TA_LEFT,
        letterSpacing=0.3,
    )
    _marca_style = ParagraphStyle(
        "marca_costo360", fontSize=6.5, fontName="Helvetica",
        leading=8, textColor=C["gray"], alignment=TA_RIGHT,
    )
    
    logo_bytes = None
    try:
        with open(_LOGO_COSTO360_PATH, "rb") as f:
            logo_bytes = f.read()
    except Exception:
        pass
    
    logo_c360 = _logo_img(logo_bytes, max_h=0.45*cm) if logo_bytes else ""
    
    izq = Paragraph(linea, _footer_style)
    
    der_items = []
    if logo_c360:
        # Align logo to the right by wrapping it in a table
        tbl_logo = Table([[Paragraph("Generado por", _marca_style), logo_c360]], colWidths=[2*cm, 2.5*cm])
        tbl_logo.setStyle(TableStyle([
            ("ALIGN", (0,0), (-1,-1), "RIGHT"),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("LEFTPADDING", (0,0), (-1,-1), 0),
            ("RIGHTPADDING", (0,0), (-1,-1), 0),
            ("BOTTOMPADDING", (0,0), (-1,-1), 0),
            ("TOPPADDING", (0,0), (-1,-1), 0),
        ]))
        der = tbl_logo
    else:
        der = Paragraph("Generado por Costo360", _marca_style)

    tbl = Table([[izq, der]], colWidths=[_AU * 0.60, _AU * 0.40])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 0),
    ]))

    return [
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=0.5, color=C["border"]),
        Spacer(1, 4),
        tbl,
    ]


# ── Módulo: Despiece Técnico ──────────────────────────────────────────────────

def _seccion_despiece_tecnico(E, C, r, incluir_iva, anticipo_pct, precio_sugerido_total):
    story = []
    story += _seccion_header("Despiece Técnico y Elementos del Proyecto", E)

    piezas = r.get("_estado_guardado", {}).get("piezas", [])
    _cat_mat  = r.get("categoria", "")
    _ref_mat  = r.get("referencia", "")
    _nombres_mat = (f"{_cat_mat} {_ref_mat}".strip()
                    if _ref_mat and _ref_mat.strip()
                    else (_cat_mat.strip() or "Material"))

    hdr = [
        Paragraph("Nº", E["th_c"]),
        Paragraph("ÍTEM", E["th"]),
        Paragraph("CANTIDAD", E["th_c"]),
        Paragraph("PRECIO UNITARIO", E["th_r"]),
        Paragraph("SUBTOTAL", E["th_r"]),
    ]
    filas = [hdr]

    if piezas:
        total_m2 = sum(p.get("ml", 1) * p.get("ancho_custom", 0.60) for p in piezas)
        for idx_p, p in enumerate(piezas, start=1):
            _ml_efectivo = p.get("ml", 1)
            _ml_unit     = p.get("ml_unitario", _ml_efectivo)
            _cantidad    = int(p.get("cantidad", 1))
            _ancho       = float(p.get("ancho_custom", 0.60))
            _m2_calc     = _ml_efectivo * _ancho
            m2_p         = _m2_calc if _m2_calc > 0 else _ml_efectivo * _ancho
            prop         = (m2_p / total_m2) if total_m2 > 0 else (1 / len(piezas))
            precio_p     = precio_sugerido_total * prop
            _tipo_pieza  = p.get("ancho_tipo", "").lower()
            _es_area_p   = any(kw in _tipo_pieza for kw in ("piso", "fachada", "revestimiento"))
            if _es_area_p:
                _cant_unid_str = f"{m2_p:.2f}&nbsp;m²&nbsp;({_cantidad}&nbsp;unid.)"
                _qty_base  = m2_p
            else:
                _cant_unid_str = f"{_ml_efectivo:.2f}&nbsp;ml&nbsp;({_cantidad}&nbsp;unid.)"
                _qty_base  = _ml_efectivo
            pu = precio_p / _qty_base if _qty_base > 0 else 0
            _desc_enriq = f"<b>{p.get('nombre', '—')}</b><br/><font size='7.5' color='#6B85A0'>Material: {_nombres_mat}</font>"
            filas.append([
                Paragraph(str(idx_p),          E["cell_c"]),
                Paragraph(_desc_enriq,         E["cell"]),
                Paragraph(_cant_unid_str,      E["cell_c"]),
                Paragraph(_num(pu),            E["cell_r"]),
                Paragraph(_num(precio_p),      E["cell_br"]),
            ])
    else:
        ref_txt = r.get("referencia", r.get("categoria", ""))
        filas.append([
            Paragraph("1",   E["cell_c"]),
            Paragraph(f"{r.get('tipo_proyecto', 'Proyecto')} — {ref_txt}", E["cell"]),
            Paragraph("1 glb", E["cell_c"]),
            Paragraph(_num(precio_sugerido_total), E["cell_r"]),
            Paragraph(_num(precio_sugerido_total), E["cell_br"]),
        ])

    tbl = Table(filas, colWidths=COL_5_STD, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  C["header_dark"]),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [C["zebra_a"], C["zebra_b"]]),
        ("TOPPADDING",    (0,0), (-1,0),  _PAD_HDR),
        ("BOTTOMPADDING", (0,0), (-1,0),  _PAD_HDR),
        ("TOPPADDING",    (0,1), (-1,-1), _PAD_DATA),
        ("BOTTOMPADDING", (0,1), (-1,-1), _PAD_DATA),
        ("LEFTPADDING",   (0,0), (-1,-1), 4),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("LINEBELOW",     (0,0), (-1,-1), 0.3, C["border"]),
        ("BOX",           (0,0), (-1,-1), 0.5, C["border"]),
    ]))
    story.append(tbl)

    nota_atodocosto = "Nota: Incluye el suministro del material pétreo, mano de obra especializada de corte e instalación, insumos técnicos, herramientas y logística de transporte."
    story.append(Table(
        [[Paragraph(nota_atodocosto, E["nota_legal"])]],
        colWidths=[_AU],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#F7F9FC")),
            ("LEFTPADDING",   (0,0),(-1,-1), 10), ("RIGHTPADDING",(0,0),(-1,-1),10),
            ("TOPPADDING",    (0,0),(-1,-1), _PAD_NOTA), ("BOTTOMPADDING",(0,0),(-1,-1),_PAD_NOTA),
            ("LINEABOVE",     (0,0),(-1, 0), 0.5, colors.HexColor("#6B85A0")),
            ("BOX",           (0,0),(-1,-1), 0.4, colors.HexColor("#C8D8E8")),
        ])
    ))
    return story


def _seccion_adicionales_alcance(E, C, adicionales_detalle, c7_adicionales):
    story = []
    story += _seccion_header("Alcance del Proyecto: Servicios Adicionales", E)

    _s_hdr    = ParagraphStyle("aaic_hdr", fontSize=9, fontName="Helvetica-Bold",
                                leading=11, textColor=C["secondary"])
    _s_item   = ParagraphStyle("aaic_item", fontSize=9, fontName="Helvetica",
                                leading=11, textColor=C["text"])
    _s_val    = ParagraphStyle("aaic_val",  fontSize=9, fontName="Helvetica-Bold",
                                leading=11, textColor=C["secondary"], alignment=TA_RIGHT)
    _s_tot_l  = ParagraphStyle("aaic_tot_l", fontSize=9, fontName="Helvetica-Bold",
                                leading=11, textColor=C["secondary"])
    _s_tot_v  = ParagraphStyle("aaic_tot_v", fontSize=9, fontName="Helvetica-Bold",
                                leading=11, textColor=C["secondary"], alignment=TA_RIGHT)
    _s_vhdr   = ParagraphStyle("aaic_vhdr", fontSize=9, fontName="Helvetica-Bold",
                                leading=11, textColor=C["secondary"], alignment=TA_RIGHT)
    _s_vacio  = ParagraphStyle("aaic_vacio", fontSize=9, fontName="Helvetica-Oblique",
                                leading=11, textColor=colors.HexColor("#6B85A0"))

    filas_aa = [[Paragraph("SERVICIO / ELEMENTO ADICIONAL", _s_hdr), Paragraph("VALOR", _s_vhdr)]]
    _items_con_valor = []
    if adicionales_detalle:
        for item in adicionales_detalle:
            nombre = (item.get("concepto") or item.get("nombre") or "").strip() or "Servicio adicional"
            valor = float(item.get("valor", 0) or 0)
            if valor > 0:
                _items_con_valor.append((nombre, valor))
                filas_aa.append([Paragraph(f"✔  {nombre}", _s_item), Paragraph(_num(valor), _s_val)])

    if not _items_con_valor:
        filas_aa.append([Paragraph("No se seleccionaron servicios adicionales.", _s_vacio), Paragraph("—", _s_val)])
        c7_adicionales = 0.0
    if _items_con_valor and c7_adicionales and c7_adicionales > 0:
        filas_aa.append([Paragraph("Total servicios adicionales", _s_tot_l), Paragraph(_num(c7_adicionales), _s_tot_v)])

    tbl_aa = Table(filas_aa, colWidths=COL_2_75_25)
    tbl_aa.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0),  (-1, 0),  colors.HexColor("#EBF3FB")),
        ("ROWBACKGROUNDS",(0, 1),  (-1,-2),  [colors.HexColor("#F7FAFD"), colors.HexColor("#FFFFFF")]),
        ("BACKGROUND",    (0,-1),  (-1,-1),  colors.HexColor("#EBF3FB")),
        ("LINEABOVE",     (0, 0),  (-1, 0),  1.5, C["secondary"]),
        ("LINEBELOW",     (0,-1),  (-1,-1),  1.5, C["secondary"]),
        ("LINEBELOW",     (0, 0),  (-1,-2),  0.3, colors.HexColor("#C8D8E8")),
        ("TOPPADDING",    (0, 0),  (-1, 0),  _PAD_HDR), ("BOTTOMPADDING",(0,0),(-1,0),_PAD_HDR),
        ("TOPPADDING",    (0, 1),  (-1,-1),  _PAD_DATA), ("BOTTOMPADDING",(0,1),(-1,-1),_PAD_DATA),
        ("LEFTPADDING",   (0, 0),  (-1,-1),  10), ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("VALIGN",        (0, 0),  (-1,-1),  "MIDDLE"),
        ("BOX",           (0, 0),  (-1,-1),  0.5, colors.HexColor("#C8D8E8")),
    ]))
    story.append(tbl_aa)
    return story


def _seccion_resumen_financiero(E, C, precio_sugerido_total, anticipo_pct, incluir_iva,
                                 c7_adicionales=0.0, adicionales_detalle=None):
    story = []
    story += _seccion_header("Resumen Financiero", E)

    _s_adic_l = ParagraphStyle("adic_l", fontSize=9, fontName="Helvetica-Bold",
                                leading=11, textColor=C["secondary"])
    _s_adic_v = ParagraphStyle("adic_v", fontSize=9, fontName="Helvetica-Bold",
                                leading=11, textColor=C["secondary"], alignment=TA_RIGHT)
    _tiene_adicionales = c7_adicionales and c7_adicionales > 0
    filas_fin = []

    if incluir_iva:
        iva_val          = precio_sugerido_total * 0.19
        precio_final_doc = precio_sugerido_total + iva_val
        anticipo_val     = precio_final_doc * (anticipo_pct / 100)
        saldo_val        = precio_final_doc - anticipo_val

        filas_fin.append([Paragraph("Subtotal", E["cell_b"]), Paragraph(_num(precio_sugerido_total), E["cell_br"])])
        if _tiene_adicionales:
            filas_fin.append([Paragraph("Costos Adicionales", _s_adic_l), Paragraph(_num(c7_adicionales), _s_adic_v)])
        filas_fin.append([Paragraph("IVA 19%", E["iva_l"]), Paragraph(_num(iva_val), E["iva_v"])])
        filas_fin.append([Paragraph(f"ANTICIPO A PAGAR ({anticipo_pct}% del total)", E["anticipo_l"]), Paragraph(_num(anticipo_val), E["anticipo_v"])])
        filas_fin.append([
            Paragraph(f"Saldo contra entrega ({100-anticipo_pct}%)",
                ParagraphStyle("sld",fontSize=8,fontName="Helvetica",leading=10,textColor=C["gray"])),
            Paragraph(_num(saldo_val),
                ParagraphStyle("sldv",fontSize=8,fontName="Helvetica",leading=10,textColor=C["gray"],alignment=TA_RIGHT)),
        ])
        filas_fin.append([Paragraph("TOTAL", E["total_label"]), Paragraph(_num(precio_final_doc), E["total_val"])])
    else:
        precio_final_doc = precio_sugerido_total
        anticipo_val     = precio_final_doc * (anticipo_pct / 100)
        saldo_val        = precio_final_doc - anticipo_val

        filas_fin.append([Paragraph("Subtotal", E["subtotal_l"]), Paragraph(_num(precio_final_doc), E["subtotal_v"])])
        if _tiene_adicionales:
            filas_fin.append([Paragraph("Costos Adicionales", _s_adic_l), Paragraph(_num(c7_adicionales), _s_adic_v)])
        filas_fin.append([Paragraph(f"ANTICIPO A PAGAR ({anticipo_pct}% del total)", E["anticipo_l"]), Paragraph(_num(anticipo_val), E["anticipo_v"])])
        filas_fin.append([
            Paragraph(f"Saldo contra entrega ({100-anticipo_pct}%)",
                ParagraphStyle("sld2",fontSize=8,fontName="Helvetica",leading=10,textColor=C["gray"])),
            Paragraph(_num(saldo_val),
                ParagraphStyle("sldv2",fontSize=8,fontName="Helvetica",leading=10,textColor=C["gray"],alignment=TA_RIGHT)),
        ])
        filas_fin.append([Paragraph("TOTAL (SIN IVA)", E["total_label"]), Paragraph(_num(precio_final_doc), E["total_val"])])

    _n_filas = len(filas_fin)
    idx_ant  = _n_filas - 3
    idx_tot  = _n_filas - 1

    _adic_styles = []
    if _tiene_adicionales:
        _adic_styles = [
            ("BACKGROUND", (0,1),(-1,1), colors.HexColor("#EBF3FB")),
            ("LINEABOVE",  (0,1),(-1,1), 1.2, C["secondary"]),
            ("LINEBELOW",  (0,1),(-1,1), 1.2, C["secondary"]),
        ]

    tbl_fin = Table(filas_fin, colWidths=COL_2_75_25)
    tbl_fin.setStyle(TableStyle(
        _adic_styles + [
        ("ROWBACKGROUNDS", (0,0), (-1,idx_ant-1), [C["zebra_a"], C["zebra_b"]]),
        ("BACKGROUND",     (0,idx_ant), (-1,idx_ant), C["anticipo_bg"]),
        ("BACKGROUND",     (0,idx_tot), (-1,idx_tot), C["total_bg"]),
        ("LINEABOVE",      (0,idx_tot), (-1,idx_tot), 3.0, C["accent"]),
        ("TOPPADDING",     (0,0), (-1,idx_tot-1), _PAD_DATA),
        ("BOTTOMPADDING",  (0,0), (-1,idx_tot-1), _PAD_DATA),
        ("TOPPADDING",     (0,idx_tot), (-1,idx_tot), 8),
        ("BOTTOMPADDING",  (0,idx_tot), (-1,idx_tot), 8),
        ("LEFTPADDING",    (0,0), (-1,-1), 10),
        ("RIGHTPADDING",   (0,0), (-1,-1), 10),
        ("VALIGN",         (0,0), (-1,-1), "MIDDLE"),
        ("BOX",            (0,0), (-1,-1), 1.0, C["border"]),
        ("LINEBELOW",      (0,0), (-1,-2), 0.3, C["border"]),
    ]))
    story.append(tbl_fin)
    return story, precio_final_doc, anticipo_val


# ── Módulo: Matriz Dinámica de Inclusiones / Exclusiones ────────────────────

def _seccion_alcance(E, C, inclusiones=None, exclusiones=None):
    _inc = inclusiones if inclusiones is not None else []
    _exc = exclusiones if exclusiones is not None else []

    # ── Paleta corporativa: azul primario para inclusiones, gris plomo para exclusiones ──
    _INC_HDR = C["secondary"]   # Azul corporativo
    _EXC_HDR = colors.HexColor("#6B85A0")   # Gris plomo elegante (sin rastro de rojo)
    _ZEBRA_INC = colors.HexColor("#F0F5FB") # Azul ultralight para filas pares de inclusión
    _ZEBRA_EXC = colors.HexColor("#F4F6F8") # Gris ultralight para filas pares de exclusión
    _GRID    = colors.HexColor("#D8E4EF")
    _WHITE   = colors.HexColor("#FFFFFF")
    _CONTENT_BG = colors.HexColor("#F8F9FA") # Fondo de contenido: gris casi blanco

    _S_TIT = ParagraphStyle("_alcance_tit", fontSize=9, fontName="Helvetica-Bold",
                             leading=11, textColor=colors.HexColor("#FFFFFF"),
                             alignment=TA_CENTER, spaceAfter=0, spaceBefore=0)
    _S_HDR_INC = ParagraphStyle("_mhdr_inc", fontSize=9, fontName="Helvetica-Bold",
                                 leading=11, textColor=colors.HexColor("#FFFFFF"),
                                 alignment=TA_CENTER, spaceAfter=0, spaceBefore=0)
    _S_HDR_EXC = ParagraphStyle("_mhdr_exc", fontSize=9, fontName="Helvetica-Bold",
                                 leading=11, textColor=colors.HexColor("#FFFFFF"),
                                 alignment=TA_CENTER, spaceAfter=0, spaceBefore=0)
    _S_INC = ParagraphStyle("_minc", fontSize=8.5, fontName="Helvetica",
                             leading=11, textColor=C["secondary"],
                             leftIndent=0, firstLineIndent=0, spaceAfter=0, spaceBefore=0, wordWrap="LTR")
    _S_EXC = ParagraphStyle("_mexc", fontSize=8.5, fontName="Helvetica",
                             leading=11, textColor=C["terms_text"],
                             leftIndent=0, firstLineIndent=0, spaceAfter=0, spaceBefore=0, wordWrap="LTR")
    _S_EMPTY = ParagraphStyle("_mempty", fontSize=8.5, fontName="Helvetica",
                               leading=11, textColor=colors.HexColor("#FFFFFF"),
                               spaceAfter=0, spaceBefore=0)

    _tbl_tit = Table([[Paragraph("ALCANCE DE LA PROPUESTA — INCLUSIONES Y EXCLUSIONES", _S_TIT)]], colWidths=[_AU])
    _tbl_tit.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#0C1B3A")),
        ("TOPPADDING",    (0,0),(-1,-1), _PAD_HDR), ("BOTTOMPADDING",(0,0),(-1,-1),_PAD_HDR),
        ("LEFTPADDING",   (0,0),(-1,-1), 10), ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("LINEBELOW",     (0,0),(-1,-1), 2.0, C["accent"]),
    ]))

    rows = [[Paragraph("☑  ALCANCE INCLUIDO", _S_HDR_INC), Paragraph("☒  EXCLUSIONES DEL CONTRATO", _S_HDR_EXC)]]
    _inc_items = _inc if _inc else ["--"]
    _exc_items = _exc if _exc else ["--"]
    for _i in range(max(len(_inc_items), len(_exc_items))):
        _txt_inc = _inc_items[_i] if _i < len(_inc_items) else ""
        _txt_exc = _exc_items[_i] if _i < len(_exc_items) else ""
        rows.append([
            Paragraph(f"☑  {_txt_inc}", _S_INC) if _txt_inc else Paragraph("", _S_EMPTY),
            Paragraph(f"☒  {_txt_exc}", _S_EXC) if _txt_exc else Paragraph("", _S_EMPTY),
        ])

    tbl_al = Table(rows, colWidths=COL_2_50_50, repeatRows=1)
    _ts = [
        # Encabezados con paleta corporativa
        ("BACKGROUND",     (0,0),(0,0),  _INC_HDR),
        ("BACKGROUND",     (1,0),(1,0),  _EXC_HDR),
        ("VALIGN",         (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",     (0,0),(-1, 0), _PAD_HDR), ("BOTTOMPADDING",(0,0),(-1,0),_PAD_HDR),
        ("TOPPADDING",     (0,1),(-1,-1), _PAD_DATA), ("BOTTOMPADDING",(0,1),(-1,-1),_PAD_DATA),
        ("LEFTPADDING",    (0,0),(-1,-1), 10), ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("GRID",           (0,0),(-1,-1), 0.4, _GRID),
        ("BOX",            (0,0),(-1,-1), 1.2, C["secondary"]),
        ("LINEBEFORE",     (1,0),(1,-1),  0.8, _GRID),
        # Fondo de contenido: gris casi blanco para limpieza visual
        ("ROWBACKGROUNDS", (0,1),(-1,-1), [_CONTENT_BG, _WHITE]),
    ]
    # Zebra diferenciada por columna en filas pares
    for _ri in range(1, len(rows)):
        if _ri % 2 == 0:
            _ts.append(("BACKGROUND", (0,_ri),(0,_ri), _ZEBRA_INC))
            _ts.append(("BACKGROUND", (1,_ri),(1,_ri), _ZEBRA_EXC))
    tbl_al.setStyle(TableStyle(_ts))

    # ── BLINDAJE ABSOLUTO CONTRA SALTOS DE PÁGINA ──
    tbl_maestra = Table(
        [[_tbl_tit], [Spacer(1, _SP_BLOQUE)], [tbl_al]],
        colWidths=[_AU],
        splitByRow=0
    )
    tbl_maestra.setStyle(TableStyle([
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("TOPPADDING",    (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
    ]))

    return [tbl_maestra]


# ── Módulo: Términos y Condiciones ────────────────────────────────────────────

def _seccion_terminos(E, C, nota_iva, anticipo_pct):
    story = []
    story += _seccion_header("Términos y Condiciones Comerciales", E)

    _titulo_tc = ParagraphStyle("tc_titulo", fontSize=9, fontName="Helvetica-Bold",
                                 leading=11, textColor=C["secondary"], spaceAfter=6)
    # leading=12 para mayor escaneo visual
    _viñeta_tc = ParagraphStyle("tc_viñeta", fontSize=8.5, fontName="Helvetica",
                                 leading=12, textColor=C["terms_text"],
                                 leftIndent=14, firstLineIndent=-10, spaceAfter=5)

    condiciones_items = [
        nota_iva.strip(),
        "Esta propuesta comprende únicamente los materiales, servicios y alcances especificados "
        "en la sección de Inclusiones. Cualquier modificación posterior a la rectificación de "
        "medidas o trabajo no especificado requerirá recotización aprobada por escrito.",
        f"El inicio de obra está condicionado al pago del anticipo del {anticipo_pct}%. "
        "Precios válidos según fecha indicada; ajuste posible ante variación de materiales "
        "superior al 5% durante el período de validez. — Generado por Costo360.",
    ]

    # Sin KeepTogether — flujo natural
    for i, item in enumerate(condiciones_items, start=1):
        story.append(Paragraph(f"{i}.  {item}", _viñeta_tc))
    return story


def _bloque_firma_cliente(E, C):
    """
    Bloque ACEPTADO Y APROBADO POR EL CLIENTE.
    Tabla plana 3×4 sin sub-tablas anidadas.
    Líneas de escritura con HRFlowable — no desbordan.
    """
    _C0 = _AU * 0.17
    _C1 = _AU * 0.33
    _C2 = _AU * 0.20
    _C3 = _AU * 0.30

    _st_tit = E["firma_titulo"]
    _st_lbl = E["firma_campo"]
    _LINE_COLOR = C["text"]

    def _hr():
        return HRFlowable(width="100%", thickness=0.8,
                          color=_LINE_COLOR, spaceAfter=0, spaceBefore=6)

    filas = [
        [Paragraph("ACEPTACIÓN Y AUTORIZACIÓN DEL CLIENTE", _st_tit), "", "", ""],
        [Paragraph("Firma:", _st_lbl),          _hr(),
         Paragraph("Nombre / Razón Social:", _st_lbl), _hr()],
        [Paragraph("C.C. / NIT:", _st_lbl),     _hr(),
         Paragraph("Fecha de aprobación:", _st_lbl),   _hr()],
    ]

    tbl = Table(filas, colWidths=[_C0, _C1, _C2, _C3])
    tbl.setStyle(TableStyle([
        ("SPAN",          (0, 0), (-1,  0)),
        ("BACKGROUND",    (0, 0), (-1,  0), colors.HexColor("#EEF2F8")),
        ("LINEABOVE",     (0, 0), (-1,  0), 2.0, C["accent"]),
        ("TOPPADDING",    (0, 0), (-1,  0), 9),
        ("BOTTOMPADDING", (0, 0), (-1,  0), 9),
        ("BACKGROUND",    (0, 1), (-1, -1), colors.HexColor("#FAFCFF")),
        ("TOPPADDING",    (0, 1), (-1, -1), _PAD_FIRMA),
        ("BOTTOMPADDING", (0, 1), (-1, -1), _PAD_FIRMA),
        ("LINEBELOW",     (0, 1), (-1,  1), 0.4, colors.HexColor("#E0E8F0")),
        ("LINEBEFORE",    (2, 1), ( 2, -1), 0.8, colors.HexColor("#C8D8E8")),
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#C8D8E8")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))

    return [Spacer(1, _SP_SECCION), KeepTogether([tbl])]


# ══════════════════════════════════════════════════════════════════════════════
# HERO DE PRECIO — primera sección visible tras el encabezado
# ══════════════════════════════════════════════════════════════════════════════

def _seccion_hero_precio(E, C, precio_final, incluir_iva, anticipo_pct,
                          anticipo_val, saldo_val, nombre_cliente,
                          tipo_proyecto, valido_hasta, numero="", nota_iva=None):
    """
    Bloque hero: precio total prominente — primera sección visible al abrir el PDF.
    Diseño: fondo azul marino oscuro · precio 28pt · metadatos a la derecha.
    Specs validadas por UI Designer: 60/40, padding 14pt, precio 28pt, saldo en #B8D4F0.
    """
    _lbl_s  = ParagraphStyle("_h_lbl",  fontSize=7.5, fontName="Helvetica-Bold",
                               leading=10, textColor=C["accent"],
                               letterSpacing=1.2)
    _val_s  = ParagraphStyle("_h_val",  fontSize=28,  fontName="Helvetica-Bold",
                               leading=32, textColor=colors.HexColor("#FFFFFF"))
    _sub_s  = ParagraphStyle("_h_sub",  fontSize=8,   fontName="Helvetica",
                               leading=10, textColor=C["light"])
    _num_s  = ParagraphStyle("_h_num",  fontSize=7,   fontName="Helvetica",
                               leading=9,  textColor=colors.HexColor("#6B7A99"))
    _dlbl_s = ParagraphStyle("_h_dlbl", fontSize=7,   fontName="Helvetica",
                               leading=9,  textColor=C["light"],
                               letterSpacing=0.8)
    _dval_s = ParagraphStyle("_h_dval", fontSize=9,   fontName="Helvetica-Bold",
                               leading=11, textColor=colors.HexColor("#FFFFFF"))
    _albl_s = ParagraphStyle("_h_albl", fontSize=7,   fontName="Helvetica-Bold",
                               leading=9,  textColor=C["accent"],
                               letterSpacing=1.0)
    _aval_s = ParagraphStyle("_h_aval", fontSize=11,  fontName="Helvetica-Bold",
                               leading=14, textColor=C["accent"])
    _slbl_s = ParagraphStyle("_h_slbl", fontSize=7,   fontName="Helvetica",
                               leading=9,  textColor=C["light"],
                               letterSpacing=0.8)
    _sval_s = ParagraphStyle("_h_sval", fontSize=11,  fontName="Helvetica-Bold",
                               leading=14, textColor=C["light"])

    iva_nota = nota_iva if nota_iva is not None else (
        "IVA 19% incluido" if incluir_iva else "Sin IVA"
    )

    col_izq = [
        Paragraph("TOTAL DEL PROYECTO", _lbl_s),
        Spacer(1, 6),
        Paragraph(_num(precio_final), _val_s),
        Spacer(1, 5),
        Paragraph(iva_nota, _sub_s),
    ]
    if numero:
        col_izq += [Spacer(1, 3), Paragraph(numero, _num_s)]

    _cli_str  = (nombre_cliente or "Por definir")[:42]
    _proy_str = (tipo_proyecto  or "—")[:38]

    col_der = [
        Paragraph("CLIENTE",      _dlbl_s), Paragraph(_cli_str,    _dval_s),
        Spacer(1, 7),
        Paragraph("PROYECTO",     _dlbl_s), Paragraph(_proy_str,   _dval_s),
        Spacer(1, 7),
        Paragraph("VÁLIDO HASTA", _dlbl_s), Paragraph(valido_hasta, _dval_s),
        Spacer(1, 8),
        Paragraph(f"ANTICIPO ({anticipo_pct}%)",        _albl_s),
        Paragraph(_num(anticipo_val),                    _aval_s),
        Spacer(1, 4),
        Paragraph(f"SALDO ({100 - anticipo_pct}%)",      _slbl_s),
        Paragraph(_num(saldo_val),                       _sval_s),
    ]

    tbl = Table([[col_izq, col_der]], colWidths=[_AU * 0.60, _AU * 0.40])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["primary"]),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING",   (0, 0), (0,  -1), 12),
        ("RIGHTPADDING",  (0, 0), (0,  -1), 12),
        ("LEFTPADDING",   (1, 0), (1,  -1), 12),
        ("RIGHTPADDING",  (1, 0), (1,  -1), 12),
        ("LINEBEFORE",    (1, 0), (1,  -1), 0.5, colors.HexColor("#2D4B7A")),
        ("LINEABOVE",     (0, 0), (-1,  0), 4.0, C["accent"]),
        ("LINEBELOW",     (0, 0), (-1, -1), 2.0, C["accent"]),
    ]))
    return [tbl]


# ══════════════════════════════════════════════════════════════════════════════
# COTIZACIÓN DIRECTA
# ══════════════════════════════════════════════════════════════════════════════

def generar_pdf_cotizacion(resultado, numero=None, empresa_info=None,
                            logo_bytes=None, incluir_iva=True,
                            inclusiones=None, exclusiones=None, resumen_ia=""):
    if numero is None:
        numero = f"COT-{_hoy().strftime('%Y%m%d')}-001"
    fecha_str = _fecha_es()
    emp = empresa_info or {}

    anticipo_pct  = resultado.get("anticipo_pct", emp.get("anticipo_pct", 60))
    dias_entrega  = resultado.get("dias_entrega", emp.get("dias_entrega", 10))
    dias_validez  = resultado.get("dias_validez", emp.get("dias_validez", 30))
    valido_hasta  = _fecha_hasta(dias_validez)

    _lb = logo_bytes or _cargar_logo_corporativo()
    palette = _extraer_paleta_logo(_lb)
    C = _C(palette)
    E = _estilos(C)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
        leftMargin=_margen_lateral, rightMargin=_margen_lateral,
        topMargin=1.0*cm,  bottomMargin=1.2*cm,
        title=f"Propuesta Comercial {numero}")

    r = resultado
    _c7_adicionales = float(r.get("c7_adicionales", 0) or 0)
    _adicionales_detalle = []
    _estado_g = r.get("_estado_guardado", {})
    if _c7_adicionales > 0 and _estado_g.get("adicionales_activos"):
        from parametros import ADICIONALES, ETAPAS_OBRA
        _cantidades_add = _estado_g.get("cantidades_add", [])
        _etapa_r        = _estado_g.get("etapa_label", "")
        _etapa_val = ETAPAS_OBRA.get(_etapa_r, list(ETAPAS_OBRA.values())[0])
        _adic_lista = _estado_g.get("adicionales_lista", ADICIONALES)
        for i, _ad in enumerate(_adic_lista):
            _cant = float(_cantidades_add[i]) if i < len(_cantidades_add) else 0.0
            if _cant > 0:
                _precio_unit = _ad.get(_etapa_val, 0)
                _valor = _cant * _precio_unit
                if _valor > 0:
                    _adicionales_detalle.append({"concepto": _ad.get("concepto", "—"), "valor": _valor})

    # ─── Pre-cálculo financiero (necesario para el hero) ─────────────────────
    precio_sugerido_total = r.get("precio_sugerido", 0)
    _iva_hero       = precio_sugerido_total * 0.19 if incluir_iva else 0.0
    _precio_hero    = precio_sugerido_total + _iva_hero
    _anticipo_hero  = _precio_hero * (anticipo_pct / 100)
    _saldo_hero     = _precio_hero - _anticipo_hero

    story = []

    # ① ENCABEZADO
    story.append(_encabezado_doc(E, C, "PROPUESTA COMERCIAL", numero, fecha_str, emp, _lb, valido_hasta))
    story.append(Spacer(1, _SP_BLOQUE))

    # ② HERO DE PRECIO — primera sección visible al abrir el PDF
    story += _seccion_hero_precio(
        E, C, _precio_hero, incluir_iva, anticipo_pct,
        _anticipo_hero, _saldo_hero,
        r.get("nombre_cliente", ""), r.get("tipo_proyecto", ""),
        valido_hasta, numero,
    )
    story.append(Spacer(1, _SP_SECCION))

    # ③ DATOS DEL CLIENTE
    story += _seccion_header("Datos del Cliente y Condiciones", E)
    datos_filas = []
    datos_filas.append(("Cliente / Atención a", r.get("nombre_cliente") or "A quien pueda interesar / Por definir"))
    _tel_cli   = (r.get("telefono_cliente") or "").strip()
    _email_cli = (r.get("email_cliente") or "").strip()
    if _tel_cli or _email_cli:
        _contacto_str = "  ·  ".join(filter(None, [_tel_cli, _email_cli]))
        datos_filas.append(("Contacto", _contacto_str))
    _piezas_doc = _estado_g.get("piezas", [])
    _tipo_proy  = (r.get("tipo_proyecto") or "—").strip()
    if _piezas_doc:
        _nombres_piezas = ", ".join(p.get("nombre", "—") for p in _piezas_doc)
        if _tipo_proy.lower() in _nombres_piezas.lower():
            _resumen_proy = _nombres_piezas
        else:
            _resumen_proy = f"{_tipo_proy} — Incluye: {_nombres_piezas}"
        if len(_resumen_proy) > 85:
            _resumen_proy = _resumen_proy[:82] + "…"
    else:
        _resumen_proy = _tipo_proy
    _ciudad_proy = (r.get("ciudad_proyecto") or "").strip() or "Área Metropolitana"
    datos_filas += [
        ("Ubicación del Proyecto", _ciudad_proy),
        ("Proyecto",               _resumen_proy),
        ("Forma de pago",          f"{anticipo_pct}% anticipo  ·  {100-anticipo_pct}% contra entrega"),
        ("Condiciones",            f"Validez: {dias_validez} días  ·  Entrega estimada: {dias_entrega} días"),
    ]
    story.append(_tabla_datos_cliente(E, C, datos_filas))
    story.append(Spacer(1, _SP_SECCION))

    # ④ ALCANCE — el cliente sabe QUÉ compra antes de ver el desglose de costos
    story += _seccion_alcance(E, C, inclusiones=inclusiones, exclusiones=exclusiones)
    story.append(Spacer(1, _SP_SECCION))

    # Resumen IA (si viene)
    if resumen_ia and str(resumen_ia).strip():
        story.append(Paragraph(str(resumen_ia).strip(), E["resumen_ia"]))
        story.append(Spacer(1, _SP_SECCION))

    # ⑤ SERVICIOS ADICIONALES (si aplica)
    if _c7_adicionales > 0:
        story += _seccion_adicionales_alcance(E, C, _adicionales_detalle, _c7_adicionales)
        story.append(Spacer(1, _SP_SECCION))

    # ⑥ DESPIECE TÉCNICO
    story += _seccion_despiece_tecnico(E, C, r, incluir_iva, anticipo_pct, precio_sugerido_total)
    story.append(Spacer(1, _SP_SECCION))

    # ⑦ RESUMEN FINANCIERO — KeepTogether protege tabla + letras
    fin_story, precio_final_doc, anticipo_val = _seccion_resumen_financiero(
        E, C, precio_sugerido_total, anticipo_pct, incluir_iva,
        c7_adicionales=_c7_adicionales, adicionales_detalle=_adicionales_detalle)
    valor_letras = _numero_a_letras(int(round(precio_final_doc)))
    _tbl_letras = Table([[Paragraph(f"Son: {valor_letras}", E["letras"])]],
        colWidths=[_AU], style=TableStyle([
            ("BACKGROUND",   (0,0),(-1,-1), C["primary"]),
            ("TOPPADDING",   (0,0),(-1,-1), 4), ("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ]))
    story.append(KeepTogether(fin_story + [_tbl_letras]))
    story.append(Spacer(1, _SP_SECCION))

    # ⑧ TÉRMINOS Y CONDICIONES (condensados a 3 puntos)
    nota_iva = (
        "Propuesta con IVA del 19% incluido en el precio total. "
        if incluir_iva else
        "Propuesta sin IVA. "
    )
    story += _seccion_terminos(E, C, nota_iva, anticipo_pct)
    story.append(Spacer(1, _SP_BLOQUE))

    # ⑨ FIRMA
    story += _bloque_firma_cliente(E, C)

    # ⑩ FOOTER
    story += _footer_doc(E, C, emp.get("nombre",""), fecha_str, numero, ciudad=emp.get("ciudad",""))

    doc.build(story)
    return buf.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# COTIZACIÓN AIU
# ══════════════════════════════════════════════════════════════════════════════

def generar_pdf_cotizacion_aiu(resultado, numero=None, empresa_info=None, logo_bytes=None, incluir_iva=True, inclusiones=None, exclusiones=None, resumen_ia=""):
    if numero is None:
        numero = f"COT-AIU-{_hoy().strftime('%Y%m%d')}-001"
    fecha_str = _fecha_es()
    emp = empresa_info or {}

    anticipo_pct = resultado.get("anticipo_pct", emp.get("anticipo_pct", 60))
    dias_entrega = resultado.get("dias_entrega", emp.get("dias_entrega", 10))
    dias_validez = resultado.get("dias_validez", emp.get("dias_validez", 30))
    valido_hasta = _fecha_hasta(dias_validez)

    _lb = logo_bytes or _cargar_logo_corporativo()
    palette = _extraer_paleta_logo(_lb)
    C = _C(palette)
    E = _estilos(C)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
        leftMargin=_margen_lateral, rightMargin=_margen_lateral,
        topMargin=1.0*cm,  bottomMargin=1.2*cm,
        title=f"Propuesta AIU {numero}")

    r = resultado

    # Pre-calcular precio_total y anticipo_val antes del story (necesarios para el hero)
    _cd_pre    = r.get("cd", r.get("costo_total", 0))
    _pct_a_pre = r.get("pct_a", 2.0); _pct_i_pre = r.get("pct_i", 2.0); _pct_u_pre = r.get("pct_u", 5.0)
    _val_a_pre = r.get("val_a", _cd_pre * _pct_a_pre / 100)
    _val_i_pre = r.get("val_i", _cd_pre * _pct_i_pre / 100)
    _val_u_pre = r.get("val_u", _cd_pre * _pct_u_pre / 100)
    _incluir_iva_pre = incluir_iva and r.get("incluir_iva", True)
    _val_iva_pre = r.get("val_iva", _val_u_pre * 0.19) if _incluir_iva_pre else 0.0
    precio_total = r.get("precio_total", _cd_pre + _val_a_pre + _val_i_pre + _val_u_pre + _val_iva_pre)
    anticipo_val = precio_total * (anticipo_pct / 100)

    story = []

    # ① ENCABEZADO
    story.append(_encabezado_doc(E, C, "PROPUESTA AIU — OBRA PUBLICA", numero, fecha_str, emp, _lb, valido_hasta))

    # ② HERO DE PRECIO
    _nota_iva_aiu = (
        "IVA sobre Utilidad incluido (Decreto 1372/92)" if _incluir_iva_pre else "Sin IVA"
    )
    story += _seccion_hero_precio(
        E, C,
        precio_final=precio_total,
        incluir_iva=_incluir_iva_pre,
        anticipo_pct=anticipo_pct,
        anticipo_val=anticipo_val,
        saldo_val=precio_total - anticipo_val,
        nombre_cliente=r.get("nombre_cliente", ""),
        tipo_proyecto=r.get("tipo_proyecto", "Licitación AIU"),
        valido_hasta=valido_hasta,
        numero=numero,
        nota_iva=_nota_iva_aiu,
    )
    story.append(Spacer(1, _SP_SECCION))

    # ② DATOS DEL CONTRATANTE
    story += _seccion_header("Datos del Contratante", E)
    cliente_nombre = r.get("nombre_cliente") or r.get("_estado_guardado", {}).get("nombre_cliente") or "A quien pueda interesar"
    datos_filas = [
        ("Contratante / Atención a", cliente_nombre),
    ]
    _tel = r.get("telefono_cliente", "")
    _ema = r.get("email_cliente", "")
    if _tel or _ema:
        datos_filas.append(("Contacto", "  ·  ".join(filter(None, [_tel, _ema]))))
    datos_filas += [
        ("Ciudad",           r.get("ciudad_proyecto") or "Área Metropolitana"),
        ("Tipo de contrato", "Licitación / Proyecto Constructora — Estructura AIU"),
        ("Forma de pago",    f"{anticipo_pct}% anticipo  ·  {100-anticipo_pct}% contra acta de entrega"),
        ("Condiciones",      f"Validez: {dias_validez} días  ·  Entrega estimada: {dias_entrega} días"),
    ]
    story.append(_tabla_datos_cliente(E, C, datos_filas))
    story.append(Spacer(1, _SP_SECCION))

    # --- INYECCIÓN RESUMEN IA B2B ---
    if resumen_ia and str(resumen_ia).strip():
        story.append(Paragraph(str(resumen_ia).strip(), E["resumen_ia"]))
        story.append(Spacer(1, _SP_SECCION))

    # ③ COSTO DIRECTO
    story += _seccion_header("Costo Directo (CD) — Items del Contrato", E)
    aiu_items = r.get("_estado_guardado", {}).get("aiu_items", [])
    cd = r.get("cd", r.get("costo_total", 0))

    cd_filas = [[
        Paragraph("DESCRIPCION / ITEM", E["th"]), Paragraph("UNID.", E["th_c"]),
        Paragraph("CANT.", E["th_c"]), Paragraph("P. UNIT.", E["th_r"]), Paragraph("SUBTOTAL", E["th_r"]),
    ]]
    if aiu_items:
        for it in aiu_items:
            sub_it = it.get("cant",0) * it.get("punit",0)
            cd_filas.append([
                Paragraph(it.get("desc","—"), E["cell"]),
                Paragraph(it.get("und",""),   E["cell_c"]),
                Paragraph(f"{it.get('cant',0):.1f}", E["cell_c"]),
                Paragraph(_num(it.get("punit",0)), E["cell_r"]),
                Paragraph(_num(sub_it),            E["cell_br"]),
            ])
    else:
        cd_filas.append([
            Paragraph("Costo Directo Total", E["cell"]), Paragraph("glb", E["cell_c"]),
            Paragraph("1", E["cell_c"]), Paragraph(_num(cd), E["cell_r"]), Paragraph(_num(cd), E["cell_br"]),
        ])
    cd_filas.append([
        Paragraph("COSTO DIRECTO (CD)", E["subtotal_l"]),
        Paragraph("", E["cell_c"]), Paragraph("", E["cell_c"]), Paragraph("", E["cell_c"]),
        Paragraph(_num(cd), E["subtotal_v"]),
    ])
    tbl_cd = Table(cd_filas, colWidths=COL_AIU_5, repeatRows=1)
    tbl_cd.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  C["header_dark"]),
        ("ROWBACKGROUNDS",(0,1),(-1,-2), [C["zebra_a"], C["zebra_b"]]),
        ("BACKGROUND",    (0,-1),(-1,-1),C["light"]),
        ("SPAN",          (0,-1),(3,-1)),
        ("TOPPADDING",    (0,0),(-1,0),  _PAD_HDR), ("BOTTOMPADDING",(0,0),(-1,0),_PAD_HDR),
        ("TOPPADDING",    (0,1),(-1,-1), _PAD_DATA), ("BOTTOMPADDING",(0,1),(-1,-1),_PAD_DATA),
        ("LEFTPADDING",   (0,0),(-1,-1), 8), ("RIGHTPADDING",(0,0),(-1,-1),8),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("LINEBELOW",     (0,0),(-1,-1), 0.3, C["border"]),
        ("BOX",           (0,0),(-1,-1), 0.5, C["border"]),
    ]))
    story.append(tbl_cd)
    story.append(Spacer(1, _SP_SECCION))

    # ④ ESTRUCTURA AIU
    story += _seccion_header("Estructura AIU — Desglose del Precio del Contrato", E)

    pct_a = r.get("pct_a", 2.0); pct_i = r.get("pct_i", 2.0); pct_u = r.get("pct_u", 5.0)
    val_a = r.get("val_a", cd * pct_a / 100); val_i = r.get("val_i", cd * pct_i / 100)
    val_u = r.get("val_u", cd * pct_u / 100)
    incluir_iva = incluir_iva and r.get("incluir_iva", True)
    val_iva = r.get("val_iva", val_u * 0.19) if incluir_iva else 0.0
    precio_total = r.get("precio_total", cd + val_a + val_i + val_u + val_iva)
    anticipo_val = precio_total * (anticipo_pct / 100)

    _CD_BG    = colors.HexColor("#E8F0FB")
    _AIU_BG   = colors.HexColor("#F4F6F9")
    _TOTAL_BG = C["secondary"]
    _BORDE_CD = C["secondary"]
    _BORDE_AIU= colors.HexColor("#5AAFF5")

    s_cd_lbl  = ParagraphStyle("s_cd_lbl",  fontSize=9.5, fontName="Helvetica-Bold",   leading=12, textColor=C["secondary"])
    s_cd_val  = ParagraphStyle("s_cd_val",  fontSize=9.5, fontName="Helvetica-Bold",   leading=12, textColor=C["secondary"], alignment=TA_RIGHT)
    s_aiu_lbl = ParagraphStyle("s_aiu_lbl", fontSize=9,   fontName="Helvetica",        leading=11, textColor=C["text"])
    s_aiu_pct = ParagraphStyle("s_aiu_pct", fontSize=9,   fontName="Helvetica-Bold",   leading=11, textColor=C["secondary"], alignment=TA_CENTER)
    s_aiu_val = ParagraphStyle("s_aiu_val", fontSize=9,   fontName="Helvetica-Bold",   leading=11, textColor=C["text"], alignment=TA_RIGHT)
    s_iva_lbl = ParagraphStyle("s_iva_lbl", fontSize=8.5, fontName="Helvetica-Oblique",leading=11, textColor=C["secondary"])
    s_iva_val = ParagraphStyle("s_iva_val", fontSize=8.5, fontName="Helvetica-Bold",   leading=11, textColor=C["secondary"], alignment=TA_RIGHT)
    s_tot_lbl = ParagraphStyle("s_tot_lbl", fontSize=11,  fontName="Helvetica-Bold",   leading=14, textColor=C["white"])
    s_tot_val = ParagraphStyle("s_tot_val", fontSize=12,  fontName="Helvetica-Bold",   leading=15, textColor=C["accent"], alignment=TA_RIGHT)
    s_ant_lbl = ParagraphStyle("s_ant_lbl", fontSize=9,   fontName="Helvetica-Bold",   leading=11, textColor=C["accent"])
    s_ant_val = ParagraphStyle("s_ant_val", fontSize=9,   fontName="Helvetica-Bold",   leading=11, textColor=C["accent"], alignment=TA_RIGHT)

    tbl_cd_hdr = Table([[Paragraph("COSTO DIRECTO (CD)", s_cd_lbl), Paragraph("100%", s_aiu_pct), Paragraph(_num(cd), s_cd_val)]], colWidths=COL_AIU_3)
    tbl_cd_hdr.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), _CD_BG),
        ("LINEABOVE",     (0,0),(-1, 0), 2.0, _BORDE_CD),
        ("LINEBEFORE",    (0,0),(0,-1),  3.0, _BORDE_CD),
        ("TOPPADDING",    (0,0),(-1,-1), 9), ("BOTTOMPADDING",(0,0),(-1,-1),9),
        ("LEFTPADDING",   (0,0),(-1,-1), 10), ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("BOX",           (0,0),(-1,-1), 0.5, C["border"]),
    ]))
    story.append(tbl_cd_hdr)

    filas_aiu_comp = [
        [Paragraph(f"A — Administración  ({pct_a:.1f}% sobre CD)", s_aiu_lbl), Paragraph(f"{pct_a:.1f}%", s_aiu_pct), Paragraph(_num(val_a), s_aiu_val)],
        [Paragraph(f"I — Imprevistos  ({pct_i:.1f}% sobre CD)", s_aiu_lbl),   Paragraph(f"{pct_i:.1f}%", s_aiu_pct), Paragraph(_num(val_i), s_aiu_val)],
        [Paragraph(f"U — Utilidad  ({pct_u:.1f}% sobre CD)", s_aiu_lbl),      Paragraph(f"{pct_u:.1f}%", s_aiu_pct), Paragraph(_num(val_u), s_aiu_val)],
        [Paragraph("IVA 19%  (Sólo sobre Utilidad — Decreto 1372/92)" if incluir_iva else "Sin IVA", s_iva_lbl),
         Paragraph("19%" if incluir_iva else "0%", s_iva_val), Paragraph(_num(val_iva), s_iva_val)],
    ]
    _iva_bg = colors.HexColor("#EEF3FB") if incluir_iva else colors.HexColor("#EBF7EE")
    tbl_aiu_comp = Table(filas_aiu_comp, colWidths=COL_AIU_3)
    tbl_aiu_comp.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), _AIU_BG),
        ("LINEBEFORE",    (0,0),(0,-1),  3.0, _BORDE_AIU),
        ("LINEABOVE",     (0,3),(-1,3),  0.8, C["border"]),
        ("BACKGROUND",    (0,3),(-1,3),  _iva_bg),
        ("TOPPADDING",    (0,0),(-1,-1), _PAD_DATA), ("BOTTOMPADDING",(0,0),(-1,-1),_PAD_DATA),
        ("LEFTPADDING",   (0,0),(-1,-1), 10), ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LINEBELOW",     (0,0),(-1,-1), 0.3, C["border"]),
        ("BOX",           (0,0),(-1,-1), 0.5, C["border"]),
    ]))
    story.append(KeepTogether([tbl_aiu_comp]))

    filas_extra = []
    filas_extra.append([Paragraph(f"ANTICIPO A PAGAR  ({anticipo_pct}% del total)", s_ant_lbl), Paragraph(f"{anticipo_pct}%", s_ant_val), Paragraph(_num(anticipo_val), s_ant_val)])
    filas_extra.append([Paragraph("TOTAL DEL CONTRATO", s_tot_lbl), Paragraph("", s_tot_lbl), Paragraph(_num(precio_total), s_tot_val)])
    idx_ant_extra = len(filas_extra) - 2
    idx_tot_extra = len(filas_extra) - 1

    tbl_extra = Table(filas_extra, colWidths=COL_AIU_3)
    tbl_extra.setStyle(TableStyle([
        ("ROWBACKGROUNDS",  (0,0),(-1,idx_ant_extra-1), [C["zebra_a"], C["zebra_b"]]),
        ("BACKGROUND",      (0,idx_ant_extra),(-1,idx_ant_extra), C["anticipo_bg"]),
        ("BACKGROUND",      (0,idx_tot_extra),(-1,idx_tot_extra), _TOTAL_BG),
        ("LINEABOVE",       (0,idx_tot_extra),(-1,idx_tot_extra), 3.0, C["accent"]),
        ("TOPPADDING",      (0,0),(-1,-2), _PAD_DATA), ("BOTTOMPADDING",(0,0),(-1,-2),_PAD_DATA),
        ("TOPPADDING",      (0,idx_tot_extra),(-1,idx_tot_extra), 10),
        ("BOTTOMPADDING",   (0,idx_tot_extra),(-1,idx_tot_extra), 10),
        ("LEFTPADDING",     (0,0),(-1,-1), 10), ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("VALIGN",          (0,0),(-1,-1), "MIDDLE"),
        ("LINEBELOW",       (0,0),(-1,-2), 0.3, C["border"]),
        ("BOX",             (0,0),(-1,-1), 0.5, C["border"]),
    ]))
    story.append(KeepTogether([tbl_extra]))

    valor_letras = _numero_a_letras(int(round(precio_total)))
    story.append(Table([[Paragraph(f"Son: {valor_letras}", E["letras"])]],
        colWidths=[_AU], style=TableStyle([
            ("BACKGROUND",   (0,0),(-1,-1), C["primary"]),
            ("TOPPADDING",   (0,0),(-1,-1), 4), ("BOTTOMPADDING",(0,0),(-1,-1),6),
            ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ])))
    story.append(Spacer(1, _SP_SECCION))

    nota_aiu = (
        "En contratos AIU el IVA (19%) aplica exclusivamente sobre la Utilidad (U). "
        "No aplica sobre Costo Directo (CD), Administración (A) ni Imprevistos (I)."
        if incluir_iva else
        "Propuesta presentada sin IVA sobre la Utilidad. "
        "Los porcentajes A, I y U aplican directamente sobre el Costo Directo (CD)."
    )
    story += _seccion_alcance(E, C, inclusiones=inclusiones, exclusiones=exclusiones)
    story.append(Spacer(1, _SP_SECCION))
    story += _seccion_terminos(E, C, nota_aiu, anticipo_pct)
    story.append(Spacer(1, _SP_BLOQUE))
    story += _bloque_firma_cliente(E, C)
    story += _footer_doc(E, C, emp.get("nombre",""), fecha_str, numero, ciudad=emp.get("ciudad",""))

    doc.build(story)
    return buf.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# CUENTA DE COBRO
# ══════════════════════════════════════════════════════════════════════════════

def generar_cuenta_cobro(resultado, datos_prestador, datos_pagador,
                          numero=None, descripcion_servicio=None,
                          logo_bytes=None, incluir_iva=True):
    if numero is None:
        numero = f"CC-{_hoy().strftime('%Y%m%d')}-001"
    fecha_str = _fecha_es()

    es_aiu = resultado.get("tipo_proyecto") == "Licitacion AIU"
    precio_base  = resultado.get("precio_sugerido", resultado.get("precio_total", 0))
    anticipo_pct = resultado.get("anticipo_pct", datos_prestador.get("anticipo_pct", 60))

    if es_aiu:
        precio_base  = resultado.get("precio_total", precio_base)
        valor_total  = precio_base
        iva          = resultado.get("val_iva", 0)
        incluir_iva  = False
    else:
        iva          = precio_base * 0.19 if incluir_iva else 0.0
        valor_total  = precio_base + iva

    valor_anticipo = valor_total * (anticipo_pct / 100)
    valor_saldo    = valor_total - valor_anticipo

    emp = {
        "nombre": datos_prestador.get("nombre",""),
        "nit":    datos_prestador.get("nit", datos_prestador.get("nit_cc","")),
        "ciudad": datos_prestador.get("ciudad", datos_prestador.get("direccion","")),
        "tel":    datos_prestador.get("tel", datos_prestador.get("telefono","")),
        "email":  datos_prestador.get("email",""),
    }

    _lb = logo_bytes or _cargar_logo_corporativo()
    palette = _extraer_paleta_logo(_lb)
    C = _C(palette)
    E = _estilos(C)

    if descripcion_servicio is None:
        if es_aiu:
            cn = resultado.get("_estado_guardado", {}).get("nombre_cliente", "")
            rt = f" para {cn}" if cn else ""
            descripcion_servicio = (
                f"Cobro del {anticipo_pct}% de anticipo en cotización AIU{rt}. "
                f"Suministro, fabricación e instalación de materiales pétreos según especificaciones. "
                f"Saldo {100-anticipo_pct}% contra acta de entrega."
            )
        else:
            m2   = resultado.get("m2_real", 0)
            tipo = resultado.get("tipo_proyecto", "proyecto")
            cat  = resultado.get("categoria", "material petreo")
            ref  = resultado.get("referencia","")
            rt   = f" referencia {ref}" if ref else ""
            descripcion_servicio = (
                f"Cobro del {anticipo_pct}% de anticipo para: suministro, fabricación e instalación "
                f"de {tipo} en {cat}{rt}. Area instalada: {m2:.2f} m2. "
                f"Saldo {100-anticipo_pct}% contra entrega a satisfacción."
            )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
        leftMargin=_margen_lateral, rightMargin=_margen_lateral,
        topMargin=1.0*cm, bottomMargin=1.2*cm,
        title=f"CUENTA DE COBRO {numero}")

    story = []

    # ── Estilos locales ───────────────────────────────────────────────────────
    _lbl_partes = ParagraphStyle("_cc_lbl", fontSize=8, fontName="Helvetica",
                                  leading=10, textColor=C["gray"])
    _val_partes = ParagraphStyle("_cc_val", fontSize=8.5, fontName="Helvetica-Bold",
                                  leading=11, textColor=C["text"])
    _tit_partes = ParagraphStyle("_cc_tit", fontSize=7.5, fontName="Helvetica-Bold",
                                  leading=10, textColor=C["accent"], letterSpacing=0.8)
    _saldo_lbl  = ParagraphStyle("_cc_sld_l", fontSize=8, fontName="Helvetica",
                                  leading=10, textColor=C["gray"])
    _saldo_val  = ParagraphStyle("_cc_sld_v", fontSize=8, fontName="Helvetica",
                                  leading=10, textColor=C["gray"], alignment=TA_RIGHT)
    _nota_banco = ParagraphStyle("_cc_nb", fontSize=7.5, fontName="Helvetica-Oblique",
                                  leading=10, textColor=C["terms_text"])

    # ① ENCABEZADO — sin cambios
    story.append(_encabezado_doc(E, C, "CUENTA DE COBRO", numero, fecha_str, emp, _lb))
    story.append(Spacer(1, _SP_SECCION))

    # ② PARTES — tabla 50/50: Prestador | Pagador
    def _col_parte(titulo, d_nombre, d_nit, d_ciudad, d_tel):
        col = [Paragraph(titulo, _tit_partes), Spacer(1, 3)]
        if d_nombre:
            col.append(Paragraph(d_nombre, _val_partes))
        if d_nit:
            col.append(Paragraph(d_nit, _lbl_partes))
        extra = "  ·  ".join(filter(None, [d_ciudad, d_tel]))
        if extra:
            col.append(Paragraph(extra, _lbl_partes))
        return col

    _prest_nombre = datos_prestador.get("nombre", "—")
    _prest_nit    = datos_prestador.get("nit_cc", datos_prestador.get("nit", ""))
    _prest_ciudad = datos_prestador.get("ciudad", datos_prestador.get("direccion", ""))
    _prest_tel    = datos_prestador.get("tel", datos_prestador.get("telefono", ""))

    _pag_nombre   = datos_pagador.get("nombre", "—")
    _pag_nit      = datos_pagador.get("nit", datos_pagador.get("nit_cc", ""))
    _pag_ciudad   = datos_pagador.get("ciudad", "")
    _pag_tel      = datos_pagador.get("tel", datos_pagador.get("telefono", ""))

    tbl_partes = Table(
        [[
            _col_parte("PRESTADOR DEL SERVICIO", _prest_nombre, _prest_nit, _prest_ciudad, _prest_tel),
            _col_parte("BENEFICIARIO / PAGADOR",  _pag_nombre,  _pag_nit,  _pag_ciudad,   _pag_tel),
        ]],
        colWidths=COL_2_50_50,
    )
    tbl_partes.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["ultralight"]),
        ("LINEABOVE",     (0, 0), (-1,  0), 1.5, C["accent"]),
        ("LINEBEFORE",    (1, 0), ( 1, -1), 0.5, C["border"]),
        ("BOX",           (0, 0), (-1, -1), 0.5, C["border"]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), _PAD_DATA + 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), _PAD_DATA + 2),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
    ]))
    story.append(tbl_partes)
    story.append(Spacer(1, _SP_SECCION))

    # ③ DESCRIPCION + VALOR (KeepTogether)
    tbl_desc = Table(
        [[Paragraph(descripcion_servicio, E["cell"])]],
        colWidths=[_AU],
    )
    tbl_desc.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), C["ultralight"]),
        ("LINEABOVE",     (0, 0), (-1,  0), 1.5, C["secondary"]),
        ("BOX",           (0, 0), (-1, -1), 0.5, C["border"]),
        ("TOPPADDING",    (0, 0), (-1, -1), _PAD_DATA + 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), _PAD_DATA + 1),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
    ]))

    if incluir_iva and not es_aiu:
        filas_val = [
            [Paragraph("Valor del servicio (sin IVA)", E["cell_b"]),
             Paragraph(_num(precio_base), E["cell_br"])],
            [Paragraph("IVA 19%", E["iva_l"]),
             Paragraph(_num(iva), E["iva_v"])],
            [Paragraph("Total (IVA incluido)", E["subtotal_l"]),
             Paragraph(_num(valor_total), E["subtotal_v"])],
            [Paragraph(f"ANTICIPO A COBRAR ({anticipo_pct}%)", E["anticipo_l"]),
             Paragraph(_num(valor_anticipo), E["anticipo_v"])],
            [Paragraph(f"Saldo contra entrega ({100-anticipo_pct}%)", _saldo_lbl),
             Paragraph(_num(valor_saldo), _saldo_val)],
            [Paragraph("VALOR COBRADO EN ESTE DOCUMENTO", E["total_label"]),
             Paragraph(_num(valor_anticipo), E["total_val"])],
        ]
        idx_ant, idx_tot = 3, 5
    else:
        filas_val = [
            [Paragraph("Valor total de la cotización", E["subtotal_l"]),
             Paragraph(_num(valor_total), E["subtotal_v"])],
            [Paragraph(f"ANTICIPO A COBRAR ({anticipo_pct}%)", E["anticipo_l"]),
             Paragraph(_num(valor_anticipo), E["anticipo_v"])],
            [Paragraph(f"Saldo contra entrega ({100-anticipo_pct}%)", _saldo_lbl),
             Paragraph(_num(valor_saldo), _saldo_val)],
            [Paragraph("VALOR COBRADO EN ESTE DOCUMENTO", E["total_label"]),
             Paragraph(_num(valor_anticipo), E["total_val"])],
        ]
        idx_ant, idx_tot = 1, 3

    tbl_val = Table(filas_val, colWidths=COL_2_75_25)
    tbl_val.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, idx_ant - 1), [C["zebra_a"], C["zebra_b"]]),
        ("BACKGROUND",     (0, idx_ant), (-1, idx_ant), C["anticipo_bg"]),
        ("BACKGROUND",     (0, idx_tot), (-1, idx_tot), C["total_bg"]),
        ("LINEABOVE",      (0, idx_tot), (-1, idx_tot), 3.0, C["accent"]),
        ("TOPPADDING",     (0, 0), (-1, idx_tot - 1), _PAD_DATA),
        ("BOTTOMPADDING",  (0, 0), (-1, idx_tot - 1), _PAD_DATA),
        ("TOPPADDING",     (0, idx_tot), (-1, idx_tot), 8),
        ("BOTTOMPADDING",  (0, idx_tot), (-1, idx_tot), 8),
        ("LEFTPADDING",    (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 10),
        ("LINEBELOW",      (0, 0), (-1, -2), 0.3, C["border"]),
        ("BOX",            (0, 0), (-1, -1), 0.5, C["border"]),
    ]))

    valor_letras = _numero_a_letras(int(round(valor_anticipo)))
    tbl_letras = Table(
        [[Paragraph(f"Son: {valor_letras}", E["letras"])]],
        colWidths=[_AU],
        style=TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), C["primary"]),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ]),
    )

    story.append(KeepTogether([tbl_desc, Spacer(1, _SP_BLOQUE), tbl_val, tbl_letras]))
    story.append(Spacer(1, _SP_SECCION))

    # ④ DATOS BANCARIOS + NOTA TRIBUTARIA
    _nota_tributaria = (
        "La factura oficial será generada por separado a través del software contable "
        "de la empresa, una vez confirmada la recepción del anticipo."
        if (incluir_iva and not es_aiu) else
        "La factura oficial será generada por separado a través del software contable "
        "de la empresa."
    )

    banco_filas = []
    if datos_prestador.get("banco"):         banco_filas.append(("Banco", datos_prestador["banco"]))
    if datos_prestador.get("cuenta_tipo"):   banco_filas.append(("Tipo de cuenta", datos_prestador["cuenta_tipo"]))
    if datos_prestador.get("cuenta_numero"): banco_filas.append(("No. de cuenta", datos_prestador["cuenta_numero"]))
    if datos_prestador.get("nombre"):        banco_filas.append(("A nombre de", datos_prestador["nombre"]))

    _nota_cell = Table(
        [[Paragraph(_nota_tributaria, _nota_banco)]],
        colWidths=[_AU],
        style=TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#FEF9E8")),
            ("LINEABOVE",     (0, 0), (-1,  0), 1.5, C["accent"]),
            ("BOX",           (0, 0), (-1, -1), 0.4, C["accent"]),
            ("TOPPADDING",    (0, 0), (-1, -1), _PAD_DATA + 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), _PAD_DATA + 1),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ]),
    )

    if banco_filas:
        _lbl_b = ParagraphStyle("_cc_blbl", fontSize=8, fontName="Helvetica",
                                 leading=10, textColor=C["gray"])
        _val_b = ParagraphStyle("_cc_bval", fontSize=8.5, fontName="Helvetica-Bold",
                                 leading=11, textColor=C["text"])
        _tit_b = ParagraphStyle("_cc_btit", fontSize=7.5, fontName="Helvetica-Bold",
                                 leading=10, textColor=C["accent"], letterSpacing=0.8)
        banco_rows = [[Paragraph("DATOS PARA PAGO", _tit_b), Paragraph("", _lbl_b)]]
        banco_rows += [[Paragraph(lbl, _lbl_b), Paragraph(val, _val_b)] for lbl, val in banco_filas]

        _banco_izq_w = _AU * 0.46
        _nota_der_w  = _AU * 0.54
        tbl_banco = Table(banco_rows, colWidths=[_banco_izq_w * 0.38, _banco_izq_w * 0.62])
        tbl_banco.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1,  0), C["ultralight"]),
            ("SPAN",          (0, 0), (-1,  0)),
            ("LINEABOVE",     (0, 0), (-1,  0), 1.5, C["accent"]),
            ("BOX",           (0, 0), (-1, -1), 0.5, C["border"]),
            ("LINEBELOW",     (0, 0), (-1, -2), 0.3, C["border"]),
            ("TOPPADDING",    (0, 0), (-1, -1), _PAD_DATA),
            ("BOTTOMPADDING", (0, 0), (-1, -1), _PAD_DATA),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND",    (0, 1), (-1, -1), colors.HexColor("#FAFCFF")),
        ]))

        # nota_cell columna derecha: recalculate width to match
        _nota_cell_solo = Table(
            [[Paragraph(_nota_tributaria, _nota_banco)]],
            colWidths=[_nota_der_w],
            style=TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#FEF9E8")),
                ("LINEABOVE",     (0, 0), (-1,  0), 1.5, C["accent"]),
                ("BOX",           (0, 0), (-1, -1), 0.4, C["accent"]),
                ("TOPPADDING",    (0, 0), (-1, -1), _PAD_DATA + 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), _PAD_DATA + 1),
                ("LEFTPADDING",   (0, 0), (-1, -1), 10),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ]),
        )

        tbl_banco_nota = Table(
            [[tbl_banco, _nota_cell_solo]],
            colWidths=[_banco_izq_w, _nota_der_w],
        )
        tbl_banco_nota.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("COLPADDING",    (0, 0), ( 0, -1), 6),
        ]))
        story.append(tbl_banco_nota)
    else:
        story.append(_nota_cell)

    story.append(Spacer(1, _SP_SECCION))

    # ⑤ FIRMA PRESTADOR / PAGADOR + FOOTER
    _f_mitad = (_AU - 12) / 2.0
    _st_fn   = E["aviso"]
    _st_fc   = E["cell"]

    def _caja_firma(titulo, nombre_pie):
        t = Table(
            [
                [Paragraph("", _st_fc)],
                [Paragraph("", _st_fc)],
                [Paragraph("_" * 36, _st_fc)],
                [Paragraph(nombre_pie, _st_fn)],
                [Paragraph(titulo, _st_fn)],
            ],
            colWidths=[_f_mitad],
            rowHeights=[14, 14, 12, 12, 12],
        )
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#FAFCFF")),
            ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#C8D8E8")),
            ("LINEABOVE",     (0, 0), (-1,  0), 2.0, C["secondary"]),
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("ALIGN",         (0, 2), (-1, -1), "LEFT"),
            ("VALIGN",        (0, 0), (-1, -1), "BOTTOM"),
        ]))
        return t

    firma = Table(
        [[
            _caja_firma("Firma del Prestador", datos_prestador.get("nombre", "")),
            _caja_firma("Sello / Firma del Pagador", datos_pagador.get("nombre", "")),
        ]],
        colWidths=[_f_mitad, _f_mitad],
        hAlign="CENTER",
    )
    firma.setStyle(TableStyle([
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("COLPADDING",    (0, 0), ( 0, -1), 6),
    ]))
    story.append(firma)

    story += _footer_doc(E, C, datos_prestador.get("nombre", ""), fecha_str, numero,
                          ciudad=datos_prestador.get("ciudad", ""))

    doc.build(story)
    return buf.getvalue()


# ── Conversion numero a letras (espanol colombiano) ───────────────────────────

def _numero_a_letras(n):
    def _core(n):
        if n == 0: return "cero"
        unidades = ["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve",
                    "diez","once","doce","trece","catorce","quince","dieciséis","diecisiete",
                    "dieciocho","diecinueve"]
        veintes  = {20:"veinte",21:"veintiuno",22:"veintidós",23:"veintitrés",
                    24:"veinticuatro",25:"veinticinco",26:"veintiséis",
                    27:"veintisiete",28:"veintiocho",29:"veintinueve"}
        decenas  = ["","diez","veinte","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"]
        centenas = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos",
                    "seiscientos","setecientos","ochocientos","novecientos"]
        def _menor_mil(x):
            if x == 0:   return ""
            if x == 100: return "cien"
            c, resto = divmod(x, 100)
            d, u     = divmod(resto, 10)
            partes   = []
            if c: partes.append(centenas[c])
            if resto == 0: pass
            elif resto < 20: partes.append(unidades[resto])
            elif resto in veintes: partes.append(veintes[resto])
            else:
                p = decenas[d]
                if u: p += " y " + unidades[u]
                partes.append(p)
            return " ".join(partes)
        if n < 0:           return "menos " + _core(-n)
        if n < 1_000:       return _menor_mil(n)
        if n < 1_000_000:
            m, r = divmod(n, 1_000)
            pre  = "mil" if m == 1 else _menor_mil(m) + " mil"
            return (pre + " " + _menor_mil(r)).strip()
        if n < 1_000_000_000:
            m, r = divmod(n, 1_000_000)
            pre  = "un millón" if m == 1 else _menor_mil(m) + " millones"
            return (pre + " " + _core(r)).strip()
        return str(n)

    raw = _core(int(abs(n)))
    return raw.capitalize() + " PESOS M/CTE."
