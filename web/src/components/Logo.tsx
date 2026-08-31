/**
 * Logo Costo360 (arte real del fundador). `variant` = color de la tinta del logo,
 * elegido según el fondo donde se pinta:
 *   - variant="light" → logo claro (wordmark blanco). Va sobre fondo oscuro:
 *     la barra lateral esmeralda.  Fuente: /logo.png
 *   - variant="dark"  → logo de tinta oscura. Va sobre fondo claro: login,
 *     encabezado, restablecer contraseña.  Fuente: /logo_vectorized.svg
 *
 * El tamaño lo da el `className` del que lo usa (p. ej. `w-[200px] h-auto`).
 */
export default function Logo({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'light'
  className?: string
}) {
  const src = variant === 'light' ? '/logo.png' : '/logo_vectorized.svg'
  return <img src={src} alt="Costo360" className={className} />
}
