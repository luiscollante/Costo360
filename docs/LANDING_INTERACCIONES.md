# Landing: interacción y dirección visual

Implementado el 23 de septiembre de 2026 en `landing/` por solicitud del fundador.

## Referencias exploradas

- [Animmaster — Scroll](https://animmasterlib.dev/scroll): galería visual de escenas, profundidad y composiciones que cambian con el desplazamiento. Adaptación: recorrido de material → costos → propuesta con escena fija y progreso ligado al scroll.
- [Skiper — Image Reveal](https://skiper-ui.com/v1/skiper71): demostración pública de revelado de imágenes. Adaptación: revelado con recorte, profundidad y transiciones en las capturas reales del producto; selector con indicador deslizante.
- [Vengeance — Glow Border Card](https://www.vengenceui.com/components/glow-border-card) y [Spotlight Navbar](https://www.vengenceui.com/components/spotlight-navbar): reflejos, bordes y estados de navegación. Adaptación: iluminación localizada en módulos, indicador de sección y línea de progreso. Los acentos usan los colores de Costo360.

Las referencias informan el diseño. El código de interacción es original: no se compraron ni copiaron componentes premium, no se añadieron librerías y no se incorporaron dependencias de Next.js, WebGL o servicios externos.

## Comportamiento

- Portada: revelado inicial del titular y botón con desplazamiento sutil al acercar el cursor.
- Producto: capturas reales conservadas, marco de aplicación, indicador animado y cambio de pantalla mediante botones accesibles.
- Proceso: tres escenas ilustrativas; scroll en escritorio y selección directa por botón. En móvil, la escena precede al texto y no ocupa permanentemente la pantalla.
- Módulos: abanico de materiales, documentos, tablero y roles. Reacciones de hover/foco y funciones desplegables con `details`, disponibles sin JavaScript.
- Cost: tres ejemplos locales seleccionables. La región de lectura se mantiene estable para anunciar cambios. No simula una respuesta real ni envía solicitudes a IA/backend.
- Cierre: el botón principal conduce a los planes cuando no hay enlace de demo configurado.
- Enlaces directos: se restaura la sección indicada en la URL después del montaje.

Se mantiene la decisión previa del fundador de conservar animaciones aunque el sistema operativo solicite movimiento reducido. Los efectos de cursor ignoran entradas táctiles. El scroll es nativo, sin captura de la rueda. Los textos conservan colores sólidos; ninguna entrada anima su opacidad.

Las tarjetas de planes, sus precios y los assets generados previamente se conservan. Cost sigue anunciado desde Starter; esta intervención no altera los cupos ni la implementación del backend.

## Validación

La suite de `landing/tests` comprueba contraste, texto opaco, 320/390/768/1440 px, navegación con teclado, capturas reales, HTML sin JavaScript, simulador y ausencia de solicitudes al backend. `experience.spec.ts` agrega scroll/selección del proceso, ejemplos de Cost, despliegue de módulos y enlaces directos. Evidencia visual en `landing/artifacts/`.

Cambios locales, sin despliegue.
