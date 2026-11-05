import { expect, test } from "@playwright/test";

test("the UI gallery shows every pack section and the admin theme without sideways scroll", async ({
  page,
}, info) => {
  await page.goto("/dev/ui");
  await expect(page.getByRole("heading", { level: 1, name: "UI gallery" })).toBeVisible();
  for (const name of [
    "Judges' Table · Winter · Light",
    "Judges' Table · Winter · Dark",
    "Admin · Light",
  ]) {
    await expect(page.getByRole("region", { name })).toBeVisible();
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await page.screenshot({ path: `test-results/gallery-${info.project.name}.png`, fullPage: true });
});
