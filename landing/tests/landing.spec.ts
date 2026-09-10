import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SITE_URL, PRODUCT_LOGIN_URL, faqs } from "../src/lib/content";

for (const width of [320, 390, 768, 1440]) {
  test(`responsive, hydration, links and WCAG AA at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    const network: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (/supabase|\/api\/|costo360-backend/i.test(request.url()))
        network.push(request.url());
    });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page
      .getByRole("button", { name: "Ver Granito", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Ver Granito", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Ver Mármol", exact: true }).click();
    await page
      .getByRole("button", { name: "Pausar movimiento", exact: true })
      .click();
    const overflow = await page.evaluate(() => {
      return [
        ...document.querySelectorAll(
          "h1,h2,h3,p,button,input,select,summary,.container",
        ),
      ]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
        })
        .map((el) => ({ tag: el.tagName, text: el.textContent?.slice(0, 90) }));
    });
    expect(overflow).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const brokenAnchors = await page
      .locator('a[href^="#"]')
      .evaluateAll((links) =>
        links
          .map((a) => a.getAttribute("href")!)
          .filter((href) => !document.getElementById(href.slice(1))),
      );
    expect(brokenAnchors).toEqual([]);
    const productLinks = await page
      .locator(`a[href="${PRODUCT_LOGIN_URL}"]`)
      .count();
    expect(productLinks).toBeGreaterThanOrEqual(3);
    await page.evaluate(() => window.scrollTo(0, 0));
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          failure: n.failureSummary,
        })),
      })),
    ).toEqual([]);
    await page.screenshot({
      path: `artifacts/landing-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(network).toEqual([]);
  });
}

test("local simulator changes, warns about pieces and resets", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".simulation-results")).toContainText("65,6");
  await page.locator("#piece-length").fill("260");
  await page.locator("#piece-width").fill("100");
  await expect(page.locator(".placement-warning")).toContainText(
    "3 piezas no caben",
  );
  await page.getByRole("button", { name: "Agregar una pieza" }).click();
  await expect(page.locator(".placement-warning")).toContainText(
    "4 piezas no caben",
  );
  await page.locator("#demo-material").selectOption("2");
  await expect(page.locator(".studio-canvas image")).toHaveAttribute(
    "href",
    "/media/sintered.webp",
  );
  await page.getByRole("button", { name: "Restablecer demostración" }).click();
  await expect(page.locator(".simulation-results")).toContainText("65,6");
  await expect(page.locator(".placement-ok")).toBeVisible();
});

test("Cost confirms or cancels only the local example", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Confirmar ejemplo" }).click();
  await expect(page.locator(".confirmation-result")).toContainText(
    "Tarea añadida al ejemplo local.",
  );
  await page.getByRole("button", { name: "Repetir ejemplo" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".confirmation-result")).toContainText(
    "Acción cancelada. Nada cambió.",
  );
  await page.getByRole("button", { name: "Inventario", exact: true }).click();
  await expect(page.locator(".confirmation-card h4")).toHaveText(
    "Registrar retal",
  );
  await page.getByRole("button", { name: "Cotización", exact: true }).click();
  await expect(page.locator(".confirmation-card h4")).toHaveText(
    "Crear cotización",
  );
});

test("film chapters, pause control, FAQ and mobile keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
  await page
    .getByRole("button", { name: "Revisa el desglose", exact: true })
    .click();
  await expect(page.locator(".film-copy h3")).toHaveText(
    "Cada costo, una razón.",
  );
  await page
    .getByRole("button", { name: "Presenta tu trabajo", exact: true })
    .click();
  await expect(page.locator(".film-copy h3")).toHaveText(
    "Tu propuesta, lista para compartir.",
  );
  await page
    .getByRole("button", { name: "Pausar movimiento", exact: true })
    .click();
  await expect(page.locator(".site")).toHaveClass(/motion-paused/);
  await page.locator("summary").filter({ hasText: faqs[1].question }).click();
  await expect(page.locator("details[open]")).toContainText(faqs[1].answer);
  await page.getByRole("button", { name: "Reanudar movimiento" }).click();
  await expect(page.locator(".site")).not.toHaveClass(/motion-paused/);
});

test("initial HTML and metadata are complete without JavaScript", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Tu oficio es",
  );
  await expect(page.locator("#planes")).toContainText("Precio a consultar");
  await expect(page.locator("details")).toHaveCount(faqs.length);
  await page.locator("summary").nth(1).click();
  await expect(page.locator("details[open] p")).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE_URL}/`,
  );
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ||
      "{}",
  );
  expect(
    data["@graph"].map((item: { "@type": string }) => item["@type"]),
  ).toEqual(["Organization", "SoftwareApplication", "FAQPage"]);
  expect(data["@graph"][2].mainEntity).toHaveLength(faqs.length);
  const html = await (await request.get("/")).text();
  expect(html).not.toMatch(
    /costo360\.com|150000|375000|2410000|99\.4|líder en|%VITE_|<!--app-html-->/,
  );
  for (const resource of [
    "/media/og-cover.jpg",
    "/media/marble.webp",
    "/media/granite.webp",
    "/media/sintered.webp",
    "/favicon.svg",
    "/logo_versiones_oscuras.png",
    "/sitemap.xml",
    "/robots.txt",
    "/llms.txt",
  ]) {
    expect((await request.get(resource)).status(), resource).toBe(200);
  }
  expect(await (await request.get("/robots.txt")).text()).toContain(
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  );
  expect(await (await request.get("/llms.txt")).text()).toContain(
    PRODUCT_LOGIN_URL,
  );
  await context.close();
});
