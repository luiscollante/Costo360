import { test, expect } from "@playwright/test";

test("stone cost details work by pointer and keyboard", async ({ page }) => {
  await page.goto("/");
  const factors = page.getByRole("group", { name: "Factores del costo" });
  await factors.getByRole("button", { name: /Mano de obra/ }).click();
  await expect(page.locator(".detail-explanation")).toContainText(
    "cortes, ensambles",
  );
  await factors.getByRole("button", { name: /Riesgo de rotura/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".detail-explanation")).toContainText(
    "riesgo de rotura",
  );
  await expect(
    factors.getByRole("button", { name: /Riesgo de rotura/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .locator(".detail-art")
    .screenshot({ path: "artifacts/detail-desktop.png" });
});

test("Cost examples and module details work on mobile without product requests", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: string[] = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType()))
      requests.push(request.url());
  });
  await page.goto("/");
  const examples = page.getByRole("group", {
    name: "Ejemplos de ayuda de Cost",
  });
  await examples
    .getByRole("button", { name: "Inventario", exact: true })
    .click();
  await expect(page.locator(".example-action")).toContainText(
    "confirmación antes de crearlo",
  );
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(
    examples.getByRole("button", { name: "Proyectos", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".example-action")).toContainText(
    "autorizas su creación",
  );
  await page
    .locator(".cost-preview")
    .screenshot({ path: "artifacts/cost-mobile.png" });
  const material = page.locator(".module-card").first();
  await material.locator("summary").click();
  await expect(
    material.getByText("Retales con m² y precio de recuperación"),
  ).toBeVisible();
  await expect(page.locator("#cost .human-rule")).toContainText(
    "Sin tu confirmación, no hay cambios.",
  );
  expect(requests).toEqual([]);
});

test("a direct link opens the requested section after hydration", async ({
  page,
}) => {
  await page.goto("/#cost");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("#cost-title")).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "Conoce a Cost", exact: true }),
  ).toHaveAttribute("aria-current", "location");
});
