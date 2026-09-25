# Oferta de planes de Costo360 · 2026-09-22

Costo360 se presenta al público como empresa de tecnología para la industria de la piedra. La solicitud del fundador incluye conservar el diseño de `tarjetas_planes.png`, corregir sus prestaciones y ofrecer Cost también en Starter.

| Plan | Mensualidad COP | Usuarios | Registro de acciones de Cost |
| --- | ---: | --- | --- |
| Starter | $150.000 | 1 administrador | 1 día |
| Pro | $375.000 | 1 administrador + 2 integrantes | 30 días |
| Enterprise | $875.000 | Hasta 10 | 90 días |

Precio Enterprise confirmado expresamente por el fundador el 2026-09-25. Sustituye la tarifa anterior de $2.410.000 en la oferta comercial. La migración `0016_precio_enterprise_875000.sql` se aplicó a la tabla `planes` el mismo día: Enterprise $875.000, Pro $375.000 y Starter $150.000. El checkout consulta ese catálogo para las nuevas solicitudes; no se modificaron pagos existentes.

Fuentes: `ARQUITECTURA_MAESTRA.md` (§7.1 y planes), `backend/agente/bitacora.py` y decisión expresa del fundador sobre Starter. Las cifras antiguas de 1 usuario en Pro y $600.000 en Enterprise están desactualizadas.

Los módulos de cotización Directa/Express/AIU, PDF, materiales, inventario, retales, nesting, dashboard y proyectos son compartidos. Pro y Enterprise permiten colaboración con permisos por rol. El dashboard corresponde a Admin y Gerencia. La retención indicada es exclusivamente del registro de acciones de Cost, no del historial de cotizaciones. Toda escritura o borrado de Cost requiere confirmación humana.

La landing conserva el diseño marfil/esmeralda/dorado. Se reemplaza “Más popular” por “Para colaborar”: no existen datos aportados que prueben popularidad. Se eliminan promesas de soporte especial y se aclara que la IA tiene cupos mensuales. No se anuncian conversaciones ilimitadas, voz en Starter ni funciones de contabilidad o DIAN.

## Pendiente antes de publicar

El valor por defecto de Cost para Starter en `backend/services/consumo_service.py` es cero (`_TOPES_GEMINI_COP_DEFAULT`), y bloquea incluso la primera conversación salvo configuración particular de la empresa. Incluirlo en la oferta comercial no habilita el producto automáticamente. Falta establecer un cupo positivo, verificar la configuración de empresas existentes y probar acceso Starter. La voz es un cupo independiente y permanece fuera de esta decisión. Esta entrega edita la landing y la imagen; no despliega cambios ni altera suscripciones.

La documentación financiera de agosto excluye Cost de Starter y asume una arquitectura de IA distinta de la actual. La decisión comercial actual sustituye esa exclusión; el modelo financiero requiere actualización aparte, sin modificar aquí sus cifras históricas.

## Archivos visuales

- Original encontrado en `C:/Users/wases/Desktop/Universidad/Opción de grado/Costo360/tarjetas_planes.png`; idéntico por SHA256 a `_scratch/tarjetas_planes.png`.
- Imagen corregida: `output/imagegen/planes-costo360-v2.png`.
- Prompt exacto: `output/imagegen/planes-costo360-prompt.txt`.
- Generada con la herramienta integrada de OpenAI; original conservado.

## Verificación local

`npm test` terminó con **14 pruebas aprobadas**: compilación y prerender, hidratación, enlaces, navegación, recursos, metadatos y contraste automático a 320/390/768/1440 px. Revisión visual adicional de tarjetas en escritorio y móvil: `landing/artifacts/planes-desktop.png` y `landing/artifacts/planes-mobile.png`. No se publicaron cambios. Se conservaron los cambios previos del fundador en estilos, tipografías y recursos, y los cambios ajenos a la landing.
