import { expect, test, type Page } from "@playwright/test";

// The end-to-end server's passphrase (playwright.config.ts). Start, End and Clear
// change the shared party for every test running alongside, so they're tested
// at the route level (lib/admin/server.test.ts) instead.
const PASS = "e2e-host-pass";
const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

async function signIn(page: Page, passphrase = PASS) {
  await page.goto("/admin");
  await page.getByLabel("Passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("S06-AC1 S06-AC4 S06-AC5 S07-AC1: sign in, see the events, sign out", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "tablet", "One admin run is enough");
  await page.goto("/admin/holiday-2026");
  await expect(page).toHaveURL(/\/admin$/);
  await signIn(page, "not-it");
  await expect(page.locator("main").getByRole("alert")).toHaveText("That passphrase isn't right.");
  await signIn(page);
  const events = page.getByRole("list", { name: "Events" });
  await expect(events).toContainText("Nova Wushu Holiday Party");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Passphrase")).toBeVisible();
});

test("S07-AC3 S07-AC4 S07-AC6 S07-AC7: find a player, change their points, reset a game, remove them", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name !== "tablet", "One admin run is enough");
  const name = unique("Host");
  const phone = await (
    await browser.newContext({ viewport: { width: 412, height: 915 } })
  ).newPage();
  await phone.goto("/holiday-2026?code=WUSH7");
  await phone.getByLabel("Your name").fill(name);
  await phone.getByRole("button", { name: "Join", exact: true }).click();
  await expect(phone.getByRole("navigation", { name: "Party" })).toContainText(name);

  await signIn(page);
  await page.getByRole("link", { name: /Nova Wushu Holiday Party/ }).click();
  await page.getByPlaceholder("Find a player").fill(name);
  const row = page
    .getByRole("list", { name: "Players" })
    .getByRole("listitem")
    .filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: new RegExp(name) }).click();

  await row.getByPlaceholder("+50 or -20").fill("25");
  await row.getByPlaceholder(/Reason/).fill("Best costume");
  await row.getByRole("button", { name: "Change points" }).click();
  await expect(row.getByRole("button", { name: new RegExp(name) })).toContainText("25");

  await row.getByRole("button", { name: "Reset game" }).click();
  await row.getByRole("button", { name: "Reset it" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);

  await row.getByRole("button", { name: "Remove" }).click();
  await row.getByRole("button", { name: `Remove ${name}` }).click();
  await expect(page.getByRole("list", { name: "Players" }).getByText(name)).toHaveCount(0);

  await phone.reload();
  await expect(phone.getByRole("heading", { name: "Join the party" })).toBeVisible();
});
