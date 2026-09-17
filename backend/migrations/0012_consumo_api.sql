-- ============================================================================
-- 0012 — Consumo de APIs de IA por empresa (Gemini/Cost y ElevenLabs/Voz)
--
-- Ciclo pedido por el fundador (2026-09-16): hoy no existe ningún control de
-- consumo mensual real para Gemini (backend/agente/runtime.py) ni ElevenLabs
-- (backend/routers/voz.py) — solo un limitador de velocidad por IP
-- (backend/middleware/rate_limiter.py), sin conciencia de a qué empresa
-- pertenece la solicitud ni de cuánto se ha gastado ese mes. Una empresa
-- grande (varios usuarios detrás de la misma IP de oficina) podía generar
-- picos de gasto real sin ningún freno ni aviso.
--
-- Esta tabla generaliza el mismo patrón que YA usa `render_cocina` (tope
-- mensual por empresa, registro auditable de cada evento, `app_config` para
-- los topes editables sin redeploy) — pero como una tabla ÚNICA para
-- cualquier API medible, no una tabla por API, que es la "estandarización"
-- que pidió el fundador. `render_cocina` NO se migra a esta tabla en este
-- ciclo (ya funciona, ya está probada) — queda anotado como candidato a
-- unificación futura.
--
-- Depende de: 0001..0011 (ya aplicadas).
-- ============================================================================

create table public.consumo_api (
    id           bigint generated always as identity primary key,
    empresa_id   uuid not null references public.empresas(id) on delete cascade,
    usuario_id   uuid references public.usuarios(id) on delete set null,

    api          text not null check (api in ('gemini_cost', 'elevenlabs_voz')),
    unidad_medida text not null,       -- 'tokens' (gemini_cost) | 'segundos_audio' (elevenlabs_voz)
    cantidad      numeric(14,4) not null,  -- tokens totales o segundos de audio de ESTE evento
    costo_usd     numeric(10,6) not null,  -- costo real de ESTE evento, calculado con tarifas
                                            -- reales (ver backend/services/consumo_service.py)

    creado_en    timestamptz not null default now()
);

create index idx_consumo_api_empresa_mes on public.consumo_api (empresa_id, api, creado_en desc);

-- Visibilidad por EMPRESA (no por usuario_id) — mismo criterio que
-- render_cocina: cualquier usuario del mismo taller puede consultar cuánto
-- lleva gastado la empresa, no solo quien generó cada evento puntual.
alter table public.consumo_api enable row level security;
alter table public.consumo_api force  row level security;

create policy consumo_api_empresa on public.consumo_api for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));

grant select, insert, update, delete on public.consumo_api to authenticated;

comment on table public.consumo_api is
    'Consumo real medido de APIs de IA por empresa (Gemini/Cost, ElevenLabs/Voz) — '
    'una fila por evento (una conversación de Cost, una llamada de voz), usada para '
    'calcular el gasto acumulado del mes contra el tope configurado en app_config '
    '(clave ''consumo_ia_config''). Ver backend/services/consumo_service.py.';
