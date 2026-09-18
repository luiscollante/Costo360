# Centro de Control Costo360 S.A.S.

Fecha: 2026-09-17. Autorización: el fundador pidió explícitamente documentar Y construir un sistema propio, centrado en CRM, con Gemini API y herramientas. El techo de $300.000 propuesto anteriormente NO fue aprobado y no es una restricción de este proyecto.

## 1. Decisiones de producto
- Oferta inicial: exclusivamente suscripciones al software Costo360.
- CRM propio; no contratar CRM ni agencia/desarrollador externo.
- Diferenciar producto vendido a empresas (Capa A) y operación interna de Costo360 (Capa B).
- Núcleo: ficha única de empresa prospecto/cliente, múltiples contactos, oportunidades, actividades, tareas y soporte. Compras/proveedores y suscripciones acompañan el núcleo, no lo reemplazan.
- IA: Gemini mediante API. No reutilizar claves ni credenciales del producto automáticamente. Elegir modelo explícitamente al configurar.
- «Control del sistema» significa operaciones autorizadas mediante herramientas tipadas, NO SQL libre, terminal, navegación arbitraria o acceso al computador.
- Las políticas y herramientas reducen riesgos; no garantizan ausencia total de alucinaciones. No se está realizando fine-tuning.

## 2. Entrega incremental
### Incremento 1 (implementación local en esta sesión)
- Aplicación independiente `agentes-operacion/centro-control/`.
- Empresas, contactos, oportunidades, actividades, tareas, tickets, proveedores, compras y registro de suscripciones.
- Búsqueda, filtros, tablero comercial, ficha relacionada, registro de cambios, archivo/restauración y panel de prioridades.
- Usuarios internos con roles fundador, comercial y lectura (provisión por consola; gestión visual del equipo posterior).
- Gemini con herramientas específicas por dominio: listar, ver, proponer crear/editar/archivar/restaurar.
- Escrituras del agente sujetas a confirmación humana técnica, con caducidad y control de versión.
- Pruebas automáticas de permisos, validaciones, referencias, duplicados, confirmaciones y herramientas.

### Incrementos siguientes (NO afirmar construidos)
1. Provisión visual de equipo, asignación por usuario, políticas de visibilidad por departamento, importación CSV validada y exportaciones con permisos.
2. Suscripciones completas: periodos/renovaciones, historial de cambios, cobros/conciliación, conexión controlada con el producto. Ganar una oportunidad NO activa una cuenta ni demuestra pago.
3. Automatizaciones programadas, recordatorios, deduplicación asistida, correo/WhatsApp oficial si el fundador decide conectarlos. No enviar mensajes externos hoy.
4. Procedimientos, documentos privados, base de conocimiento versionada, evaluaciones adversariales periódicas del agente, políticas de autonomía por acción.
5. Despliegue compartido endurecido, PostgreSQL, migraciones verificadas, backups restaurables, TLS/MFA y auditoría independiente.

## 3. Arquitectura y alternativas
Elegida: monolito modular independiente (React + TypeScript + FastAPI + SQLAlchemy). Evita mantener muchos agentes/microservicios antes de necesitarlo. Alternativa descartada para esta fase: añadir pantallas internas al SaaS de clientes, por mezclar permisos/datos y aumentar riesgo sobre producción.

Almacenamiento del piloto: SQLite local, biblioteca incluida en Python, anunciada al fundador antes de implementarla. Docker no tiene daemon activo. NO conectar a Supabase ni leer `.env` del producto. SQLAlchemy permite preparar un camino a PostgreSQL, pero esa compatibilidad requerirá migraciones y pruebas: no está certificada por elegir una librería.

Registros de negocio con envoltura común (UUID, tipo, relación padre, versión, archivo, fechas) y datos JSON validados por modelos específicos. Permite un primer sistema pequeño coherente; no sustituye un modelo relacional normalizado para reporting/escala. Relaciones padre como FK; comprobaciones de dominio en servicios compartidos entre API y herramientas. Listados paginados y límites.

## 4. Flujo del fundador
1. Registrar empresa y origen del prospecto.
2. Añadir interlocutores/contactos.
3. Abrir oportunidad de suscripción (plan, etapa, importe mensual previsto, siguiente paso).
4. Registrar llamadas/demos/notas y tareas con vencimiento.
5. Marcar oportunidad ganada/perdida; registrar cliente/suscripción por separado (sin fingir cobro ni activar producto).
6. Consultar expediente unificado y tickets.
7. Consultar a Gemini; revisar datos consultados y propuestas pendientes; confirmar o rechazar.

## 5. Seguridad del piloto
- Solo localhost; no apto para publicar en Internet.
- Sin cuenta ni contraseña predeterminada para datos reales. Inicialización explícita por consola. Modo demo explícito con datos ficticios y base separada.
- Contraseñas con scrypt y salt; sesiones opacas con hash en almacenamiento, caducidad y cookie HttpOnly/SameSite=Strict; comprobación Origin y token CSRF en escrituras.
- Roles verificados en backend; propuestas privadas por autor. Archivo/restauración reservado al fundador. Sin DELETE permanente en API ni herramientas.
- Confirmar NO existe como herramienta Gemini. Cambios y confirmaciones auditados en una transacción; versiones impiden sobreescribir cambios recientes. Repetir confirmación no repite acción.
- Gemini recibe únicamente resultados de herramientas acotados. Notas y campos de negocio son contenido no confiable, nunca instrucciones.
- No enviar secretos al modelo; configuración de API exclusivamente backend. No registrar credenciales.
- Límite de llamadas diario y de pasos por turno, sin reintentos automáticos de llamadas pagadas. No equivale a un techo monetario exacto.
- Ante fallo de IA: el CRM manual sigue disponible; no afirmar que una acción fue ejecutada.

## 6. Revisión y limitaciones del proceso
No hay herramientas para invocar subagentes ni grafo de código en esta sesión. Se consultan como listas de revisión los archivos Software Architect, Security Engineer y Code Reviewer de `Agents/`; NO constituye auditoría independiente. Se verifica con pruebas reales y se documentan pendientes. No desplegar antes de revisión independiente.

## 7. Criterios de aceptación
- Guardar prospecto y contacto, crear oportunidad, registrar seguimiento y consultarlos tras recargar.
- Datos persistentes; estado vacío real cuando no existen datos.
- No autenticado: acceso denegado. Lectura: sin escritura. Comercial: sin archivo/restauración.
- Datos inválidos/referencia incompatible/duplicado exacto/versión vieja: rechazo sin modificación parcial.
- Propuesta sola no cambia negocio; confirmar cambia exactamente la fila prevista una vez; rechazar/caducar no cambia negocio.
- Agente sin clave/modelo: aviso explícito, nunca respuesta fingida.
- Build frontend y tests backend exitosos. Gemini real pendiente hasta configurar clave y autorizar prueba pagada.

## 8. Costos y alcance
Software construido por el fundador con IA; no contratar CRM. No prometer costo total cero: Gemini, alojamiento futuro y mantenimiento tienen costo. El Excel se conserva intacto como modelo financiero de referencia, no fuente de caja disponible.
