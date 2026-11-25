import { expect, type Browser, type Page } from "@playwright/test";

/** The host passphrase the e2e server runs with (playwright.config.ts). */
export const PASS = "e2e-host-pass";

export const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

/** A phone that has joined the holiday party under `name`, optionally on a slow network. */
export async function joinOnPhone(
  browser: Browser,
  name: string,
  baseURL: string,
  lagMs = 0,
): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  await context.addCookies([{ name: "gm-dev-status", value: "live", url: baseURL }]);
  if (lagMs > 0) await slowNetwork(context, lagMs);
  const phone = await context.newPage();
  await phone.goto("/holiday-2026?code=WUSH7");
  await phone.getByLabel("Your name").fill(name);
  await phone.getByRole("button", { name: "Join", exact: true }).click();
  await expect(phone.getByRole("navigation", { name: "Party" })).toContainText(name);
  return phone;
}

/** Delays every API call by `ms`, as party wifi would. */
export async function slowNetwork(context: { route: Page["route"] }, ms: number): Promise<void> {
  await context.route("**/api/**", async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

/**
 * Signs Controls in, ends anything left running, makes each player a captain
 * and starts the team phase. A retry starts from wherever the last one stopped.
 */
export async function teamPhaseWithCaptains(page: Page, names: readonly string[]) {
  await page.goto("/admin");
  await page.getByLabel("Passphrase").fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: /Nova Wushu Holiday Party/ }).click();
  if (await page.getByRole("button", { name: "End early" }).isVisible())
    await page.getByRole("button", { name: "End early" }).click();
  if (await page.getByRole("button", { name: "Back to individual" }).isVisible()) {
    await page.getByRole("button", { name: "Back to individual" }).click();
    await page.getByRole("button", { name: "Yes, go back" }).click();
  }
  for (const name of names) {
    await page.getByPlaceholder("Find a player").fill(name);
    await page
      .getByRole("list", { name: "Players" })
      .getByRole("button", { name: new RegExp(name) })
      .click();
    // A retry finds them made captain already.
    const make = page.getByRole("button", { name: "Make captain" });
    if (await make.isVisible().catch(() => false)) await make.click();
    await expect(page.getByRole("list", { name: "Teams", exact: true })).toContainText(
      `Team ${name}`,
    );
  }
  if (await page.getByRole("button", { name: "Start the team phase" }).isVisible()) {
    await page.getByRole("button", { name: "Start the team phase" }).click();
    await page.getByRole("button", { name: "Yes, start teams" }).click();
  }
  await expect(page.getByText("Phase: Team")).toBeVisible();
}
