-- ============================================================================
-- 0011 — Render de cocina con IA (Objetivo nuevo: render con OpenAI)
--
-- Plan validado por 4 planificadores en paralelo (AI Engineer, Prompt
-- Engineer, Backend Architect, Product Manager) el 2026-09-16, a pedido del
-- fundador: cuando un asesor cotiza un proyecto de cocina, poder generar con
-- IA un render de esa cocina usando el material REAL que se está cotizando.
--
-- Hallazgo central de los 4 planificadores, coincidente: sin una foto real
-- del material, la IA no tiene cómo saber cómo se ve — el nombre comercial
-- ("Blanco Thassos Extra") no le dice nada al modelo salvo para piedras
-- mundialmente famosas. Por eso esta migración agrega, antes que cualquier
-- otra cosa, una foto de referencia + atributos visuales estructurados al
-- catálogo — es la base de la que depende todo el resto de la funcionalidad.
--
-- Qué hace este archivo:
--   1. `catalogo_materiales` gana 7 columnas nuevas: foto de referencia real
--      del material + 6 atributos visuales de selección (nunca texto libre,
--      para que el prompt sea reproducible — ver diccionario enum→frase en
--      `backend/services/render_service.py`).
--   2. Tabla nueva `render_cocina` — un render generado, colgado siempre de
--      una cotización real. Snapshot de qué material/atributos se usaron
--      (trazabilidad: si un render no se parece al material real, esto es
--      lo primero que se audita) y costo real de la llamada (para el tope
--      mensual por empresa, mismo espíritu que el tope de créditos de la voz
--      de Cost con ElevenLabs).
--   3. Tres buckets privados de Supabase Storage (nunca públicos, siempre
--      servidos con URL firmada de vida corta) — uno para las fotos que sube
--      el taller de sus materiales (reutilizable, vive mientras el material
--      exista), otro para las fotos reales de la cocina del cliente que sube
--      el asesor (dato personal de un tercero, con consentimiento explícito
--      capturado en `render_cocina.foto_cliente_consentimiento` y barrido de
--      retención a 90 días — ver el cron de barridos ya existente del
--      proyecto, `reference_vercel_cron_nativo.md`), y uno para las imágenes
--      generadas (la salida).
--
-- Depende de: 0001..0010 (ya aplicadas).
-- ============================================================================

-- ── 1. Atributos visuales del material (catalogo_materiales) ────────────────
-- CHECK explícito en vez de solo validar en la app (mismo criterio que
-- `estado` en cotizaciones/agente_acciones) — un enum mal escrito desde
-- cualquier camino (UI, agente de IA, script) nunca debe poder colarse.
-- Todas nullable: un material "no apto para render" simplemente no completa
-- estos campos, y el backend bloquea la generación (nunca inventa un valor
-- por default silencioso — ver reglas de negocio del Prompt Engineer).

alter table catalogo_materiales
  add column if not exists color_base text
    check (color_base is null or color_base in (
      'blanco', 'blanco_hueso', 'gris_claro', 'gris_oscuro', 'negro',
      'beige_arena', 'cafe', 'verde', 'azul_gris', 'dorado',
      'rojo_terracota', 'multicolor'
    )),
  add column if not exists color_vetas text
    check (color_vetas is null or color_vetas in (
      'sin_vetas', 'blanco', 'gris', 'gris_oscuro', 'dorado', 'beige',
      'cafe', 'negro', 'azulado', 'oxidado'
    )),
  add column if not exists densidad_veteado text
    check (densidad_veteado is null or densidad_veteado in (
      'sin_veteado', 'sutil', 'moderado', 'denso'
    )),
  add column if not exists patron_veteado text
    check (patron_veteado is null or patron_veteado in (
      'no_aplica', 'lineal', 'organico', 'malla', 'moteado', 'bookmatch'
    )),
  add column if not exists acabado text
    check (acabado is null or acabado in (
      'pulido', 'mate', 'leather', 'flameado'
    )),
  add column if not exists tono_general text
    check (tono_general is null or tono_general in ('calido', 'frio', 'neutro')),
  add column if not exists foto_referencia_url text,
  -- Un humano del taller marca la foto como fiel a ese material antes de que
  -- se pueda usar para generar renders (foto borrosa/mal recortada = renders
  -- malos en cadena) — ver hallazgo del Prompt Engineer.
  add column if not exists foto_referencia_aprobada boolean not null default false;

-- ── 2. render_cocina ──────────────────────────────────────────────────────
-- bigint identity (no uuid): es un registro de negocio colgado de una
-- cotización real, mismo criterio de tipo de id que `cotizaciones` y
-- `catalogo_materiales` (a diferencia de `agente_acciones_pendientes`, que
-- es efímera y de otro dominio).

create table public.render_cocina (
    id                  bigint generated always as identity primary key,
    empresa_id          uuid not null references public.empresas(id) on delete cascade,
    cotizacion_id       bigint not null references public.cotizaciones(id) on delete cascade,
    usuario_id          uuid not null references public.usuarios(id) on delete cascade,

    -- Trazabilidad del material — snapshot separado del FK vivo (mismo
    -- criterio que `filas_afectadas` en agente_acciones_pendientes): el
    -- catálogo es editable, el snapshot de ESTE render nunca debe cambiar
    -- retroactivamente aunque el material se edite o se borre después.
    material_id         bigint references public.catalogo_materiales(id) on delete set null,
    material_referencia_snapshot text not null,
    material_foto_url   text,

    tipo_proyecto       text not null default 'cocina' check (tipo_proyecto in ('cocina')),
    superficie          text not null,

    -- Entrada real mandada al modelo (auditoría completa del prompt)
    prompt_usado         text not null,
    foto_cliente_url      text,
    foto_cliente_consentimiento boolean not null default false,

    -- Salida
    imagen_url            text,
    estado                text not null default 'generando'
                          check (estado in ('generando', 'completado', 'fallido')),
    error_detalle          text,

    -- Costo real (para el tope mensual por empresa — ver app_config,
    -- clave 'render_config')
    modelo_usado            text not null,
    costo_usd               numeric(10,4),

    creado_en               timestamptz not null default now()
);

create index idx_render_cocina_cotizacion on public.render_cocina (cotizacion_id, creado_en desc);
create index idx_render_cocina_empresa_mes on public.render_cocina (empresa_id, creado_en);

-- Visibilidad por EMPRESA (no por usuario_id): cualquier asesor del mismo
-- taller que trabaje esa cotización puede ver el render, no solo quien lo
-- generó — mismo patrón que cotizaciones/catálogo, no el de
-- agente_acciones_pendientes (que sí aísla también por usuario).
alter table public.render_cocina enable row level security;
alter table public.render_cocina force  row level security;

create policy render_cocina_empresa on public.render_cocina for all to authenticated
    using      (empresa_id = (select public.empresa_actual()))
    with check (empresa_id = (select public.empresa_actual()));

grant select, insert, update, delete on public.render_cocina to authenticated;

-- ── 3. Storage — buckets privados + RLS ──────────────────────────────────────
-- Ningún bucket público: todo se sirve con URL firmada de vida corta, nunca
-- una URL fija. Ruta de cada objeto: {empresa_id}/{...} — la policy exige que
-- el primer segmento de la ruta coincida con empresa_actual(), igual
-- principio que el resto del aislamiento multi-tenant del proyecto.

insert into storage.buckets (id, name, public)
values
  ('render-material-referencias', 'render-material-referencias', false),
  ('render-cliente-fotos',        'render-cliente-fotos',        false),
  ('render-generados',            'render-generados',            false)
on conflict (id) do nothing;

create policy render_material_referencias_rls on storage.objects for all to authenticated
    using (
      bucket_id = 'render-material-referencias'
      and (storage.foldername(name))[1] = (select public.empresa_actual())::text
    )
    with check (
      bucket_id = 'render-material-referencias'
      and (storage.foldername(name))[1] = (select public.empresa_actual())::text
    );

create policy render_cliente_fotos_rls on storage.objects for all to authenticated
    using (
      bucket_id = 'render-cliente-fotos'
      and (storage.foldername(name))[1] = (select public.empresa_actual())::text
    )
    with check (
      bucket_id = 'render-cliente-fotos'
      and (storage.foldername(name))[1] = (select public.empresa_actual())::text
    );

create policy render_generados_rls on storage.objects for all to authenticated
    using (
      bucket_id = 'render-generados'
      and (storage.foldername(name))[1] = (select public.empresa_actual())::text
    )
    with check (
      bucket_id = 'render-generados'
      and (storage.foldername(name))[1] = (select public.empresa_actual())::text
    );
