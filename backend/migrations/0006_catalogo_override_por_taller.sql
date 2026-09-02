-- ============================================================================
-- 0006 — Catálogo editable por taller: overrides sobre las filas base
-- ============================================================================
-- Feedback del fundador (2026-08-31): en la pantalla "Catálogo de materiales"
-- cada taller debe poder editar CUALQUIER material (categoría, nombre, precio),
-- incluidas las filas base de Costo360, y que ese cambio:
--   * se vea en vivo para todos los usuarios de ESE taller,
--   * NO afecte el catálogo de ningún otro taller.
--
-- Implementación "copy-on-write":
--   * Editar una fila base NO la modifica (sigue siendo inmutable y compartida).
--     Crea una fila propia del taller que la "sombrea", con `base_id` apuntando
--     a la base.
--   * El listado devuelve las filas propias del taller + las base que NO estén
--     sombreadas por una fila propia (ver backend/routers/materiales.py).
--   * Borrar el override hace que la base vuelva a verse (equivale a "restablecer
--     al valor de Costo360").
-- NO toca el motor de cálculo.
-- ============================================================================

alter table catalogo_materiales
  add column if not exists base_id bigint references catalogo_materiales(id) on delete set null;

create index if not exists idx_catalogo_base_id
  on catalogo_materiales(base_id)
  where base_id is not null;

-- Un taller no puede sombrear la misma base dos veces.
create unique index if not exists catalogo_override_uniq
  on catalogo_materiales (empresa_id, base_id)
  where base_id is not null;
