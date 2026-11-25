import { expect, test } from "@playwright/test";
import { layoutProblems, watchErrors } from "./support/layout";
import { PASS, unique } from "./support/party";

/**
 * The party's own pages, as a phone, the TV and Controls see them: joining,
 * the hub, the leaderboard, the team tab, the TV display, and Controls. No
 * page errors, nothing cut off or off screen, no text over text (Khai,
 * 2026-11-25).
 */
test("S02-AC1 S05-AC1: the join page, hub, leaderboard and team tab lay out cleanly on phones", async ({
  browser,
}, info) => {
  test.skip(info.project.name !== "phone", "Phone pages");
  const problems: string[] = [];
  for (const width of [320, 375, 412]) {
    // A fresh phone each size: joining is remembered on the device.
    const page = await (await browser.newContext({ viewport: { width, height: 700 } })).newPage();
    const errors = watchErrors(page);
    const look = async (where: string) => {
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
      for (const p of await layoutProblems(page)) problems.push(`${where}: ${p}`);
      for (const e of errors.splice(0)) problems.push(`${where}: ${e}`);
    };
    await page.goto("/holiday-2026?code=WUSH7");
    await look(`${String(width)} join`);
    await page.getByLabel("Your name").fill(unique("Pg"));
    await page.getByRole("button", { name: "Join", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Party" })).toBeVisible();
    await look(`${String(width)} hub`);
    await page.goto("/holiday-2026/leaderboard");
    await look(`${String(width)} leaderboard`);
    await page.goto("/holiday-2026/team");
    await look(`${String(width)} team`);
    await page.goto("/holiday-2026/live");
    await look(`${String(width)} live`);
    await page.goto("/holiday-2026");
    await page.getByRole("button", { name: /You/ }).click();
    await look(`${String(width)} you sheet`);
    await page.context().close();
  }
  expect(problems).toEqual([]);
});

test("S05-AC2 S06-AC1: the TV display and Controls lay out cleanly", async ({ page }, info) => {
  test.skip(info.project.name !== "tv" && info.project.name !== "tablet", "TV and Controls");
  const errors = watchErrors(page);
  const problems: string[] = [];
  const look = async (where: string) => {
    await page.waitForLoadState("networkidle");
    for (const p of await layoutProblems(page)) problems.push(`${where}: ${p}`);
    for (const e of errors.splice(0)) problems.push(`${where}: ${e}`);
  };
  if (info.project.name === "tv") {
    await page.goto("/holiday-2026/display");
    await look("display");
    const down = await page.evaluate(
      () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
    );
    if (down > 1) problems.push(`display scrolls down by ${String(down)}px`);
  } else {
    await page.goto("/admin");
    await look("admin sign in");
    await page.getByLabel("Passphrase").fill(PASS);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("link", { name: /Nova Wushu Holiday Party/ }).click();
    await look("controls");
    await page.goto("/admin");
    await look("admin home");
  }
  expect(problems).toEqual([]);
});
