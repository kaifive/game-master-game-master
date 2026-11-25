import { expect, test, type Browser, type Page } from "@playwright/test";
import { layoutProblems, watchErrors } from "./support/layout";
import { PASS, unique } from "./support/party";

/**
 * Spec 32 end to end: the host uploads the RSVP list; a helper checks a family
 * in and adds a walk-in on a phone with the party code; the TV runs the raffle
 * with space, Claimed and Not here. Its own project (playwright.config.ts):
 * it changes what the shared TV shows.
 */

async function signIn(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Passphrase").fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: /Nova Wushu Holiday Party/ }).click();
}

async function tvSignedIn(browser: Browser, width = 1920, height = 1080) {
  const tv = await (await browser.newContext({ viewport: { width, height } })).newPage();
  await tv.goto("/admin");
  await tv.getByLabel("Passphrase").fill(PASS);
  await tv.getByRole("button", { name: "Sign in" }).click();
  await expect(tv.getByRole("link", { name: /Nova Wushu Holiday Party/ })).toBeVisible();
  await tv.goto("/holiday-2026/display");
  return tv;
}

test("S32-AC1 S32-AC2 S32-AC3 S32-AC4 S32-AC9 S32-AC10 S32-AC12 S32-AC14: upload, check in at the door, and run two raffles on the TV", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const problems: string[] = [];
  const look = async (p: Page, where: string) => {
    for (const x of await layoutProblems(p)) problems.push(`${where}: ${x}`);
  };
  const family = unique("Fam");

  // Controls: upload the list (S32-AC1, AC2).
  await signIn(page);
  const csv = `Family,Name\n${family},Ana\n${family},Ben\n${family},Cam\n`;
  await page.getByLabel(/Upload the RSVP list/).setInputFiles({
    name: "rsvp.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(/Added 3, already there \d+/)).toBeVisible();
  await look(page, "controls guests");

  // A helper's phone: the party code opens check-in (S32-AC3, AC4).
  const phone = await (
    await browser.newContext({ viewport: { width: 375, height: 760 } })
  ).newPage();
  const errors = watchErrors(phone);
  await phone.goto("/holiday-2026/checkin");
  await phone.getByLabel(/Check-in code/).fill("wush7");
  await phone.getByRole("button", { name: "Open check-in" }).click();
  await phone.getByRole("searchbox").fill(family);
  const group = phone.getByRole("list", { name: family }).locator("..");
  await group.getByRole("button", { name: "Check in all" }).click();
  await expect(group.getByRole("button", { name: "All here" })).toBeVisible();
  await phone.getByRole("checkbox", { name: /Cam/ }).click();
  await expect(phone.getByRole("checkbox", { name: /Cam/ })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  const walkIn = unique("Walk");
  const add = phone.getByRole("form", { name: "Add someone" });
  await add.getByLabel("Name").fill(walkIn);
  await add.getByLabel("Family (optional)").fill(family);
  await add.getByRole("button", { name: "Add" }).click();
  await expect(phone.getByRole("checkbox", { name: new RegExp(walkIn) })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await phone.getByRole("searchbox").fill("");
  await look(phone, "check-in 375");
  for (const e of errors.splice(0)) problems.push(`check-in: ${e}`);

  // The TV, signed in: space starts and stops; Claimed and Not here are buttons (S32-AC9, AC10, AC12).
  const tv = await tvSignedIn(browser);
  const bar = tv.getByRole("navigation", { name: "Host controls" });
  await bar.getByRole("button", { name: "Raffle" }).click();
  await expect(tv.getByText("Get ready…")).toBeVisible();
  await look(tv, "raffle idle 1920");
  const ticketsBefore = Number(
    (
      (await tv
        .getByText(/ tickets?$/)
        .first()
        .textContent()) ?? ""
    ).match(/(\d+) ticket/)?.[1],
  );
  await tv.keyboard.press("Space");
  await expect(bar.getByRole("button", { name: "Stop" })).toBeVisible();
  await tv.keyboard.press("Space");
  await expect(tv.getByText("Winner!")).toBeVisible({ timeout: 10_000 });
  await look(tv, "raffle landed 1920");
  // Not here: the names flip again at once for the same prize.
  await bar.getByRole("button", { name: "Not here" }).click();
  await expect(bar.getByRole("button", { name: "Stop" })).toBeVisible();
  await tv.mouse.click(960, 600);
  await expect(tv.getByText("Winner!")).toBeVisible({ timeout: 10_000 });
  await bar.getByRole("button", { name: "Claimed" }).click();
  await expect(tv.getByText("Get ready…")).toBeVisible();
  // One ticket used up.
  await expect(tv.getByText(new RegExp(`· ${String(ticketsBefore - 1)} tickets?$`))).toBeVisible();

  // The raffle screen on a smaller TV too (S32-AC14).
  const small = await tvSignedIn(browser, 1280, 720);
  await expect(small.getByText("Get ready…")).toBeVisible();
  await look(small, "raffle idle 1280");
  await small.context().close();

  // Back to the leaderboard for the tests after this one.
  await bar.getByRole("button", { name: "Leaderboard" }).click();
  await expect(tv.getByRole("region", { name: "Join the party" })).toBeVisible();
  await tv.context().close();
  await phone.context().close();
  expect(problems).toEqual([]);
});
