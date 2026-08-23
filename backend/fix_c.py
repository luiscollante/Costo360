import re

with open("motor/generador_pdf.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix _seccion_header
def_header_old = """def _seccion_header(titulo, E):
    return [
        HRFlowable(width="100%", thickness=0.4, color=C["border"]),
        Spacer(1, _SP_HEADER),
        Paragraph(titulo.upper(), E["seccion"]),
        HRFlowable(width="40%", thickness=1.5, color=C["accent"], spaceAfter=0),
        Spacer(1, _SP_HEADER),
    ]"""

def_header_new = """def _seccion_header(titulo, E):
    return [
        HRFlowable(width="100%", thickness=0.4, color=colors.HexColor(_DEFAULT_PALETTE["border"])),
        Spacer(1, _SP_HEADER),
        Paragraph(titulo.upper(), E["seccion"]),
        HRFlowable(width="40%", thickness=1.5, color=colors.HexColor(_DEFAULT_PALETTE["accent"]), spaceAfter=0),
        Spacer(1, _SP_HEADER),
    ]"""

content = content.replace(def_header_old, def_header_new)

with open("motor/generador_pdf.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fix complete.")
