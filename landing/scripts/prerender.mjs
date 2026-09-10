import { readFile, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

// Build-time only. dist/ remains ordinary static HTML, CSS and JS.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const { SITE_URL, structuredData, faqs, PRODUCT_LOGIN_URL } =
    await server.ssrLoadModule("/src/lib/content.ts");
  const template = await readFile("dist/index.html", "utf8");
  if (
    !template.includes("<!--app-html-->") ||
    !template.includes("<!--structured-data-->")
  )
    throw new Error("Missing prerender markers");
  const json = JSON.stringify(structuredData()).replaceAll("<", "\\u003c");
  const html = template
    .replace("<!--app-html-->", () => renderToString(createElement(App)))
    .replace(
      "<!--structured-data-->",
      () => `<script type="application/ld+json">${json}</script>`,
    );
  await writeFile("dist/index.html", html);
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>`,
  );
  const robots = await readFile("public/robots.txt", "utf8");
  await writeFile(
    "dist/robots.txt",
    `${robots.trim()}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );
  const llms = await readFile("public/llms.txt", "utf8");
  await writeFile(
    "dist/llms.txt",
    `${llms.trim()}\n\n## Enlaces oficiales\n- Landing: ${SITE_URL}/\n- Producto (acceso por invitación): ${PRODUCT_LOGIN_URL}\n\n## Preguntas frecuentes\n${faqs.map((f) => `### ${f.question}\n${f.answer}`).join("\n\n")}\n`,
  );
  console.log(
    `Prerender complete: ${(Buffer.byteLength(html) / 1024).toFixed(1)} kB HTML, JSON-LD, sitemap and llms.txt.`,
  );
} finally {
  await server.close();
}
