/**
 * Lockup del logo Costo360 — PROVISIONAL (isotipo + wordmark tipográfico).
 *
 * El arte del fundador (`web/public/logo.png`) tiene la palabra "Costo" en gris
 * muy claro: ilegible sobre fondo claro, y su isotipo verde desaparece sobre la
 * barra esmeralda. Hasta tener un SVG limpio multi-variante, este componente
 * arma el lockup con el isotipo (`/isotipo.png`) + texto controlable por color:
 *   - variant="dark"  → sobre fondo claro (login, header, reset)
 *   - variant="light" → sobre la barra lateral esmeralda (isotipo forzado a blanco)
 *
 * El tamaño lo controla el `font-size` del contenedor (usar `text-*` en className).
 */
export default function Logo({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'light'
  className?: string
}) {
  const costoColor = variant === 'light' ? 'text-white' : 'text-brand-text-dark'
  const isoFilter = variant === 'light' ? 'brightness-0 invert' : ''

  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight leading-none ${className}`}>
      <img
        src="/isotipo.png"
        alt=""
        aria-hidden="true"
        className={`h-[1.15em] w-auto object-contain ${isoFilter}`}
      />
      <span>
        <span className={costoColor}>Costo</span>
        <span className="text-brand-gold">360</span>
      </span>
    </span>
  )
}
