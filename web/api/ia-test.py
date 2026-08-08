import json
import os
from http.server import BaseHTTPRequestHandler

from google import genai


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        api_key = os.environ.get("GEMINI_API_KEY")

        if not api_key:
            self._responder(500, {"error": "Falta GEMINI_API_KEY en el entorno"})
            return

        try:
            client = genai.Client(api_key=api_key)
            respuesta = client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents="Responde solo con la palabra: listo",
            )
            self._responder(200, {"modelo": "gemini-3.5-flash-lite", "respuesta": respuesta.text})
        except Exception as exc:
            self._responder(500, {"error": str(exc)})

    def _responder(self, status: int, body: dict):
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode("utf-8"))
