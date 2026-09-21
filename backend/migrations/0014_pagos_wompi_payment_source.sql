-- ============================================================================
-- 0014 — solicitudes_pago: columna para el payment_source_id de Wompi.
--
-- El flujo correcto (confirmado por el Security Engineer que auditó el plan)
-- es: tokenizar la tarjeta -> crear el payment_source -> PRIMER cobro con
-- ese payment_source -> solo si ese primer cobro se aprueba, se guarda como
-- reutilizable. El payment_source_id se conoce ANTES de que llegue la
-- confirmación async del webhook, así que se guarda aquí de inmediato para
-- que el webhook lo encuentre cuando confirme el pago.
--
-- Depende de: 0013 (ya aplicada).
-- ============================================================================

alter table public.solicitudes_pago
    add column payment_source_id text;

comment on column public.solicitudes_pago.payment_source_id is
    'El payment_source_id de Wompi, guardado apenas se crea (antes de cobrar) -- el webhook lo usa para poblar medios_pago_guardados solo si el pago queda APPROVED.';
