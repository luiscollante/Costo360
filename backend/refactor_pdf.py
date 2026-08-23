import re

with open("motor/generador_pdf.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace hardcoded colors with Palette colors
replacements = {
    r'colors\.HexColor\("#C9A227"\)': 'C["accent"]',
    r'colors\.HexColor\("#B8D4F0"\)': 'C["light"]',
    r'colors\.HexColor\("#1E7FFF"\)': 'C["secondary"]',
    r'colors\.HexColor\("#4A5568"\)': 'C["terms_text"]',
    r'colors\.HexColor\("#C5D5E8"\)': 'C["border"]',
    r'colors\.HexColor\("#1C1C1C"\)': 'C["text"]',
    r'colors\.HexColor\("#374151"\)': 'C["text"]',
}

for old, new in replacements.items():
    content = re.sub(old, new, content)

# Add Costo360 logo to header
header_code_old = """    der = [
        Paragraph(doc_type,"""

header_code_new = """    logo_c360_bytes = None
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
        Paragraph(doc_type,"""

content = content.replace(header_code_old, header_code_new)

with open("motor/generador_pdf.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Refactoring complete.")
