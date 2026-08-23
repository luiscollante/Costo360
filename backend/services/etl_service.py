import os
import time
import imaplib
import email
from email.header import decode_header
import zipfile
import shutil
from datetime import datetime, timedelta

import psycopg2
from defusedxml import ElementTree as ET

from backend.services.ia_facturas import extract_pdf_data_ai

TEMP_DIR = "/tmp/temp_etl" if os.environ.get("VERCEL") else "temp_etl"

# Cuentas de correo revisadas en cada sincronización. Se omite silenciosamente
# cualquiera cuyas variables de entorno no estén configuradas.
CUENTAS = [
    {"nombre": "gmail", "server": "imap.gmail.com", "user_env": "GMAIL_USER", "pass_env": "GMAIL_PASS"},
    {"nombre": "yahoo1", "server": "imap.mail.yahoo.com", "user_env": "YAHOO1_USER", "pass_env": "YAHOO1_PASS"},
    {"nombre": "yahoo2", "server": "imap.mail.yahoo.com", "user_env": "YAHOO2_USER", "pass_env": "YAHOO2_PASS"},
]

DIAS_HISTORIAL = 90
MAX_MENSAJES_POR_CUENTA = 25
MAX_ZIP_DESCOMPRIMIDO = 50 * 1024 * 1024  # 50 MB — evita zip bombs

MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']


def connect_imap(server, user, password):
    try:
        mail = imaplib.IMAP4_SSL(server)
        mail.login(user, password)
        return mail
    except Exception as e:
        print(f"Error conectando a {server}: {e}")
        return None


def extract_ubl_data(xml_file_path):
    try:
        tree = ET.parse(xml_file_path)
        root = tree.getroot()

        ns = {
            'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
            'ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'
        }

        # Algunos proveedores (confirmado con una factura real de Granitos y Mármoles)
        # envían un AttachedDocument — un sobre de la DIAN — con la factura real
        # embebida como texto dentro de este campo, en vez de mandar el Invoice
        # directo. El propio AttachedDocument tiene su propio cbc:ID (un id de
        # trámite de la DIAN, NO el número de factura) — hay que desenvolverlo
        # primero o se leen los campos equivocados.
        embebido = root.find('cac:Attachment/cac:ExternalReference/cbc:Description', ns)
        if embebido is not None and embebido.text:
            root = ET.fromstring(embebido.text)

        fecha = root.find('.//cbc:IssueDate', ns)
        fecha_val = fecha.text if fecha is not None else datetime.now().strftime('%Y-%m-%d')

        proveedor_name = root.find('.//cac:AccountingSupplierParty//cac:PartyName/cbc:Name', ns)
        proveedor_name_alt = root.find('.//cac:AccountingSupplierParty//cac:RegistrationName', ns)
        proveedor = proveedor_name.text if proveedor_name is not None else (proveedor_name_alt.text if proveedor_name_alt is not None else "Desconocido")

        # cbc:ID se repite en muchos lugares de un documento UBL (proveedor, medios de
        # pago, etc.) — solo el que cuelga directo de la raíz es el número de factura.
        numero = root.find('cbc:ID', ns)
        cufe = root.find('cbc:UUID', ns)
        numero_factura = (numero.text if numero is not None else None) or (cufe.text if cufe is not None else None) or ""

        total = root.find('.//cac:LegalMonetaryTotal/cbc:PayableAmount', ns)
        subtotal = root.find('.//cac:LegalMonetaryTotal/cbc:LineExtensionAmount', ns)
        iva = root.find('.//cac:TaxTotal/cbc:TaxAmount', ns)

        total_val = float(total.text) if total is not None else 0.0
        subtotal_val = float(subtotal.text) if subtotal is not None else 0.0
        iva_val = float(iva.text) if iva is not None else 0.0

        if total_val < 0 or subtotal_val < 0 or iva_val < 0:
            print(f"XML rechazado por montos negativos: {xml_file_path}")
            return None

        items = root.findall('.//cac:InvoiceLine/cac:Item/cbc:Description', ns)
        descripcion = ", ".join([item.text for item in items[:3]]) if items else "Compra de materiales/servicios"

        return {
            "fecha": fecha_val,
            "proveedor": proveedor,
            "numero_factura": numero_factura,
            "subtotal": subtotal_val,
            "iva": iva_val,
            "total": total_val,
            "descripcion": descripcion,
            "categoria": "General"
        }
    except Exception as e:
        print(f"Error parseando XML {xml_file_path}: {e}")
        return None


def _extraer_zip_seguro(filepath, dest_dir):
    """Extrae un ZIP validando cada entrada contra path traversal (Zip Slip) y un
    tope de tamaño sin comprimir (zip bomb). Devuelve la lista de XML extraídos."""
    xml_files = []
    dest_real = os.path.realpath(dest_dir)
    with zipfile.ZipFile(filepath, 'r') as zip_ref:
        tamano_total = sum(info.file_size for info in zip_ref.infolist())
        if tamano_total > MAX_ZIP_DESCOMPRIMIDO:
            print(f"ZIP rechazado por tamaño sin comprimir ({tamano_total} bytes): {filepath}")
            return xml_files

        for info in zip_ref.infolist():
            nombre_seguro = os.path.basename(info.filename)
            if not nombre_seguro:
                continue
            destino = os.path.join(dest_dir, nombre_seguro)
            if os.path.dirname(os.path.realpath(destino)) != dest_real:
                print(f"Entrada de ZIP rechazada por path traversal: {info.filename}")
                continue
            with zip_ref.open(info) as src, open(destino, "wb") as out:
                shutil.copyfileobj(src, out)
            if nombre_seguro.lower().endswith('.xml'):
                xml_files.append(destino)
    return xml_files


def _mensaje_ya_procesado(conn, cuenta, message_id):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM correos_procesados WHERE cuenta = %s AND message_id = %s LIMIT 1",
            (cuenta, message_id),
        )
        return cur.fetchone() is not None


def _marcar_mensaje_procesado(conn, cuenta, message_id):
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO correos_procesados (cuenta, message_id) VALUES (%s, %s) ON CONFLICT (cuenta, message_id) DO NOTHING",
                (cuenta, message_id),
            )
        conn.commit()
    except Exception as e:
        print(f"Error marcando correo procesado: {e}")
        conn.rollback()


def _factura_duplicada(conn, proveedor, numero_factura, fecha, total):
    with conn.cursor() as cur:
        if numero_factura:
            cur.execute(
                "SELECT 1 FROM facturas_compra WHERE proveedor = %s AND numero_factura = %s LIMIT 1",
                (proveedor, numero_factura),
            )
        else:
            cur.execute(
                "SELECT 1 FROM facturas_compra WHERE proveedor = %s AND fecha = %s AND total = %s LIMIT 1",
                (proveedor, fecha, total),
            )
        return cur.fetchone() is not None


def _guardar_factura(conn, data, archivo_origen):
    """Intenta guardar una factura ya extraída. Devuelve 'guardada', 'duplicada' o 'error'."""
    try:
        fecha_obj = datetime.strptime(data['fecha'], '%Y-%m-%d')
    except (KeyError, TypeError, ValueError):
        return "error"

    numero_factura = data.get('numero_factura') or None
    proveedor = data['proveedor']
    total = data['total']

    if _factura_duplicada(conn, proveedor, numero_factura, fecha_obj.date(), total):
        return "duplicada"

    mes_str = MESES[fecha_obj.month - 1]
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO facturas_compra
                (fecha, mes, proveedor, numero_factura, categoria, descripcion, subtotal, iva, total, archivo_origen)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                fecha_obj, mes_str, proveedor, numero_factura, data.get('categoria', 'General'),
                data.get('descripcion', 'Compra de materiales/servicios'), data['subtotal'], data['iva'], data['total'], archivo_origen
            ))
        conn.commit()
        return "guardada"
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return "duplicada"
    except Exception as e:
        print(f"Error insertando factura: {e}")
        conn.rollback()
        return "error"


def _registrar_resultado(resultado, estado):
    clave = {"guardada": "guardadas", "duplicada": "duplicadas", "error": "errores"}[estado]
    resultado[clave] += 1
    return estado == "error"


def _nombre_adjunto_seguro(part):
    filename = part.get_filename()
    if not filename:
        return None
    if decode_header(filename)[0][1] is not None:
        try:
            decoded, charset = decode_header(filename)[0]
            if isinstance(decoded, bytes):
                filename = decoded.decode(charset or 'utf-8')
        except Exception:
            pass
    return os.path.basename(filename) or None


def procesar_adjunto(conn, resultado, filename, contenido, temp_dir):
    """Procesa un adjunto ya en memoria (XML, ZIP o PDF): extrae los datos de la
    factura y aplica el guardado anti-duplicados. Actualiza `resultado` in place
    (mismas claves que usa `_registrar_resultado`). Devuelve True si hubo error real.

    Punto de entrada compartido entre el escaneo IMAP propio (process_account) y
    el endpoint que recibe adjuntos ya descargados por n8n.
    """
    os.makedirs(temp_dir, exist_ok=True)
    nombre_seguro = os.path.basename(filename) or "adjunto"
    filepath = os.path.join(temp_dir, nombre_seguro)
    with open(filepath, "wb") as f:
        f.write(contenido)

    hubo_error_real = False
    nombre_lower = nombre_seguro.lower()

    if nombre_lower.endswith('.zip'):
        xml_paths = _extraer_zip_seguro(filepath, temp_dir)
        if not xml_paths:
            hubo_error_real = _registrar_resultado(resultado, "error") or hubo_error_real
        for xml_path in xml_paths:
            data = extract_ubl_data(xml_path)
            estado = _guardar_factura(conn, data, nombre_seguro) if data else "error"
            hubo_error_real = _registrar_resultado(resultado, estado) or hubo_error_real
    elif nombre_lower.endswith('.xml'):
        data = extract_ubl_data(filepath)
        estado = _guardar_factura(conn, data, nombre_seguro) if data else "error"
        hubo_error_real = _registrar_resultado(resultado, estado) or hubo_error_real
    elif nombre_lower.endswith('.pdf'):
        data = extract_pdf_data_ai(contenido)
        estado = _guardar_factura(conn, data, nombre_seguro) if data else "error"
        hubo_error_real = _registrar_resultado(resultado, estado) or hubo_error_real
    else:
        hubo_error_real = _registrar_resultado(resultado, "error") or hubo_error_real

    return hubo_error_real


def process_account(conn, cuenta_nombre, server, user, password):
    resultado = {"cuenta": cuenta_nombre, "guardadas": 0, "duplicadas": 0, "errores": 0}

    mail = connect_imap(server, user, password)
    if not mail:
        resultado["errores"] += 1
        resultado["mensaje"] = "No se pudo conectar (revisar usuario/contraseña de aplicación)"
        return resultado

    account_temp_dir = os.path.join(TEMP_DIR, cuenta_nombre)
    try:
        os.makedirs(account_temp_dir, exist_ok=True)
        mail.select("inbox")

        desde = (datetime.now() - timedelta(days=DIAS_HISTORIAL)).strftime("%d-%b-%Y")
        status, messages = mail.uid('search', None, f'(SINCE "{desde}") (OR SUBJECT "Factura" SUBJECT "electronica")')

        if status != "OK" or not messages[0]:
            resultado["mensaje"] = "Sin correos con facturas en los últimos 90 días"
            return resultado

        for uid in messages[0].split()[:MAX_MENSAJES_POR_CUENTA]:
            message_id = uid.decode()
            if _mensaje_ya_procesado(conn, cuenta_nombre, message_id):
                continue

            res, msg_data = mail.uid('fetch', uid, '(RFC822)')
            if res != "OK":
                continue

            hubo_error_real = False
            algo_procesado = False

            for response_part in msg_data:
                if not isinstance(response_part, tuple):
                    continue
                msg = email.message_from_bytes(response_part[1])

                for part in msg.walk():
                    if part.get_content_maintype() == 'multipart':
                        continue
                    if part.get('Content-Disposition') is None:
                        continue

                    filename = _nombre_adjunto_seguro(part)
                    if not filename:
                        continue
                    contenido = part.get_payload(decode=True)
                    if not contenido:
                        continue

                    algo_procesado = True
                    hubo_error_real = procesar_adjunto(conn, resultado, filename, contenido, account_temp_dir) or hubo_error_real
                    if filename.lower().endswith('.pdf'):
                        time.sleep(1)  # no saturar la cuota gratuita de Gemini

            if algo_procesado and not hubo_error_real:
                _marcar_mensaje_procesado(conn, cuenta_nombre, message_id)
    finally:
        mail.logout()
        shutil.rmtree(account_temp_dir, ignore_errors=True)

    return resultado


def process_emails(conn):
    detalle = []
    total = {"guardadas": 0, "duplicadas": 0, "errores": 0}
    alguna_cuenta_configurada = False

    for cfg in CUENTAS:
        user = os.getenv(cfg["user_env"])
        password = os.getenv(cfg["pass_env"])
        if not user or not password:
            detalle.append({"cuenta": cfg["nombre"], "mensaje": "Cuenta no configurada, omitida"})
            continue

        alguna_cuenta_configurada = True
        try:
            resultado_cuenta = process_account(conn, cfg["nombre"], cfg["server"], user, password)
        except Exception as e:
            resultado_cuenta = {"cuenta": cfg["nombre"], "guardadas": 0, "duplicadas": 0, "errores": 1, "mensaje": f"Fallo inesperado: {e}"}

        detalle.append(resultado_cuenta)
        total["guardadas"] += resultado_cuenta.get("guardadas", 0)
        total["duplicadas"] += resultado_cuenta.get("duplicadas", 0)
        total["errores"] += resultado_cuenta.get("errores", 0)

    if not alguna_cuenta_configurada:
        return {
            "status": "error",
            "message": "Faltan credenciales — ninguna cuenta de correo está configurada (GMAIL_USER/GMAIL_PASS, YAHOO1_USER/YAHOO1_PASS, YAHOO2_USER/YAHOO2_PASS)",
            "facturas_guardadas": 0,
            "duplicadas": 0,
            "errores": 0,
        }

    return {
        "status": "success",
        "message": "Proceso ETL completado",
        "facturas_guardadas": total["guardadas"],
        "duplicadas": total["duplicadas"],
        "errores": total["errores"],
        "detalle_por_cuenta": detalle,
    }
