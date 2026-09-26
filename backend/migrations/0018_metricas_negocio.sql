-- 0018 — Métricas del negocio para el agente de operaciones (Ciclo 2, 2026-09-26)
--
-- Todo cálculo lo hace services/metricas_service.py con consultas fijas en una
-- transacción READ ONLY (nunca SQL del modelo). Aquí solo viven los datos que
-- esas consultas necesitan y que hoy no existen:
--   * metricas.*        — costos fijos versionados, exclusiones (cuentas
--                         internas, pagos de sandbox). Esquema NO expuesto por
--                         PostgREST y sin permisos para anon/authenticated.
--   * eventos_empresa   — historial de altas/bajas/cambios de plan para medir
--                         cancelaciones desde hoy (lo anterior no se conoce).
--   * cotizaciones.creado_en — marca real de creación (`fecha` la escribe el
--                         usuario). Las filas previas quedan en NULL.
--
-- Regla de 0017: ninguna tabla nueva con escritura para authenticated/anon; y
-- eventos_empresa tampoco para cost_servidor (solo la escriben los triggers).

-- ── Esquema privado ─────────────────────────────────────────────────────────
create schema if not exists metricas;
revoke all on schema metricas from public, anon, authenticated;

create table if not exists metricas.costos_fijos (
    id            bigint generated always as identity primary key,
    concepto      text not null,
    proveedor     text not null,
    moneda        text not null check (moneda in ('COP', 'USD')),
    monto         numeric(14, 2) not null check (monto >= 0),
    vigente_desde date not null,
    vigente_hasta date,
    fuente        text not null,
    creado_en     timestamptz not null default now()
);

create table if not exists metricas.empresas_excluidas (
    empresa_id uuid primary key references public.empresas(id) on delete cascade,
    motivo     text not null,
    creado_en  timestamptz not null default now()
);

create table if not exists metricas.pagos_excluidos (
    transaction_id text primary key,
    motivo         text not null,
    creado_en      timestamptz not null default now()
);

revoke all on all tables in schema metricas from public, anon, authenticated, cost_servidor;

-- ── Datos iniciales (confirmados por el fundador 2026-09-26) ───────────────
insert into metricas.costos_fijos (concepto, proveedor, moneda, monto, vigente_desde, fuente)
select * from (values
    ('Correo y oficina',             'Microsoft 365 Business Basic', 'USD',     7.00, date '2026-09-01', 'Fundador 2026-09-26'),
    ('IA para desarrollo y gestión', 'Claude Pro',                   'COP', 80000.00, date '2026-09-01', 'Fundador 2026-09-26'),
    ('IA para desarrollo y gestión', 'Google AI Pro',                'USD',    20.00, date '2026-09-01', 'Fundador 2026-09-26'),
    ('IA para desarrollo y gestión', 'ChatGPT Plus',                 'COP', 99900.00, date '2026-09-01', 'Fundador 2026-09-26')
) v(concepto, proveedor, moneda, monto, vigente_desde, fuente)
where not exists (select 1 from metricas.costos_fijos);

insert into metricas.empresas_excluidas (empresa_id, motivo)
select id, 'Cuenta demo interna del fundador'
from public.empresas where id = '44f68d7b-3a51-4e80-b562-9eefe598be95'
on conflict do nothing;

-- Todos los pagos registrados hasta hoy son del sandbox de Wompi (fundador).
insert into metricas.pagos_excluidos (transaction_id, motivo)
select transaction_id, 'Sandbox de Wompi (pruebas del fundador, sep-2026)'
from public.pagos_procesados
on conflict do nothing;

-- ── Marca real de creación de cotizaciones ─────────────────────────────────
alter table public.cotizaciones add column if not exists creado_en timestamptz default now();
create index if not exists idx_cotizaciones_empresa_creado on public.cotizaciones (empresa_id, creado_en);

-- ── Historial de movimientos de talleres ───────────────────────────────────
create table if not exists public.eventos_empresa (
    id             bigint generated always as identity primary key,
    empresa_id     uuid not null references public.empresas(id) on delete cascade,
    tipo           text not null check (tipo in ('alta', 'activada', 'desactivada', 'cambio_plan',
                                                 'suscripcion_estado', 'pago_aprobado', 'pago_rechazado')),
    detalle        text,
    origen         text not null default 'trigger',
    creado_en      timestamptz not null default now()
);
create index if not exists idx_eventos_empresa_fecha on public.eventos_empresa (creado_en);
alter table public.eventos_empresa enable row level security;
alter table public.eventos_empresa force row level security;
revoke all on public.eventos_empresa from public, anon, authenticated, cost_servidor;

-- Los triggers NUNCA pueden tumbar la operación que los dispara (un webhook
-- de Wompi que falla deja un pago aprobado sin aprovisionar): todo error se
-- degrada a WARNING.
create or replace function public.tg_evento_empresa() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
    begin
        if tg_op = 'INSERT' then
            insert into public.eventos_empresa (empresa_id, tipo, detalle) values (new.id, 'alta', new.plan_codigo);
        else
            if new.activa is distinct from old.activa then
                insert into public.eventos_empresa (empresa_id, tipo)
                values (new.id, case when new.activa then 'activada' else 'desactivada' end);
            end if;
            if new.plan_codigo is distinct from old.plan_codigo then
                insert into public.eventos_empresa (empresa_id, tipo, detalle)
                values (new.id, 'cambio_plan', coalesce(old.plan_codigo, '') || '→' || coalesce(new.plan_codigo, ''));
            end if;
        end if;
    exception when others then
        raise warning 'eventos_empresa (empresas): %', sqlerrm;
    end;
    return new;
end $$;

create or replace function public.tg_evento_suscripcion() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
    begin
        if tg_op = 'INSERT' or new.estado is distinct from old.estado then
            insert into public.eventos_empresa (empresa_id, tipo, detalle)
            values (new.empresa_id, 'suscripcion_estado', new.estado);
        end if;
    exception when others then
        raise warning 'eventos_empresa (suscripciones): %', sqlerrm;
    end;
    return new;
end $$;

create or replace function public.tg_evento_pago() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare emp uuid;
begin
    begin
        select sp.empresa_id into emp from public.solicitudes_pago sp where sp.reference = new.reference;
        if emp is not null then
            insert into public.eventos_empresa (empresa_id, tipo, detalle)
            values (emp, case when new.estado_wompi = 'APPROVED' then 'pago_aprobado' else 'pago_rechazado' end,
                    new.monto_cop::text);
        end if;
    exception when others then
        raise warning 'eventos_empresa (pagos): %', sqlerrm;
    end;
    return new;
end $$;

revoke execute on function public.tg_evento_empresa(), public.tg_evento_suscripcion(), public.tg_evento_pago()
    from public, anon, authenticated, cost_servidor;

drop trigger if exists trg_evento_empresa on public.empresas;
create trigger trg_evento_empresa after insert or update of activa, plan_codigo on public.empresas
    for each row execute function public.tg_evento_empresa();
drop trigger if exists trg_evento_suscripcion on public.suscripciones_wompi;
create trigger trg_evento_suscripcion after insert or update of estado on public.suscripciones_wompi
    for each row execute function public.tg_evento_suscripcion();
drop trigger if exists trg_evento_pago on public.pagos_procesados;
create trigger trg_evento_pago after insert on public.pagos_procesados
    for each row execute function public.tg_evento_pago();

-- Punto de partida del historial: una "alta" por taller existente.
insert into public.eventos_empresa (empresa_id, tipo, detalle, origen, creado_en)
select e.id, 'alta', e.plan_codigo, 'backfill', e.creado_en
from public.empresas e
where not exists (select 1 from public.eventos_empresa ev where ev.empresa_id = e.id and ev.tipo = 'alta');
