-- ============================================================================
-- 0013 — Pagos con Wompi: checkout, idempotencia, medio de pago guardado y
-- cobro mensual recurrente.
--
-- Ciclo /goal formal (paso 3), plan auditado por un Security Engineer antes
-- de escribir esto. 4 tablas nuevas:
--
--   solicitudes_pago      — se crea ANTES de que el cliente pague (cuando
--                            llena el formulario de checkout), para tener
--                            dónde aterrizar los datos de la empresa cuando
--                            llegue el webhook de Wompi (que solo trae el
--                            "reference", nunca los datos del formulario).
--   pagos_procesados      — idempotencia: un `transaction_id` de Wompi solo
--                            se procesa una vez, aunque Wompi reintente
--                            avisar el mismo pago hasta 3 veces en 24h.
--   medios_pago_guardados — el `payment_source_id` que devuelve Wompi tras
--                            tokenizar la tarjeta (NUNCA el número de
--                            tarjeta ni el CVV, eso vive solo en Wompi) —
--                            se usa para cobrar los meses siguientes sin que
--                            el cliente tenga que volver a pagar a mano.
--   suscripciones_wompi   — a quién y cuándo cobrar cada mes; la usa el cron
--                            mensual (próximo paso).
--
-- Ninguna de estas 4 tablas se expone al rol `authenticated` con una policy
-- de escritura — solo el backend (rol de servicio, BYPASSRLS) las toca,
-- desde 2 endpoints públicos sin sesión de usuario (`/api/pagos/iniciar` y
-- `/api/pagos/webhook/wompi`) y desde el cron mensual. `medios_pago_guardados`
-- sí tiene una policy de SELECT para que la propia empresa pueda ver qué
-- tarjeta tiene guardada (nunca el número completo, solo marca/últimos 4).
--
-- Depende de: 0001..0012 (ya aplicadas).
-- ============================================================================

create table public.solicitudes_pago (
    id             bigint generated always as identity primary key,
    reference      text not null unique,

    -- Datos del formulario de checkout, capturados ANTES de pagar.
    plan_codigo    text not null references public.planes(codigo),
    nombre_empresa text not null,
    nit            text,
    admin_email    text not null,
    admin_nombre   text not null default '',

    monto_cop      numeric(14,2) not null,  -- resuelto SIEMPRE server-side desde `planes`, nunca del cliente

    estado         text not null default 'pendiente'
                   check (estado in ('pendiente', 'pagado', 'fallido', 'expirado')),
    empresa_id     uuid references public.empresas(id) on delete set null,  -- se llena al aprovisionar

    creada_en      timestamptz not null default now(),
    resuelta_en    timestamptz
);

create index idx_solicitudes_pago_estado on public.solicitudes_pago (estado, creada_en);

alter table public.solicitudes_pago enable row level security;
alter table public.solicitudes_pago force  row level security;
-- Sin policies para `authenticated`: solo el backend (rol de servicio) la toca.


create table public.pagos_procesados (
    transaction_id text primary key,          -- id de transacción de Wompi (dedup real)
    reference      text not null,
    monto_cop      numeric(14,2) not null,
    estado_wompi   text not null,              -- APPROVED | DECLINED | VOIDED | ERROR (tal cual lo manda Wompi)
    procesado_en   timestamptz not null default now()
);

create index idx_pagos_procesados_reference on public.pagos_procesados (reference);

alter table public.pagos_procesados enable row level security;
alter table public.pagos_procesados force  row level security;
-- Sin policies para `authenticated`: registro interno, nunca visible desde el cliente.


create table public.medios_pago_guardados (
    id               bigint generated always as identity primary key,
    empresa_id       uuid not null references public.empresas(id) on delete cascade,
    payment_source_id text not null,           -- el token reutilizable que da Wompi

    marca            text,                     -- 'VISA' / 'MASTERCARD' / etc, solo para mostrarle al cliente
    ultimos_4        text,                     -- SOLO los últimos 4 dígitos, nunca el número completo

    creado_en        timestamptz not null default now(),

    unique (empresa_id)  -- un solo medio de pago activo por empresa por ahora
);

alter table public.medios_pago_guardados enable row level security;
alter table public.medios_pago_guardados force  row level security;

create policy medios_pago_guardados_select on public.medios_pago_guardados for select to authenticated
    using (empresa_id = (select public.empresa_actual()));
-- Sin policy de insert/update/delete para `authenticated`: solo el backend
-- (tras un cobro real aprobado por Wompi) escribe aquí.

grant select on public.medios_pago_guardados to authenticated;


create table public.suscripciones_wompi (
    empresa_id         uuid primary key references public.empresas(id) on delete cascade,
    plan_codigo        text not null references public.planes(codigo),
    payment_source_id  text not null,

    proxima_fecha_cobro date not null,
    estado              text not null default 'activa'
                        check (estado in ('activa', 'en_mora', 'suspendida', 'cancelada')),
    intentos_fallidos   integer not null default 0,
    ultimo_intento_en   timestamptz,

    creada_en           timestamptz not null default now()
);

create index idx_suscripciones_wompi_cobro on public.suscripciones_wompi (proxima_fecha_cobro) where estado in ('activa', 'en_mora');

alter table public.suscripciones_wompi enable row level security;
alter table public.suscripciones_wompi force  row level security;

create policy suscripciones_wompi_select on public.suscripciones_wompi for select to authenticated
    using (empresa_id = (select public.empresa_actual()));

grant select on public.suscripciones_wompi to authenticated;

comment on table public.solicitudes_pago is
    'Una fila por intento de checkout, creada ANTES de pagar. El webhook de Wompi busca por "reference" para saber qué empresa aprovisionar.';
comment on table public.pagos_procesados is
    'Idempotencia: un transaction_id de Wompi se procesa una sola vez, aunque Wompi reintente el mismo aviso hasta 3 veces en 24h.';
comment on table public.medios_pago_guardados is
    'payment_source_id de Wompi por empresa -- nunca número de tarjeta ni CVV, eso vive solo en Wompi. Se usa para el cobro mensual automático.';
comment on table public.suscripciones_wompi is
    'A quién y cuándo cobrar cada mes -- la procesa el cron de cobro recurrente (próximo paso del ciclo).';
