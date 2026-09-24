-- ============================================================================
-- 0015 — Alertas de consumo de IA al fundador (Telegram + correo)
--
-- Ciclo /goal 2026-09-24. Decisión del fundador: durante la fase de medición
-- con clientes reales NUNCA se bloquea a nadie por pasar su cupo (Cost, voz,
-- render). En su lugar, el backend avisa al fundador en tiempo real cuando una
-- empresa/usuario/cuenta general cruza 70/80/100/150/200% del cupo mensual,
-- para que recargue a tiempo. Ver backend/services/alertas_service.py.
--
-- `alerta_consumo_enviada` es el registro de deduplicación: una fila por
-- (ámbito, api, umbral, mes). El envío SOLO ocurre si el INSERT ... ON
-- CONFLICT DO NOTHING insertó de verdad — así dos requests concurrentes nunca
-- mandan el mismo aviso dos veces. `ambito` es texto NOT NULL a propósito
-- (auditoría del plan): con columnas uuid nullables, Postgres trata los NULL
-- como distintos y el UNIQUE nunca chocaría.
--
-- Depende de: 0001..0014 (ya aplicadas).
-- ============================================================================

create table public.alerta_consumo_enviada (
    id        bigint generated always as identity primary key,
    ambito    text not null,     -- 'empresa:<uuid>' | 'usuario:<uuid>' | 'global'
    api       text not null,     -- 'gemini_cost' | 'elevenlabs_voz' | 'openai_render' | 'elevenlabs_cuenta'
    umbral    int  not null,     -- 70, 80, 100, 150, 200
    periodo   date not null,     -- primer día del mes, hora Colombia
    detalle   text,
    creado_en timestamptz not null default now(),
    unique (ambito, api, umbral, periodo)
);

-- Solo el backend (rol postgres, BYPASSRLS) lee/escribe esta tabla. RLS
-- forzado SIN políticas + sin grants: ningún usuario de un taller la ve.
alter table public.alerta_consumo_enviada enable row level security;
alter table public.alerta_consumo_enviada force  row level security;
revoke all on public.alerta_consumo_enviada from anon, authenticated;

-- El cupo de voz pasa a ser POR USUARIO (decisión del fundador 2026-09-23).
create index idx_consumo_api_usuario_mes on public.consumo_api (usuario_id, api, creado_en desc);

comment on table public.alerta_consumo_enviada is
    'Deduplicación de avisos de consumo de IA enviados al fundador (Telegram/correo). '
    'Ver backend/services/alertas_service.py.';
