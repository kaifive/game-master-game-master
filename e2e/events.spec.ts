import { expect, test, type Page } from "@playwright/test";

const noSideScroll = async (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("S01-AC8, S01-AC9: home → code → the event, keeping the code", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Code").fill("wush7");
  await page.getByRole("button", { name: "Go" }).click();
  await expect(page).toHaveURL(/\/holiday-2026\?code=WUSH7$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Nova Wushu Holiday Party" }),
  ).toBeVisible();
});

test("an unknown code returns home with an error", async ({ page }) => {
  await page.goto("/join?code=ZZZZ9");
  await expect(page).toHaveURL(/\/\?error=code$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "We couldn't find that code" }),
  ).toBeVisible();
});

test("S01-AC11: the holiday party page renders in its style without sideways scroll", async ({
  page,
}, info) => {
  await page.goto("/holiday-2026");
  await expect(
    page.locator('[data-pack="judges-table"][data-variant="winter"][data-color-mode="dark"]'),
  ).toBeVisible();
  await expect(
    page.getByText("Some games are open now. The rest open when the host starts them."),
  ).toBeVisible();
  expect(await noSideScroll(page)).toBe(0);
  const fills = await page.evaluate(() => {
    const surface = document.querySelector('[data-slot="surface"]');
    return surface ? surface.getBoundingClientRect().height >= window.innerHeight : false;
  });
  expect(fills).toBe(true);
  await page.screenshot({ path: `test-results/holiday-${info.project.name}.png`, fullPage: true });
});

test("S01-AC3: unknown events and games get a friendly page", async ({ page }) => {
  const res = await page.goto("/no-such-party");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We couldn't find that event" })).toBeVisible();
  const game = await page.goto("/holiday-2026/play/no-such-game");
  expect(game?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We couldn't find that game" })).toBeVisible();
});

test("S01-AC10: join codes never reach the browser", async ({ page, request }) => {
  for (const path of ["/", "/holiday-2026", "/holiday-2026/play/daily-word"]) {
    await page.goto(path);
    const html = await page.content();
    expect(html).not.toContain("WUSH7");
    const scripts = await page
      .locator("script[src]")
      .evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
    for (const src of scripts) expect(await (await request.get(src)).text()).not.toContain("WUSH7");
  }
});
