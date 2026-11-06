import { expect, test, type Page } from "@playwright/test";

// Every test runs on phone, tablet and TV against one server, so names are unique per run.
const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

async function join(page: Page, name: string, code?: string) {
  await page.getByLabel("Your name").fill(name);
  if (code) await page.getByLabel("Party code").fill(code);
  await page.getByRole("button", { name: "Join" }).click();
}

const playingAs = (page: Page, name: string) =>
  expect(page.getByText("Playing as")).toContainText(name);

test("S02-AC1 S02-AC2 S02-AC6 S02-AC7: scan, join, add a player, switch, and reload", async ({
  page,
}) => {
  const mai = unique("Mai");
  const bao = unique("Bao");
  await page.goto("/join?code=WUSH7");
  await expect(page).toHaveURL(/\/holiday-2026\?code=WUSH7$/);
  await expect(page.getByRole("heading", { name: "Join the party" })).toBeVisible();
  await expect(page.getByLabel("Party code")).toHaveCount(0);
  await join(page, mai);
  await playingAs(page, mai);

  await page.getByRole("button", { name: "Add player" }).click();
  await expect(page.getByLabel("Party code")).toHaveCount(0);
  await join(page, bao);
  await playingAs(page, bao);

  await page.getByRole("button", { name: "Switch player" }).click();
  await page.getByRole("button", { name: mai }).click();
  await playingAs(page, mai);

  await page.goto("/holiday-2026");
  await playingAs(page, mai);
  await expect(page.getByRole("heading", { name: "Join the party" })).toHaveCount(0);
});

test("S02-AC2: a wrong code is refused", async ({ page }) => {
  await page.goto("/holiday-2026");
  await join(page, unique("Lan"), "ZZZZZ");
  await expect(page.getByRole("alert").filter({ hasText: "code" })).toHaveText(
    "That code isn't right for this event.",
  );
});

test("S02-AC4: a name another phone holds is taken", async ({ browser }) => {
  const name = unique("Kim");
  const first = await (await browser.newContext()).newPage();
  await first.goto("/holiday-2026?code=WUSH7");
  await join(first, name);
  await playingAs(first, name);

  const second = await (await browser.newContext()).newPage();
  await second.goto("/holiday-2026?code=WUSH7");
  await join(second, name.toLowerCase());
  await expect(second.getByRole("alert").filter({ hasText: "taken" })).toHaveText(
    "That name is taken. Pick another name.",
  );
});

test("S02-AC5: a rude name is flagged while it's typed", async ({ page }) => {
  await page.goto("/holiday-2026?code=WUSH7");
  await page.getByLabel("Your name").fill("sh1t");
  await expect(page.getByRole("alert").filter({ hasText: "name" })).toHaveText(
    "Pick another name.",
  );
  await expect(page.getByRole("button", { name: "Join" })).toBeDisabled();
});
