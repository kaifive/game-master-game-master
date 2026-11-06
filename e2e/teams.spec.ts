import { expect, test, type Browser, type Page } from "@playwright/test";

// The team phase is shared by every test on the e2e server, so this runs in its
// own project after the others (playwright.config.ts) and switches back at the end.
const PASS = "e2e-host-pass";
const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

// Phones see the party as live (the memory backend's test cookie), so team games open.
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

test("S03-AC1 S03-AC2 S03-AC3 S03-AC5 S03-AC6 S03-AC8: teams from captain to TV", async ({
  page,
  browser,
}, info) => {
  const captain = unique("Cap");
  const player = unique("Mem");
  const team = unique("Snow");
  const base = info.project.use.baseURL ?? "http://localhost:3100";
  const cap = await joinOnPhone(browser, captain, base);
  const mem = await joinOnPhone(browser, player, base);

  await page.goto("/admin");
  await page.getByLabel("Passphrase").fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: /Nova Wushu Holiday Party/ }).click();
  // A retry starts from wherever the last attempt stopped.
  if (await page.getByRole("button", { name: "Back to individual" }).isVisible()) {
    await page.getByRole("button", { name: "Back to individual" }).click();
    await page.getByRole("button", { name: "Yes, go back" }).click();
    await expect(page.getByText("Phase: Individual")).toBeVisible();
  }
  await page.getByPlaceholder("Find a player").fill(captain);
  await page.getByRole("button", { name: new RegExp(captain) }).click();
  await page.getByRole("button", { name: "Make captain" }).click();
  await expect(page.getByRole("list", { name: "Teams" })).toContainText(`Team ${captain}`);

  await cap.reload();
  await cap.getByLabel(/Name your team/).fill(team);
  await cap.getByRole("button", { name: "Name the team" }).click();
  await expect(cap.getByText(`You're on ${team}`)).toBeVisible();

  await page.getByRole("button", { name: "Start the team phase" }).click();
  await page.getByRole("button", { name: "Yes, start teams" }).click();
  await expect(page.getByText("Phase: Team")).toBeVisible();

  await mem.reload();
  await mem.getByRole("button", { name: `Join ${team}` }).click();
  await mem
    .getByRole("alertdialog")
    .getByRole("button", { name: `Join ${team}` })
    .click();
  await expect(mem.getByText(`You're on ${team}`)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("list", { name: "Teams" })).toContainText(player);

  // A member gives the team some of the points the host gave them (S03-AC6).
  await page.getByPlaceholder("Find a player").fill(player);
  await page.getByRole("button", { name: new RegExp(player) }).click();
  await page.getByLabel("Points to add (negative to take away)").fill("40");
  await page.getByRole("button", { name: "Change points" }).click();
  await expect(page.getByRole("list", { name: "Players" })).toContainText("40");
  await mem.reload();
  await mem.getByLabel("Points to give").fill("15");
  await mem.getByRole("button", { name: "Give points" }).click();
  await mem.getByRole("button", { name: "Yes, give 15" }).click();
  await expect(mem.getByText(`You gave 15 to ${team}.`)).toBeVisible();

  // Members can't play the team game; the captain plays it, and it never pays the captain (S03-AC5).
  await mem.reload();
  await expect(mem.getByRole("list", { name: "Tonight's games" })).toContainText("Captain plays");
  await cap.goto("/holiday-2026/play/team-trivia");
  await cap
    .getByRole("dialog", { name: "How to play" })
    .getByRole("button", { name: "Start" })
    .click();
  for (let n = 1; n <= 5; n++) {
    await expect(cap.getByText(`Question ${String(n)} of 5`)).toBeVisible();
    await cap.getByRole("list", { name: "Answers" }).getByRole("button").first().click();
    await expect(cap.getByRole("status")).toHaveText(/Right!|Not quite\./);
  }
  await expect(cap.getByRole("region", { name: "Your score" })).toContainText(/of 5 right/);
  await expect(cap.locator("[data-total-score]")).toHaveAttribute("aria-label", /: 0 points$/);

  // Team standings on the phone and the TV (S03-AC8).
  await expect(mem.getByRole("list", { name: "Team standings" })).toContainText(team);
  const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await tv.goto("/holiday-2026/display");
  await expect(tv.getByRole("list", { name: "Team standings" })).toContainText(team);

  await page.reload();
  await page.getByRole("button", { name: "Back to individual" }).click();
  await page.getByRole("button", { name: "Yes, go back" }).click();
  await expect(page.getByText("Phase: Individual")).toBeVisible();
});
