import { expect, test } from "@playwright/test";

test("the app loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Game Master");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Game Master");
});

test("the page never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
