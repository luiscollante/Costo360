import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SITE_URL, PRODUCT_LOGIN_URL, faqs } from "../src/lib/content";
import { productScreens, costScreen } from "../src/lib/productScreens";

for (const width of [320, 390, 768, 1440]) {
  test(`responsive, hydration, links and contrast at ${width}px`, async ({
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
      if (
        !request.url().startsWith("http://127.0.0.1:4173/") ||
        /supabase|\/api\/|costo360-backend/i.test(request.url()) ||
        ["fetch", "xhr"].includes(request.resourceType())
      )
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
    for (const screen of productScreens) {
      await page
        .getByRole("button", { name: new RegExp(screen.label) })
        .click();
      await expect(page.locator(`#screen-${screen.id}`)).toBeVisible();
      await expect(page.locator(`#screen-${screen.id} img`)).toHaveJSProperty(
        "naturalWidth",
        screen.width,
      );
    }
    const overflow = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          "h1,h2,h3,p,button,input,select,summary,.container,figcaption",
        ),
      ]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
        })
        .map((el) => ({ tag: el.tagName, text: el.textContent?.slice(0, 90) })),
    );
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
    expect(
      await page.locator(`a[href="${PRODUCT_LOGIN_URL}"]`).count(),
    ).toBeGreaterThanOrEqual(3);
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

test("real captures, keyboard selection and safe enlargement", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.getByRole("button", { name: /Plano de corte/ });
  await first.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("#screen-cotizacion")).toBeVisible();
  await expect(page.locator("#screen-nesting")).toBeHidden();
  const imageLink = page.getByRole("link", {
    name: /Ampliar captura: Cotización Directa/,
  });
  const popupEvent = page.waitForEvent("popup");
  await imageLink.click();
  const popup = await popupEvent;
  await popup.waitForLoadState();
  expect(popup.url()).toContain(productScreens[1].src);
  await popup.close();
  await expect(page.locator("#cost")).toContainText(
    "Sin tu confirmación, no hay cambios.",
  );
  await expect(page.locator("#cost img")).toHaveAttribute(
    "src",
    costScreen.src,
  );
  await expect(page.locator("#cost")).toContainText(
    "Esta landing no ejecuta IA",
  );
});

test("FAQ and mobile keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .locator("#mobile-navigation")
    .getByRole("link", { name: "El producto", exact: true })
    .click();
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  const faq = faqs.find((f) => f.question.startsWith("¿Cómo cotizo"))!;
  await page.locator("summary").filter({ hasText: faq.question }).click();
  await expect(page.locator("details[open]")).toContainText(faq.answer);
});

test("light mode and animations remain active with reduced-motion preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/");
  expect(
    await page
      .locator("html")
      .evaluate((el) => getComputedStyle(el).colorScheme),
  ).toBe("light");
  const animation = await page.locator(".slab-float").evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      name: style.animationName,
      state: style.animationPlayState,
      duration: style.animationDuration,
    };
  });
  expect(animation).toEqual({
    name: "slab-float",
    state: "running",
    duration: "7s",
  });
});

test("initial HTML, images and metadata are complete without JavaScript", async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Tu oficio es",
  );
  await expect(page.locator(".hero-description")).toContainText("marmolerías");
  await expect(page.locator("#planes")).toContainText("Precio a consultar");
  await expect(page.locator("details")).toHaveCount(faqs.length);
  for (const screen of productScreens)
    await expect(page.locator(`#screen-${screen.id}`)).toBeVisible();
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
  expect(data["@graph"][1].screenshot).toHaveLength(5);
  expect(data["@graph"][1]).not.toHaveProperty("aggregateRating");
  expect(data["@graph"][1]).not.toHaveProperty("offers");
  const html = await (await request.get("/")).text();
  expect(html).not.toMatch(
    /costo360\.com|150000|375000|2410000|99\.4|líder en|%VITE_|<!--app-html-->|05-cost-agente-respuesta|Confirmar ejemplo/,
  );
  expect(html).not.toMatch(/[\p{L}][?\uFFFD][\p{L}]/u);
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
    ...productScreens.map((s) => s.src),
    costScreen.src,
  ]) {
    const response = await request.get(resource);
    expect(response.status(), resource).toBe(200);
    if (resource.endsWith(".webp"))
      expect(response.headers()["content-type"]).toContain("image/webp");
  }
  expect(await (await request.get("/robots.txt")).text()).toContain(
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  );
  expect(await (await request.get("/llms.txt")).text()).toContain(
    PRODUCT_LOGIN_URL,
  );
  await context.close();
});
