import { expect, test } from "@playwright/test";

test("the motion gallery plays a stage moment and a toast without sideways scroll", async ({
  page,
}, info) => {
  await page.goto("/dev/ui/motion");
  const section = page.getByRole("region", { name: "Judges' Table · Winter · Dark" });
  await expect(section).toBeVisible();
  await section.getByRole("button", { name: "Play game-finished" }).click();
  await expect(section.getByRole("list", { name: "Latest" })).toContainText(
    "Mai finished Gift Guess",
  );
  await section.getByRole("button", { name: "Play lead-change" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Team Dragon takes the lead!" }),
  ).toBeVisible();
  await page.screenshot({ path: `test-results/motion-${info.project.name}.png` });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
