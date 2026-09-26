-- 0019 — Cobro mensual recurrente con Wompi (ciclo /goal 2026-09-26)
--
-- Hasta hoy solo se cobraba el PRIMER mes (nada invocaba el cobro recurrente
-- ni avanzaba `proxima_fecha_cobro`). Esta migración agrega el registro
-- inmutable de cobros mensuales y el interruptor, que ARRANCA APAGADO.
--
-- Protecciones exigidas por la auditoría del plan:
--  * Nunca dos cobros vivos del mismo mes: índice único parcial por
--    (empresa, periodo) sobre estados pendiente/aprobado/revision_manual.
--  * `reference` única y aleatoria (REC-<uuid4>), nunca determinista.
--  * Ni la app (cost_servidor) ni usuarios (authenticated) pueden escribir
--    cobros ni el interruptor: solo el cron/webhook (db_service = postgres).
--    Revoca explícitamente el default de 0017a.
-- Reglas del fundador: reintentos +1/+3/+5 días, suspensión al día 7 en
-- solo lectura, reactivar pagando el mes vencido (conserva el día ancla).

-- ── Suscripciones: ancla del ciclo y estado de mora ─────────────────────────
alter table public.suscripciones_wompi
    add column if not exists dia_ancla smallint check (dia_ancla between 1 and 31),
    add column if not exists proximo_reintento date,
    add column if not exists en_mora_desde date,
    add column if not exists aviso_enviado_para date,
    add column if not exists ambiente text check (ambiente in ('sandbox', 'produccion'));
update public.suscripciones_wompi set dia_ancla = extract(day from proxima_fecha_cobro)::smallint
where dia_ancla is null;
-- Todas las suscripciones previas a esta migración se crearon con llaves de
-- prueba de Wompi (confirmado por el fundador 2026-09-26).
update public.suscripciones_wompi set ambiente = 'sandbox' where ambiente is null;
alter table public.suscripciones_wompi alter column ambiente set not null;

-- La siguiente fecha de cobro se calcula en Python (cobro_recurrente_service.siguiente_fecha).

-- ── Registro de cobros mensuales ────────────────────────────────────────────
create table if not exists public.cobros_recurrentes (
    id             bigint generated always as identity primary key,
    empresa_id     uuid not null references public.empresas(id) on delete restrict,
    periodo        date not null,
    intento        smallint not null check (intento between 1 and 4),
    reference      text not null unique check (reference like 'REC-%'),
    plan_codigo    text not null references public.planes(codigo),
    monto_cop      numeric(14, 2) not null check (monto_cop > 0),
    transaction_id text,
    estado         text not null default 'pendiente'
                   check (estado in ('pendiente', 'aprobado', 'fallido', 'revision_manual')),
    estado_wompi   text,
    ambiente       text not null check (ambiente in ('sandbox', 'produccion')),
    detalle        text,
    creado_en      timestamptz not null default now(),
    resuelto_en    timestamptz,
    unique (empresa_id, periodo, intento)
);
create unique index if not exists uq_cobro_vivo_por_periodo on public.cobros_recurrentes (empresa_id, periodo)
    where estado in ('pendiente', 'aprobado', 'revision_manual');
create unique index if not exists uq_cobro_transaction on public.cobros_recurrentes (transaction_id)
    where transaction_id is not null;
create index if not exists idx_cobros_pendientes on public.cobros_recurrentes (creado_en) where estado = 'pendiente';

alter table public.cobros_recurrentes enable row level security;
alter table public.cobros_recurrentes force row level security;
revoke all on public.cobros_recurrentes from public, anon, authenticated, cost_servidor;
drop policy if exists cobros_recurrentes_select on public.cobros_recurrentes;
create policy cobros_recurrentes_select on public.cobros_recurrentes for select to authenticated
    using (empresa_id = (select public.empresa_actual()));
grant select on public.cobros_recurrentes to authenticated;

-- ── Interruptor (sin desplegar código) ──────────────────────────────────────
create table if not exists public.config_sistema (
    clave          text primary key,
    valor          jsonb not null,
    actualizado_en timestamptz not null default now()
);
alter table public.config_sistema enable row level security;
alter table public.config_sistema force row level security;
revoke all on public.config_sistema from public, anon, authenticated, cost_servidor;
insert into public.config_sistema (clave, valor) values ('cobros_recurrentes_activos', 'false')
on conflict (clave) do nothing;
