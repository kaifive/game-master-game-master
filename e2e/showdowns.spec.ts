import { expect, test, type Browser, type Page } from "@playwright/test";

// Showdowns need the team phase, which the whole e2e server shares, so this runs in its own
// project after the teams test (playwright.config.ts) and switches back at the end.
const PASS = "e2e-host-pass";
const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

async function joinOnPhone(browser: Browser, name: string, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  await context.addCookies([{ name: "gm-dev-status", value: "live", url: baseURL }]);
  const phone = await context.newPage();
  await phone.goto("/holiday-2026?code=WUSH7");
  await phone.getByLabel("Your name").fill(name);
  await phone.getByRole("button", { name: "Join", exact: true }).click();
  await expect(phone.getByRole("navigation", { name: "Party" })).toContainText(name);
  return phone;
}

test("S11-AC1 S11-AC4 S24-AC1 S24-AC2 S24-AC3 S24-AC9 S25-AC1: a Fly-by Count showdown from Controls, on the TV and two captains' phones", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120_000);
  const base = info.project.use.baseURL ?? "http://localhost:3100";
  const first = unique("CapA");
  const names = [first, unique("CapB")];
  const phones = await Promise.all(names.map((n) => joinOnPhone(browser, n, base)));

  await page.goto("/admin");
  await page.getByLabel("Passphrase").fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: /Nova Wushu Holiday Party/ }).click();
  // A retry starts from wherever the last attempt stopped.
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
    await page.getByRole("button", { name: "Make captain" }).click();
    await expect(page.getByRole("list", { name: "Teams" })).toContainText(`Team ${name}`);
  }
  await page.getByRole("button", { name: "Start the team phase" }).click();
  await page.getByRole("button", { name: "Yes, start teams" }).click();
  await expect(page.getByText("Phase: Team")).toBeVisible();

  // Who's played: tap a captain once they've played (S24-AC2).
  const played = page.getByRole("list", { name: `Team ${first} people` });
  await played.getByRole("button", { name: first }).click();
  await expect(played.getByRole("button", { name: first })).toHaveAttribute("aria-pressed", "true");

  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await tv.goto("/holiday-2026/display");
  await expect(tv.getByRole("region", { name: "Join the party" })).toBeVisible();

  // Start: the TV switches to the Showdown screen and plays the demo (S24-AC9, S24-AC4).
  await page.getByLabel("Showdown to start").selectOption({ label: "Fly-by Count" });
  await page.getByRole("button", { name: "Start on the TV" }).click();
  await expect(tv.getByRole("heading", { name: "Fly-by Count" })).toBeVisible();
  await expect(tv.getByText(/Count the presents as they fly past/)).toBeVisible();

  // Phones: the games list says Live now; a captain's phone is the controller (S24-AC3).
  const [capA, capB] = phones;
  if (!capA || !capB) throw new Error("no phones");
  await capA.goto("/holiday-2026");
  await capA.getByRole("link", { name: /Live now/ }).click();
  await expect(capA.getByText("You're the controller")).toBeVisible();
  await capB.goto("/holiday-2026/live");
  await expect(capB.getByText("You're the controller")).toBeVisible();

  // Round 1: the presents fly, then each phone gets the number pad (S25-AC1).
  await page.getByRole("button", { name: "Start round 1" }).click();
  await expect(capA.getByText("Watch the TV and count!")).toBeVisible();
  await expect(capA.getByRole("button", { name: "Lock in" })).toBeVisible({ timeout: 15_000 });
  await capA.getByRole("button", { name: "7", exact: true }).click();
  await capA.getByRole("button", { name: "Lock in 7" }).click();
  await expect(capA.getByText("Locked in: 7")).toBeVisible();
  await expect(tv.getByRole("list", { name: "Locked in" })).toContainText(/In/);

  // Results: the TV reveals the count and every team's answer (S24-AC1).
  await expect(page.getByRole("button", { name: "Show results" })).toBeVisible();
  await page.getByRole("button", { name: "Show results" }).click();
  await expect(tv.getByText(/There were \d+ presents/)).toBeVisible();
  await expect(tv.getByRole("list", { name: "Answers" })).toContainText("7");
  await expect(capA.getByText("Look at the TV!")).toBeVisible();

  await expect(page.getByText("Phase: Team")).toBeVisible();
  // End early, then the host switches the TV back to the leaderboard (S11-AC1, S24-AC9).
  await page.getByRole("button", { name: "End early" }).click();
  await expect(tv.getByRole("heading", { name: "Next showdown coming up" })).toBeVisible();
  await page.getByRole("button", { name: "Leaderboard" }).click();
  await expect(tv.getByRole("region", { name: "Join the party" })).toBeVisible();

  await expect(page.getByText("Phase: Team")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Phase: Team")).toBeVisible();
  await page.getByRole("button", { name: "Back to individual" }).click();
  await page.getByRole("button", { name: "Yes, go back" }).click();
  await expect(page.getByText("Phase: Individual")).toBeVisible();
});
