-- Decisión comercial expresa del fundador, 2026-09-25.
-- El checkout consulta planes al crear una nueva solicitud de pago.
-- No altera solicitudes existentes ni transacciones ya iniciadas.
BEGIN;
DO $$
DECLARE actual numeric;
BEGIN
    SELECT precio_mensual_cop INTO actual FROM planes
    WHERE codigo = 'enterprise' FOR UPDATE;
    IF actual IS NULL OR actual NOT IN (2410000, 875000) THEN
        RAISE EXCEPTION 'Precio Enterprise inesperado: revisar antes de continuar';
    END IF;
    UPDATE planes SET precio_mensual_cop = 875000
    WHERE codigo = 'enterprise' AND precio_mensual_cop = 2410000;
END $$;
COMMIT;
