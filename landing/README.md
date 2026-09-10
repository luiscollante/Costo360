# Costo360 — Landing pública

Proyecto estático e independiente del producto. React 19, Vite, TypeScript, Tailwind v4 y Framer Motion. **No requiere `.env`, claves, backend ni base de datos.**

## Retoma del rediseño

Se conservaron los avances de la sesión interrumpida: identidad crema/verde, logo original, hero con lámina 3D y partículas reactivas, selección de materiales, simulador local, módulos y demo guiada de Cost.

Se completó:
- Recorrido animado de medidas → desglose → PDF, con selección de escenas y pausa. Es motion design local, no un video ni una grabación del producto. No se ha añadido metraje de terceros.
- Eliminación de las cifras, precios y promesas antiguas del HTML, Schema.org y `llms.txt`. Se retiró la calculadora ROI obsoleta con tarifa y ahorro supuestos.
- Prerender del mismo árbol React al construir: el HTML servido contiene títulos, funciones, planes y FAQ sin ejecutar JavaScript. El cliente hidrata ese HTML.
- URLs centralizadas, imagen social local 1200×630, metadatos completos, JSON-LD y sitemap.
- Formato legible, pruebas reproducibles y exclusión de artefactos locales de Git.

## Ejecutar y verificar

```sh
npm ci
npm run dev
npx tsc -b --noEmit
npm run build
npm run preview
npm test
```

`npm test` construye la versión de producción, la sirve temporalmente en el puerto 4173 y usa **Microsoft Edge instalado** mediante Playwright. No abre el producto real. Para otro sistema, configura el canal del navegador en `playwright.config.ts`.

Última verificación local: **13 pruebas aprobadas**:
- Hidratación, enlaces, ausencia de llamadas al backend y límites de pantalla en 320, 390, 768 y 1440 px.
- Análisis automatizado axe de WCAG A/AA, sin incidencias detectadas en esos anchos. No equivale a una certificación o auditoría manual exhaustiva.
- Contraste de pares de texto de marca ≥4.5:1, incluidos hover y superficies verdes.
- Selección de materiales, controles y reinicio del simulador; confirmación/cancelación local de Cost.
- Menú móvil con Escape y devolución del foco, FAQ nativa y recorrido animado.
- Animaciones activas independientemente de la preferencia del sistema; pausa manual disponible.
- HTML sin JavaScript, JSON-LD, recursos públicos, robots y sitemap.
- 2.520 combinaciones del simulador: conservación de área, piezas sin solapamiento ni salidas de la lámina.

Capturas por ancho en `artifacts/landing-*.png`; reporte en `playwright-report/`. Son locales e ignorados por Git.

## Contenido y configuración pública

`src/lib/content.ts` centraliza:
- `SITE_URL`: dominio de esta landing. Vite actualiza canonical/OG y el prerender genera sitemap/robots/llms a partir de él.
- `PRODUCT_LOGIN_URL`: destino separado de los enlaces al producto.
- `DEMO_CONTACT_URL`: **pendiente de confirmación del fundador**. Puede ser agenda, WhatsApp o `mailto:` real. Vacío significa que se ofrece explorar la demo y se informa que el canal público aún no está disponible. No hay formularios falsos ni solicitudes simuladas.
- FAQ y Schema.org comparten los mismos datos.

Los planes son mensuales: Starter (1 usuario), Pro (3) y Enterprise (hasta 10). **Los precios y el alcance por plan deben confirmarse con el fundador**; no se publican tarifas supuestas ni ofertas estructuradas de precio cero.

Las funciones se describen conforme a `docs/PROMPT_REDISENO_LANDING.md`. Las ilustraciones se identifican como conceptuales. Los porcentajes del simulador son cocientes de áreas del ejemplo, no ahorros medidos ni resultados comerciales. No se importó código del motor de producción.

## Publicación

`npm run build` genera `dist/` completamente estático. El prerender solo corre durante el build; no se despliega un servidor React ni se requieren funciones serverless. El pipeline GitHub/Vercel existente publica al subir a `master`; no usar `vercel deploy` ni solicitar tokens.

Solo deben incluirse cambios de `landing/`. Los archivos y modificaciones ajenos a esta carpeta pertenecen a otros trabajos y no forman parte del rediseño.
