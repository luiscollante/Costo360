-- ============================================================================
-- Costo360 — Esquema multi-tenant inicial
-- Proyecto Supabase: organización "Costo360" (vacío al momento de escribir esto,
-- se crea desde cero — no hay datos reales que migrar).
--
-- Creado: 2026-08-26, dentro del ciclo /goal de la Fase 1 del roadmap
-- (docs/ROADMAP_COSTO360.md). Planeado por Claude, auditado de forma
-- independiente en DOS pasadas distintas (Security Engineer sobre el plan,
-- Database Optimizer sobre este SQL concreto), y revisado por el fundador.
-- Contexto completo: ARQUITECTURA_MAESTRA.md secciones 4 y 7.
--
-- Decisiones del fundador incorporadas en este archivo:
--   - Login vía Supabase Auth (no usuario/contraseña propio).
--   - Catálogo de materiales compartido entre todas las empresas.
--   - 3 roles fijos: admin, gerencia, operativo — Gerencia tiene los mismos
--     permisos de visibilidad que Admin (Dashboard, modo BI Senior, datos
--     agregados del Agente), pero NO gestiona usuarios (confirmado 2026-08-26,
--     corrige la Regla 6 de la entrevista de producto del 2026-08-24, que decía
--     "exclusivos del Admin").
--   - `facturas_compra` y `correos_procesados` (tablas del backend actual) NO
--     se recrean aquí — son sobras de un proyecto no relacionado con Costo360
--     (confirmado 2026-08-26).
--   - Se crea una tabla `sesion_activa` mínima (sin lógica todavía) para no
--     perder el punto de apoyo de la Regla 5 (sesión única con aviso real),
--     que se implementa en la Fase 2.A (confirmado 2026-08-26).
--
-- Segunda auditoría (Database Optimizer, 2026-08-26) encontró un hallazgo
-- crítico ya corregido en este archivo: las políticas de UPDATE sobre
-- `usuarios` y `empresas` en la primera versión permitían que cualquier
-- usuario autenticado se autoascendiera de rol o editara el plan de su propia
-- empresa (explotable de inmediato vía la API REST automática de Supabase,
-- no solo a través del backend FastAPI). Ver sección 8 — ya no existe policy
-- de UPDATE para usuarios normales en esas dos tablas.
-- ============================================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
-- Nota: gen_random_uuid() es nativo de PostgreSQL 13+ (pg_catalog), Supabase
-- corre en PG13+ hoy — esta extensión no es estrictamente necesaria para eso,
-- se deja por compatibilidad/portabilidad, no como dependencia real.
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. CATÁLOGOS DE REFERENCIA (compartidos entre todas las empresas)
-- ============================================================

create table planes (
    codigo              text primary key,
    nombre              text not null,
    precio_mensual_cop  numeric(14,2) not null,
    cupo_usuarios       integer not null
);

insert into planes (codigo, nombre, precio_mensual_cop, cupo_usuarios) values
    ('starter',    'Starter',    150000,   1),
    ('pro',        'Pro',        375000,   3),
    ('enterprise', 'Enterprise', 2410000, 10);

-- Catálogo cerrado de roles (Regla 3: nombre libre para el usuario final vía
-- usuarios.cargo_visible, permiso fijo aquí). Matriz de capacidades confirmada
-- por el fundador el 2026-08-26.
create table roles_catalogo (
    codigo                              text primary key,
    nombre                              text not null,
    puede_ver_dashboard                 boolean not null default false,
    puede_usar_modo_bi_senior           boolean not null default false,
    puede_pedir_datos_agregados_agente  boolean not null default false,
    puede_gestionar_usuarios            boolean not null default false
);

insert into roles_catalogo
    (codigo, nombre, puede_ver_dashboard, puede_usar_modo_bi_senior, puede_pedir_datos_agregados_agente, puede_gestionar_usuarios)
values
    ('admin',     'Administrador', true,  true,  true,  true),
    ('gerencia',  'Gerencia',      true,  true,  true,  false),
    ('operativo', 'Operativo',     false, false, false, false);

-- Mismas columnas que el catálogo actual (backend/main.py), sin empresa_id:
-- es compartido, cada empresa personaliza sus costos por encima vía app_config.
-- proveedor ya no tiene default 'Gramar' (era el proveedor de un solo taller
-- piloto) — deliberado, el catálogo ahora es compartido entre empresas.
create table catalogo_materiales (
    id              bigint generated always as identity primary key,
    categoria       text          not null,
    referencia      text          not null,
    precio_m2       numeric(14,2) not null default 0,
    precio_lamina   numeric(14,2),
    ancho_lamina_cm numeric,
    alto_lamina_cm  numeric,
    proveedor       text          not null default '',
    activo          boolean       not null default true
);
create index idx_catalogo_cat on catalogo_materiales(categoria);

-- ============================================================
-- 3. EMPRESAS — raíz del aislamiento multi-tenant
-- ============================================================

create table empresas (
    id          uuid primary key default gen_random_uuid(),
    nombre      text not null,
    nit         text,
    direccion   text,
    telefono    text,
    plan_codigo text not null references planes(codigo),
    activa      boolean not null default true,
    creado_en   timestamptz not null default now()
);

-- ============================================================
-- 4. USUARIOS — perfil ligado 1:1 a auth.users de Supabase Auth
-- ============================================================

create table usuarios (
    id              uuid primary key references auth.users(id) on delete cascade,
    empresa_id      uuid not null references empresas(id) on delete cascade,
    rol_codigo      text not null references roles_catalogo(codigo),
    cargo_visible   text,              -- etiqueta libre (Gerente, Asesor, Otro...), sin efecto en permisos
    nombre_completo text,
    activo          boolean not null default true,
    creado_en       timestamptz not null default now()
);

-- Un solo Admin por empresa, intransferible (confirmado en la entrevista de producto 2026-08-24)
create unique index ux_un_admin_por_empresa on usuarios(empresa_id) where rol_codigo = 'admin';
create index idx_usuarios_empresa on usuarios(empresa_id);

-- ============================================================
-- 5. DATOS DE NEGOCIO POR EMPRESA
-- ============================================================

-- Valores de estado confirmados en el código real (backend/routers/cotizacion.py)
create table cotizaciones (
    id          bigint generated always as identity primary key,
    empresa_id  uuid not null references empresas(id) on delete cascade,
    numero      text not null,
    fecha       date not null,
    cliente     text not null,
    material    text,
    tipo        text,
    m2          numeric,
    ml          numeric,
    costo       numeric(14,2),
    precio      numeric(14,2),
    margen      numeric(14,2),
    estado      text not null default 'Pendiente'
                check (estado in ('Pendiente', 'Aprobada', 'Rechazada', 'Borrador')),
    datos_json  jsonb,
    usuario_id  uuid references usuarios(id) on delete set null,
    unique (empresa_id, numero)
);
-- Sin índice adicional sobre empresa_id solo: el índice único de arriba ya lo
-- cubre como columna líder (empresa_id, numero) — evita un índice redundante.

-- Ya no es un singleton global (bug del esquema actual) — clave compuesta por empresa.
-- valor pasa a JSONB (corrección sugerida por la auditoría: antes era TEXT con JSON a mano).
create table app_config (
    empresa_id  uuid not null references empresas(id) on delete cascade,
    clave       text not null,
    valor       jsonb not null default '{}',
    actualizado timestamptz not null default now(),
    primary key (empresa_id, clave)
);

-- Valores de estado confirmados en el código real (backend/routers/retales.py)
create table inventario_retales (
    id                  bigint generated always as identity primary key,
    empresa_id          uuid not null references empresas(id) on delete cascade,
    material_categoria  text          not null,
    referencia          text          not null default '',
    m2_disponibles      numeric       not null default 0,
    m2_original         numeric       not null default 0,
    origen_numero       text          not null default '',
    origen_cliente      text          not null default '',
    fecha_ingreso       date          not null default current_date,
    estado              text          not null default 'Disponible'
                        check (estado in ('Disponible', 'Reservado', 'Usado')),
    notas               text          not null default '',
    precio_recuperacion numeric(14,2) not null default 0,
    precio_mercado_m2   numeric(14,2) not null default 0,
    usuario_id          uuid references usuarios(id) on delete set null
);
create index idx_retales_empresa_cat on inventario_retales(empresa_id, material_categoria);

create table inventario_laminas (
    id                  bigint generated always as identity primary key,
    empresa_id          uuid not null references empresas(id) on delete cascade,
    material_categoria  text          not null,
    referencia          text          not null default '',
    cantidad_laminas    integer       not null default 0,
    ancho_cm            numeric,
    alto_cm             numeric,
    espesor_cm          numeric,
    costo_unitario      numeric(14,2) not null default 0,
    stock_minimo        integer       not null default 0,
    proveedor           text          not null default '',
    ubicacion           text          not null default '',
    notas               text          not null default '',
    activo              boolean       not null default true,
    usuario_id          uuid references usuarios(id) on delete set null,
    actualizado_en      timestamptz   not null default now()
);
create index idx_laminas_empresa_cat on inventario_laminas(empresa_id, material_categoria);

-- empresa_id NOT NULL: no hay hoy ningún actor "de sistema" sin tenant en
-- este esquema — si aparece uno en el futuro (ej. eventos internos de
-- Costo360 S.A.S.), se revisa entonces, no se deja nullable por si acaso.
create table audit_log (
    id          bigint generated always as identity primary key,
    empresa_id  uuid not null references empresas(id) on delete cascade,
    usuario_id  uuid references usuarios(id) on delete set null,
    timestamp   timestamptz not null default now(),
    accion      text not null,
    metadata    jsonb not null default '{}',
    ip          text
);
create index idx_audit_log_empresa on audit_log(empresa_id, timestamp desc);
create index idx_audit_log_accion on audit_log(accion, timestamp desc);
create index idx_audit_log_user on audit_log(usuario_id, timestamp desc);

-- Placeholder para la Regla 5 (sesión única con aviso real) — sin lógica todavía.
-- Se llena y se usa de verdad en la Fase 2.A (docs/ROADMAP_COSTO360.md). Existe
-- desde ya para no perder el punto de apoyo (decisión del fundador, 2026-08-26).
create table sesion_activa (
    usuario_id  uuid primary key references usuarios(id) on delete cascade,
    device_hint text,
    iniciada_en timestamptz not null default now(),
    ultimo_uso  timestamptz not null default now()
);

-- ============================================================
-- 6. TABLAS EXCLUIDAS A PROPÓSITO — no borrar esta nota
-- ============================================================
-- `facturas_compra` y `correos_procesados` (presentes en backend/main.py hoy) NO se
-- recrean en este esquema. Confirmado por el fundador el 2026-08-26: son sobras de un
-- proyecto no relacionado con Costo360 (finanzas de una empresa familiar distinta),
-- mezcladas por error en el mismo repositorio. Ver ARQUITECTURA_MAESTRA.md sección 4.

-- ============================================================
-- 7. HELPER PARA RLS — empresa del usuario autenticado
-- ============================================================
-- SECURITY DEFINER + search_path fijo: necesario, no cosmético — sin esto, la
-- consulta interna a `usuarios` quedaría sujeta a la propia política RLS de
-- `usuarios` que invoca esta función, generando recursión. STABLE + se invoca
-- envuelta en (select ...) en cada policy (sección 8) para que Postgres la
-- evalúe una sola vez por consulta, no una vez por fila (recomendación de
-- rendimiento de Supabase para RLS).
create or replace function empresa_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select empresa_id from usuarios where id = auth.uid();
$$;

-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================
-- NOTA CRÍTICA DE ARQUITECTURA (auditoría #1): estas políticas solo protegen de
-- verdad si el backend se conecta a Postgres usando el JWT del usuario
-- autenticado (para que auth.uid() resuelva), NO con una conexión de "rol de
-- servicio" para operaciones normales de lectura/escritura de datos de tenant.
-- Este cambio de conexión en backend/db/client.py es un requisito de la Fase
-- 2.A, no de este archivo — pero sin él estas políticas no cumplen su función.
--
-- NOTA CRÍTICA DE ARQUITECTURA (auditoría #2, ya corregida abajo): `usuarios` y
-- `empresas` NO tienen policy de UPDATE para usuarios autenticados normales —
-- solo el rol de servicio (que usa el backend, `BYPASSRLS`) puede editarlas.
-- La primera versión de este archivo sí tenía esas políticas y permitía que
-- cualquier usuario se autoascendiera de rol o cambiara el plan de su empresa.

alter table empresas enable row level security;
alter table empresas force row level security;
create policy empresas_select on empresas for select using (id = (select empresa_actual()));
-- Sin policy de insert/update/delete para usuarios normales: alta y edición de
-- una empresa (nombre, plan, nit, activa) corren con rol de servicio desde el
-- backend — nunca directo desde el cliente autenticado.

alter table usuarios enable row level security;
alter table usuarios force row level security;
create policy usuarios_select on usuarios for select using (empresa_id = (select empresa_actual()));
-- Sin policy de insert/update/delete para usuarios normales: el aprovisionamiento
-- (sección 10) y la gestión de usuarios (cambiar rol_codigo, activo, cargo_visible)
-- corren con rol de servicio desde el backend, que valida ahí mismo el permiso
-- puede_gestionar_usuarios del rol de quien hace la petición. Evita la
-- autoescalación de privilegios encontrada en la primera versión de este archivo.

alter table cotizaciones enable row level security;
alter table cotizaciones force row level security;
create policy cotizaciones_all on cotizaciones for all
    using (empresa_id = (select empresa_actual()))
    with check (empresa_id = (select empresa_actual()));

alter table app_config enable row level security;
alter table app_config force row level security;
create policy app_config_all on app_config for all
    using (empresa_id = (select empresa_actual()))
    with check (empresa_id = (select empresa_actual()));

alter table inventario_retales enable row level security;
alter table inventario_retales force row level security;
create policy inventario_retales_all on inventario_retales for all
    using (empresa_id = (select empresa_actual()))
    with check (empresa_id = (select empresa_actual()));

alter table inventario_laminas enable row level security;
alter table inventario_laminas force row level security;
create policy inventario_laminas_all on inventario_laminas for all
    using (empresa_id = (select empresa_actual()))
    with check (empresa_id = (select empresa_actual()));

alter table audit_log enable row level security;
alter table audit_log force row level security;
create policy audit_log_select on audit_log for select using (empresa_id = (select empresa_actual()));
create policy audit_log_insert on audit_log for insert with check (empresa_id = (select empresa_actual()));
-- Sin policy de update/delete: el log de auditoría no se edita ni se borra desde la app.

alter table sesion_activa enable row level security;
alter table sesion_activa force row level security;
create policy sesion_activa_select on sesion_activa for select using (usuario_id = auth.uid());
-- Sin policy de insert/update/delete para usuarios normales: la lógica real de
-- "avisar al otro dispositivo y elegir mantener la sesión" (Regla 5) se
-- construye en el backend en la Fase 2.A y escribe con rol de servicio.

-- Catálogos compartidos: lectura abierta a cualquier usuario autenticado (con
-- la cláusula TO, que hace que Postgres omita la policy para roles que no
-- matchean en vez de evaluar una función por fila), escritura reservada al rol
-- de servicio.
alter table planes enable row level security;
alter table planes force row level security;
create policy planes_select on planes for select to authenticated using (true);

alter table roles_catalogo enable row level security;
alter table roles_catalogo force row level security;
create policy roles_catalogo_select on roles_catalogo for select to authenticated using (true);

alter table catalogo_materiales enable row level security;
alter table catalogo_materiales force row level security;
create policy catalogo_materiales_select on catalogo_materiales for select to authenticated using (true);

-- ============================================================
-- 9. APROVISIONAMIENTO — pendiente, no bloqueante
-- ============================================================
-- Falta el trigger/función que crea la fila en `usuarios` en el instante en que se
-- crea un `auth.users` nuevo, tomando empresa_id/rol_codigo de los metadatos de la
-- invitación o el checkout. Sin esto, un usuario puede autenticarse sin tener fila en
-- `usuarios` — pero todas las políticas de arriba ya tratan ese caso como acceso CERO
-- (fail-closed): empresa_actual() devuelve NULL, y ningún `empresa_id = NULL` hace
-- match nunca en Postgres. Se implementa junto con el flujo real de registro/invitación
-- en la Fase 2.A (docs/ROADMAP_COSTO360.md) — no es necesario para crear este esquema.
