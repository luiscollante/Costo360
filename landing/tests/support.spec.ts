import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// UI determinista y sin consumir la API. El servicio tiene pruebas propias y
// una evaluación real explícita: atencion.evaluate --live.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/atencion/chat", async (route) => {
    const { message } = route.request().postDataJSON();
    const text = message.includes("3")
      ? "Para 3 personas, Pro es el primer plan que cubre esa cantidad: $375.000 COP al mes por empresa."
      : "Starter $150.000, Pro $375.000 y Enterprise $2.410.000 COP al mes. ¿Cuántas personas usarían el sistema?";
    await route.fulfill({
      json: {
        text,
        mode: "ia",
        links: [{ label: "Comparar planes", href: "#planes" }],
      },
    });
  });
});

for (const width of [390, 1440]) {
  test(`attention conversation, keyboard and links at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Hablemos de tu empresa" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel("Tu consulta sobre Costo360")).toBeFocused();
    await page.getByRole("button", { name: "¿Qué plan me conviene?" }).click();
    await expect(dialog.getByText(/Enterprise \$2.410.000/)).toBeVisible();
    await page
      .getByLabel("Tu consulta sobre Costo360")
      .fill("Somos 3 personas");
    await page.getByRole("button", { name: "Enviar consulta" }).click();
    await expect(dialog.getByText(/Pro es el primer plan/)).toBeVisible();
    await expect(
      dialog.getByText("IA · respuestas de la guía de Costo360"),
    ).toBeVisible();
    const a11y = await new AxeBuilder({ page })
      .include("#support-dialog")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({ path: `artifacts/support-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hablemos de tu empresa" }),
    ).toBeFocused();
  });
}
test("attention unavailable preserves question and does not invent success", async ({
  page,
}) => {
  await page.route("**/api/atencion/chat", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Hablemos de tu empresa" }).click();
  await page.getByLabel("Tu consulta sobre Costo360").fill("Necesito ayuda");
  await page.getByRole("button", { name: "Enviar consulta" }).click();
  await expect(page.getByRole("alert")).toContainText("no está disponible");
  await expect(page.getByLabel("Tu consulta sobre Costo360")).toHaveValue(
    "Necesito ayuda",
  );
});

test("closing call to action opens the real chat interface", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Conversemos sobre tu taller" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Tu consulta sobre Costo360")).toBeFocused();
  await expect(page.getByRole("dialog")).toContainText(
    "Google procesa tu consulta",
  );
});
