import { test, expect } from "@playwright/test";

test("workshop scene follows the story and can also be selected directly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (let index = 0; index < 3; index++) {
    await page
      .locator(".journey-step")
      .nth(index)
      .evaluate((el) =>
        el.scrollIntoView({ block: "center", behavior: "instant" }),
      );
    await expect(page.locator(".journey-scene")).toHaveAttribute(
      "data-stage",
      String(index),
    );
  }
  const stages = page.getByRole("group", { name: "Etapas del proceso" });
  await stages.getByRole("button", { name: /Material/ }).click();
  await expect(page.locator(".journey-scene")).toHaveAttribute(
    "data-stage",
    "0",
  );
  await stages.getByRole("button", { name: /Costos/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".journey-scene")).toHaveAttribute(
    "data-stage",
    "1",
  );
  await page
    .locator(".journey-scene")
    .screenshot({ path: "artifacts/journey-desktop.png" });
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
