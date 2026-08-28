-- ============================================================================
-- Costo360 — Fase 2.A: aprovisionamiento de cuentas + sesión única + folios
--
-- Creado: 2026-08-27, dentro del ciclo /goal de la Fase 2.A del roadmap.
-- Planeado por Claude, auditado de forma independiente en dos pasadas
-- (Security Engineer sobre el plan de auth/aislamiento, Database Optimizer
-- sobre este tipo de SQL). Ambas: "aprueba con cambios" — cambios incorporados.
-- Contexto completo: docs/PLAN_FASE_2A.md (Parte II es la fuente de verdad).
--
-- Depende de: 0001_esquema_multitenant.sql, 0002_revocar_anon_empresa_actual.sql
-- (ya aplicados en el proyecto Supabase `hrmpyhixhbnkkpvxtuit`).
--
-- Qué hace este archivo:
--   1. Endurece `empresa_actual()` (PARALLEL SAFE + search_path vacío + cuerpo
--      cualificado). Hallazgo D14 de la auditoría.
--   2. Tabla `invitaciones` — el backend la escribe con rol de servicio; el
--      trigger de aprovisionamiento valida contra ella. Hallazgo S1 (el
--      aprovisionamiento NO puede confiar en metadatos escribibles por el
--      cliente → se usa `raw_app_meta_data`, solo fijable con service-role key,
--      Y se cruza contra una invitación real).
--   3. `handle_new_user()` + trigger sobre `auth.users` — al nacer un usuario
--      de Supabase Auth con `app_metadata` {empresa_id, rol_codigo} que casa con
--      una invitación pendiente, crea su fila en `public.usuarios` y marca la
--      invitación aceptada. Sin metadatos / sin invitación válida → no crea fila
--      (acceso CERO, fail-closed) salvo que los metadatos existan pero no casen,
--      caso en que aborta con error claro.
--   4. `usuarios_cupo_check()` + trigger BEFORE INSERT — hace cumplir el cupo de
--      usuarios del plan (Regla 4). Hallazgo S7: este trigger es el enforcement
--      real, no el chequeo en Python. Serializa por empresa con FOR UPDATE.
--   5. `sesion_activa` — columnas para la máquina de estados de la sesión única
--      con aviso real (Regla 5). Hallazgos S5/S6/D10.
--   6. `folio_seq` — contador atómico por (empresa, prefijo, año) para el número
--      de cotización. Hallazgo D4 (COUNT(*) tiene carrera → 500 duro bajo el
--      unique (empresa_id, numero); y bug preexistente tras un DELETE).
--
-- NOTA: el catálogo de materiales NO se siembra aquí. `backend/seed_materiales.json`
-- tiene 10 pares (categoria, referencia) duplicados en 255 filas, así que no se le
-- puede poner UNIQUE sin decidir cuáles descartar (decisión de datos del fundador,
-- pendiente). El seed se hace con `backend/seed_catalogo.py` (recarga autoritativa).
--
-- Se aplica de forma transaccional por la herramienta de migración (apply_migration).
-- ============================================================================

-- ============================================================
-- 1. empresa_actual() — endurecida (D14)
-- ============================================================
-- CREATE OR REPLACE preserva owner (postgres) y ACL (el revoke de anon/public y
-- el grant a authenticated de 0002 siguen vigentes). Cambios: PARALLEL SAFE
-- (antes UNSAFE por ser SECURITY DEFINER → desactivaba planes paralelos en las
-- agregaciones del dashboard) y search_path vacío con cuerpo cualificado.
create or replace function public.empresa_actual()
returns uuid
language sql
stable
parallel safe
security definer
set search_path = ''
as $$
    select empresa_id from public.usuarios where id = (select auth.uid());
$$;

-- ============================================================
-- 2. invitaciones — puerta de entrada única al aprovisionamiento (S1)
-- ============================================================
create table public.invitaciones (
    id          uuid primary key default gen_random_uuid(),
    email       text        not null,
    empresa_id  uuid        not null references public.empresas(id) on delete cascade,
    rol_codigo  text        not null references public.roles_catalogo(codigo),
    estado      text        not null default 'pendiente'
                check (estado in ('pendiente', 'aceptada', 'revocada', 'expirada')),
    creada_por  uuid        references public.usuarios(id) on delete set null,
    creada_en   timestamptz not null default now(),
    expira_en   timestamptz not null default now() + interval '7 days',
    aceptada_en timestamptz
);
-- El trigger de aprovisionamiento busca por (email en minúsculas, empresa, rol,
-- estado pendiente, no expirada).
create index idx_invitaciones_lookup
    on public.invitaciones (lower(email), empresa_id, rol_codigo)
    where estado = 'pendiente';
-- Como mucho una invitación pendiente por (email, empresa) — evita ambigüedad en
-- el trigger y doble alta.
create unique index ux_invitacion_pendiente
    on public.invitaciones (lower(email), empresa_id)
    where estado = 'pendiente';

alter table public.invitaciones enable row level security;
alter table public.invitaciones force row level security;
-- Lectura: cualquier usuario de la empresa puede ver las invitaciones de su
-- empresa (el backend además filtra por permiso al listarlas). Escritura: solo
-- rol de servicio desde el backend (que valida `puede_gestionar_usuarios`).
create policy invitaciones_select on public.invitaciones
    for select using (empresa_id = (select public.empresa_actual()));

grant select, insert, update, delete on public.invitaciones to authenticated;

-- ============================================================
-- 3. handle_new_user() — aprovisionamiento al nacer un auth.users (S1, D8)
-- ============================================================
-- SECURITY DEFINER (owner postgres) + search_path vacío + todo cualificado.
-- Lee `raw_app_meta_data` (app_metadata) — solo fijable con la service-role key,
-- NUNCA desde el cliente (a diferencia de raw_user_meta_data / user_metadata).
-- Se dispara AFTER INSERT OR UPDATE OF raw_app_meta_data para soportar tanto
-- `admin.createUser({app_metadata})` en un paso como el patrón invitar-luego-
-- actualizar. `on conflict (id) do nothing` lo hace idempotente.
--
-- Semántica de fallo (decisión del fundador, 2026-08-27): fail-closed RUIDOSO.
-- Si hay metadatos pero son inválidos o no casan con una invitación pendiente,
-- se lanza excepción → como el trigger corre en la misma transacción que GoTrue,
-- aborta la creación/actualización del auth.users y el error sube por la Admin
-- API. Es preferible a crear un usuario "fantasma" sin perfil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_empresa_id text := new.raw_app_meta_data ->> 'empresa_id';
    v_rol_codigo text := new.raw_app_meta_data ->> 'rol_codigo';
    v_nombre     text := new.raw_app_meta_data ->> 'nombre_completo';
    v_inv        public.invitaciones%rowtype;
begin
    -- Sin metadatos de aprovisionamiento (p. ej. OAuth de un no invitado):
    -- no se crea fila. El usuario queda autenticado pero sin perfil → acceso
    -- CERO (empresa_actual() devuelve NULL y ningún empresa_id = NULL casa).
    if v_empresa_id is null or v_rol_codigo is null then
        return new;
    end if;

    -- Ya tiene perfil (replay del trigger, o INSERT seguido de UPDATE): nada que hacer.
    if exists (select 1 from public.usuarios u where u.id = new.id) then
        return new;
    end if;

    if v_empresa_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception 'handle_new_user: empresa_id con formato inválido: %', v_empresa_id;
    end if;

    -- Debe existir una invitación PENDIENTE que case email + empresa + rol.
    select * into v_inv
    from public.invitaciones i
    where lower(i.email) = lower(new.email)
      and i.empresa_id  = v_empresa_id::uuid
      and i.rol_codigo  = v_rol_codigo
      and i.estado      = 'pendiente'
      and i.expira_en   > now()
    limit 1;

    if not found then
        raise exception
            'handle_new_user: sin invitación pendiente válida para % en empresa % rol %',
            new.email, v_empresa_id, v_rol_codigo;
    end if;

    -- Crea el perfil. Los triggers BEFORE INSERT de public.usuarios
    -- (cupo del plan, y el índice ux_un_admin_por_empresa) validan aquí.
    insert into public.usuarios (id, empresa_id, rol_codigo, nombre_completo)
    values (new.id, v_empresa_id::uuid, v_rol_codigo, v_nombre)
    on conflict (id) do nothing;

    update public.invitaciones
       set estado = 'aceptada', aceptada_en = now()
     where id = v_inv.id;

    return new;
end;
$$;

create trigger on_auth_user_provisioned
    after insert or update of raw_app_meta_data on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================
-- 4. usuarios_cupo_check() — cupo de usuarios por plan (Regla 4, S7)
-- ============================================================
-- BEFORE INSERT en public.usuarios. Serializa por empresa (FOR UPDATE sobre la
-- fila de empresas) para que dos altas concurrentes no se cuelen ambas.
create or replace function public.usuarios_cupo_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_cupo   integer;
    v_actual integer;
begin
    select p.cupo_usuarios into v_cupo
    from public.empresas e
    join public.planes  p on p.codigo = e.plan_codigo
    where e.id = new.empresa_id
    for update of e;   -- bloquea la fila de la empresa hasta el commit

    if v_cupo is null then
        raise exception 'usuarios_cupo_check: empresa % sin plan válido', new.empresa_id;
    end if;

    select count(*) into v_actual
    from public.usuarios u
    where u.empresa_id = new.empresa_id;

    if v_actual >= v_cupo then
        raise exception
            'Cupo de usuarios del plan alcanzado (% de %) para la empresa %',
            v_actual, v_cupo, new.empresa_id
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

create trigger trg_usuarios_cupo_check
    before insert on public.usuarios
    for each row execute function public.usuarios_cupo_check();

-- ============================================================
-- 5. sesion_activa — máquina de estados de la sesión única (Regla 5)
-- ============================================================
-- `device_hint` (placeholder de 0001) se reemplaza por `device_actual` (jsonb:
-- {id, label, plataforma, user_agent}). Tabla vacía → drop de columna sin riesgo.
alter table public.sesion_activa drop column if exists device_hint;

alter table public.sesion_activa
    add column estado        text        not null default 'activa'
               check (estado in ('activa', 'takeover_pendiente')),
    add column device_actual jsonb,
    add column retador       jsonb,
    add column retador_desde timestamptz,
    add column resuelto_en   timestamptz;

-- `ultimo_uso` se actualiza con throttle en cada request → muchos updates HOT
-- sobre columnas no indexadas. Menos fragmentación con fillfactor y autovacuum
-- agresivo (la tabla es pequeña: 1 fila por usuario).
alter table public.sesion_activa set (
    fillfactor = 80,
    autovacuum_vacuum_scale_factor = 0.0,
    autovacuum_vacuum_threshold = 50
);

-- ============================================================
-- 6. folio_seq — contador atómico del número de cotización (D4)
-- ============================================================
create table public.folio_seq (
    empresa_id uuid    not null references public.empresas(id) on delete cascade,
    prefijo    text    not null,   -- 'COT', 'AIU', ...
    anio       integer not null,
    ultimo     integer not null default 0,
    primary key (empresa_id, prefijo, anio)
);

alter table public.folio_seq enable row level security;
alter table public.folio_seq force row level security;
create policy folio_seq_all on public.folio_seq
    for all
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));

grant select, insert, update, delete on public.folio_seq to authenticated;
