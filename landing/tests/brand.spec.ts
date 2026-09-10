import { test, expect } from "@playwright/test";

function luminance(hex: string) {
  const channels = hex.match(/[0-9a-f]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("brand text pairs meet 4.5:1, including button hover and dark surfaces", () => {
  const pairs = [
    ["#4A4A4A", "#F5E8D2"],
    ["#1A1A1A", "#F5E8D2"],
    ["#15612E", "#F5E8D2"],
    ["#6E5410", "#F5E8D2"],
    ["#4A4A4A", "#FFFFFF"],
    ["#1A1A1A", "#FFFFFF"],
    ["#15612E", "#FFFFFF"],
    ["#FFFFFF", "#15612E"],
    ["#FFFFFF", "#1A7A3A"],
    ["#FFFFFF", "#00311D"],
    ["#F5E8D2", "#00311D"],
    ["#F5E8D2", "#00472B"],
    ["#FFFFFF", "#00472B"],
  ];
  for (const [text, background] of pairs) {
    const l1 = luminance(text),
      l2 = luminance(background);
    expect(
      (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
      `${text} on ${background}`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test("animation runs regardless of system motion preference and has a manual pause", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".slab-float")).toHaveCSS(
    "animation-play-state",
    "running",
  );
  await page.locator(".process-film").scrollIntoViewIfNeeded();
  await expect(page.locator(".process-film")).toHaveClass(/chapter-0/);
  await expect(page.locator(".process-film")).toHaveClass(/chapter-1/, {
    timeout: 9000,
  });
  await page
    .getByRole("button", { name: "Pausar recorrido", exact: true })
    .click();
  await expect(page.locator(".film-laser")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  await page
    .getByRole("button", { name: "Pausar movimiento", exact: true })
    .click();
  await expect(page.locator(".slab-float")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
});
