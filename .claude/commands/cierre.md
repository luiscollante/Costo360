---
description: Cierra la sesión de trabajo actual — actualiza PROGRESS.md, SESSION.md y la memoria del proyecto para que la próxima sesión retome exactamente donde quedó
---

Estás cerrando la sesión de trabajo actual del proyecto Costo360. Sigue estos pasos en orden, sin pedir aprobación adicional (el usuario ya aprobó este flujo al crear este comando el 2026-08-08) — pero si algo del estado de la sesión no está claro, pregunta antes de escribir información incorrecta:

1. **Repasa toda la conversación de esta sesión** — qué se decidió, qué archivos se crearon o modificaron, qué quedó pendiente, y cuál debería ser la primera tarea de la próxima sesión.

2. **Actualiza `PROGRESS.md`** (raíz del proyecto):
   - Mueve a "✅ Hecho" todo lo que se completó en esta sesión.
   - Actualiza "🔄 En progreso" con el estado real actual (o déjalo vacío si no hay nada a medio camino).
   - Actualiza "📋 Siguiente" con las tareas pendientes reales, en orden de prioridad.
   - Actualiza la fecha en "*Última actualización:*" al final del archivo.

3. **Actualiza `SESSION.md`** (raíz del proyecto):
   - Agrega una nueva entrada arriba del todo (más reciente primero), con el formato de las entradas anteriores: `## Sesión: YYYY-MM-DD`, luego "Qué se hizo", "Archivos modificados"/"Archivos creados", "Decisiones tomadas", "Primera tarea de la próxima sesión".
   - Sé específico: nombra archivos, decisiones concretas y cualquier riesgo o pendiente detectado.

4. **Actualiza la memoria del proyecto** en `C:\Users\wases\.claude\projects\C--Costo360\memory\`:
   - Si hubo decisiones de arquitectura, técnicas o de negocio nuevas y duraderas → actualiza `project_costo360.md` (o crea un archivo de memoria nuevo si el tema no encaja en los existentes).
   - Si el usuario corrigió o confirmó alguna forma de trabajar → guárdalo como memoria tipo `feedback`.
   - Actualiza `MEMORY.md` (el índice) si agregaste o cambiaste algún archivo de memoria — una línea por archivo, sin contenido inline.
   - No dupliques memorias existentes; si un archivo ya cubre el tema, edítalo en vez de crear uno nuevo.

5. **Si hay cambios de código sin commitear en el git local**, pregunta al usuario si quiere que hagas un commit local antes de cerrar (nunca hagas commit ni toques la configuración de git sin que el usuario lo pida explícitamente en esta sesión).

6. **Confirma al usuario** con un resumen breve (unas pocas líneas, sin tecnicismos) de qué quedó guardado y cuál es la primera tarea de la próxima sesión — así sabe que puede cerrar con tranquilidad.
