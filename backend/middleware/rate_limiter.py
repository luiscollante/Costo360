from slowapi import Limiter
from slowapi.util import get_remote_address

# NOTA (hallazgo S15 / Fase 5): `get_remote_address` usa la IP del socket
# (`request.client.host`) y el estado del limiter vive en memoria de ESTE proceso.
# Es correcto si el backend está expuesto directamente y corre como un solo proceso
# (el caso de esta fase: servidor pequeño siempre encendido). Si se pone detrás de un
# proxy inverso / balanceador / Cloudflare, TODOS los buckets por IP se vuelven
# globales — hay que cambiar `key_func` para leer `X-Forwarded-For` de un proxy de
# confianza y mover el estado a un store compartido (Redis) antes de escalar a varios
# procesos. Ver docs/PLAN_FASE_2A.md (deuda anotada).
limiter = Limiter(key_func=get_remote_address)
