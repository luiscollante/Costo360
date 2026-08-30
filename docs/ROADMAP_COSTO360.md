# ROADMAP_COSTO360.md — Ruta de desarrollo completo

*Creado el 2026-08-26. Convierte los 5 objetivos que el fundador definió en esa fecha en un plan
por fases, con dependencias explícitas. Cuando estos 5 objetivos se completen, este documento se
actualiza con la siguiente ronda de objetivos — no se reemplaza, se extiende.*

---

## Los 5 objetivos (tal como los definió el fundador, 2026-08-26)

1. Rediseño de la interfaz del producto de Costo360 (la que usan los talleres clientes) — **sin
   cambiar los cálculos ni la lógica del motor ya establecidos.**
2. Landing page de gran impacto — animaciones e interfaz entretenida y atrapante.
3. Creación de los agentes de IA que operan casi el 100% de Costo360 S.A.S. (empresa todavía no
   constituida legalmente).
4. Infraestructura **gratuita** para esos agentes de IA, lista para migrar a infraestructura de
   pago (Microsoft/Azure/Railway) cuando haya presupuesto real.
5. Agente de IA integrado en el producto — asistente personal por usuario, navega la interfaz de
   forma autónoma para maximizar la eficiencia al cotizar.

---

## Por qué no se atacan los 5 al mismo tiempo

Costo360 se construye con una sola persona (el fundador, no programador) + Claude Code — no hay
equipo. Atacar 5 frentes simultáneos diluye el trabajo sin avanzar ninguno de verdad. En cambio, se
agrupan por **dependencia técnica real**, no por orden de preferencia:

- El **Objetivo 1** tiene una regla no negociable — "ningún cliente ve datos de otro" — que hoy es
  **imposible de cumplir** porque la base de datos no tiene el concepto de "empresa" en ninguna
  tabla (hallazgo documentado en `ARQUITECTURA_MAESTRA.md`, sección 4). Rediseñar la interfaz sobre
  esa base sería maquillar el problema, no resolverlo.
- El **Objetivo 5** (agente dentro del producto) necesita que la interfaz nueva del Objetivo 1 ya
  exista, para que el agente tenga algo sobre lo cual navegar.
- Los **Objetivos 3 y 4** (agentes de operación de la empresa) viven en una carpeta aparte
  (`agentes-operacion/`), no tocan `web/` ni `backend/` — pueden avanzar en paralelo sin chocar con
  el resto.
- El **Objetivo 2** (landing page) es independiente de todo lo anterior — es su propio sitio.

---

## Fase 0 — Fundamento del proyecto (completada 2026-08-26)

- ✅ Harness completado (`HARNESS_INICIO.md`, `ARQUITECTURA_MAESTRA.md`, `PATRONES_DE_ERROR.md`).
- ✅ Este documento de ruta.

---

## Fase 1 — Resolver el bloqueo técnico del Objetivo 1 ✅ esquema creado 2026-08-26/27

**Qué es:** darle a la base de datos el concepto de "empresa" (aislamiento multi-tenant) para que
la Regla 1 ("ningún cliente ve datos de otro") sea real y no solo una intención. Esto incluye,
como mínimo:
- Agregar `empresa_id` a las tablas que hoy no lo tienen (`usuarios`, `cotizaciones`, `app_config`,
  inventario, retales, catálogo).
- Definir cómo nace una "empresa" en el sistema (alta de una cuenta nueva = alta de una empresa).
- Convertir `usuarios.rol` (hoy texto libre) en un catálogo cerrado de permisos, con nombre visible
  editable por el Admin (Regla 3).
- Sentar las bases para la sesión única con control real (Regla 5) — no necesariamente
  implementarla completa en esta fase, pero sí dejar la estructura de datos lista.

**Por qué va primero:** todo lo demás del Objetivo 1 (pantallas, navegación, componentes) se
construye sobre esto. Hacerlo después obligaría a rehacer trabajo.

**Cómo se abordó:** ciclo `/goal` completo (Planear → Validar → Ejecutar → Validar → Guardar, ver
`HARNESS_INICIO.md`) — planeado, auditado en dos pasadas independientes (Security Engineer sobre el
plan, Database Optimizer sobre el SQL concreto), corregido tras ambas rondas, y aplicado al proyecto
Supabase real (organización "Costo360", antes vacía). Ver `ARQUITECTURA_MAESTRA.md` sección 4 para
el detalle completo y `backend/migrations/0001_esquema_multitenant.sql` +
`0002_revocar_anon_empresa_actual.sql` para el SQL exacto que se aplicó.

**✅ Completado 2026-08-27 (rama `goal/fase-2a-multitenant-auth`, ciclo `/goal` completo):**
la migración a Supabase Auth, `backend/db/client.py` con `db_rls` (RLS real en el backend) +
`db_service`, el trigger de aprovisionamiento (`handle_new_user` gateado por la tabla
`invitaciones`), el trigger de cupo por plan, la sesión única con aviso real (Regla 5), y el
frontend sobre Supabase Auth. Migraciones `0003`/`0004` aplicadas. Auditado en Fase 2 (plan) y
Fase 5 (código) por 4 agentes; aislamiento verificado por SQL. **Falta solo la prueba en vivo
por HTTP (B8), que necesita el `.env` del fundador**, y fusionar la rama a `master`. Detalle:
`docs/PLAN_FASE_2A.md`.

---

## Fase 2 — Tres frentes en paralelo

Una vez resuelto el fundamento de la Fase 1, estos tres frentes no se pisan entre sí y pueden
avanzar en el orden que el fundador prefiera sesión a sesión:

### 2.A — Objetivo 1: Rediseño de la interfaz del producto  ← **frente activo tras cerrar B8**

> **Insumo:** `docs/REVISION_UX_2026-08-29.md` — revisión de UI/UX/Accesibilidad/Marca del
> prototipo en vivo por 3 agentes de diseño, con las 12 correcciones priorizadas para arrancar.

Sobre la base de datos ya multi-tenant **y el backend ya aislado + con Supabase Auth**: nuevas
pantallas/componentes para los módulos existentes (Cotización Directa/Express/AIU, Dashboard,
Historial, Inventario, Retales, Nesting, Parámetros, Configuración, Panel Admin), aplicando las 8
reglas de arquitectura y la identidad de marca real (`ARQUITECTURA_MAESTRA.md`, secciones 6-7).
**No se tocan `motor/calculos.py` ni `motor/parametros.py`** — la lógica de cálculo ya está
validada. Nota: el `AdminPage` ya se reescribió al modelo de invitación en la Fase 2.A (base
funcional, sin pulido visual); `LoginPage`/`ResetPasswordPage` ya usan la paleta de marca.

### 2.B — Objetivo 4: Infraestructura gratuita para los agentes de operación
Montar la versión gratuita del diseño ya definido en `docs/ARQUITECTURA_AGENTES_OPERACION.md`:
Postgres/pgvector (puede compartir el proyecto Supabase existente en su capa gratuita, con
`schema` separado), hosting gratuito para el proceso de los agentes (alternativa gratuita a Azure
Container Apps mientras no haya presupuesto — a decidir en el ciclo de esta fase), Langfuse
autoalojado (ya es gratis por diseño). Dejar documentado en `ARQUITECTURA_MAESTRA.md` cuál pieza
migra a cuál servicio de pago cuando llegue la inversión.

### 2.C — Objetivo 3: Primer agente de operación real
Con la infraestructura de 2.B lista, construir el primer agente (Atención al Cliente, ya elegido
como el primero en `docs/ARQUITECTURA_AGENTES_OPERACION.md` sección 0) en `agentes-operacion/`. Los
otros 6 agentes se construyen uno a la vez después, reutilizando la misma base.

---

## Fase 3 — Objetivo 5: Agente de IA dentro del producto

Una vez la interfaz nueva del Objetivo 1 exista (Fase 2.A completada), evolucionar el agente actual
de Parámetros hacia el asistente personal por usuario que navega la interfaz de forma autónoma
(CopilotKit/AG-UI, decisión de la Ruta A) — sin reemplazar nunca la navegación manual (Regla 7).

---

## En paralelo, en cualquier momento — Objetivo 2: Landing page

No depende de ninguna otra fase. El scaffold ya existe
(`web/src/pages/LandingPage.tsx` + `web/src/components/landing/` +
`web/src/components/ui/*` para efectos). Se puede trabajar cuando el fundador quiera ver algo
visualmente vistoso pronto, sin esperar a que avancen las otras fases.

---

## Cómo se actualiza este documento

Cada vez que una fase avanza o se completa, se marca aquí (✅) y se actualiza `PROGRESS.md`/
`SESSION.md` con el detalle día a día. Cuando los 5 objetivos originales estén completos, se agrega
una nueva sección "Ronda 2" con los siguientes objetivos que el fundador defina — este documento no
se reemplaza, se extiende.
