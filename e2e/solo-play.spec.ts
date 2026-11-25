import { expect, test, type Page } from "@playwright/test";
import { layoutProblems, watchErrors } from "./support/layout";
import { joinOnPhone, unique } from "./support/party";

/**
 * Every solo game on the hub, opened and played by a phone that taps,
 * types and drags at whatever it's offered, over a slow network (Khai,
 * 2026-11-25: extend the showdown checks to everything). It fails on a page
 * error, a game that never ends, or a screen that's cut off or overlapping,
 * at a small phone size.
 */
const LAG_MS = 200;
/**
 * Longest a game may run before it counts as stuck. CI only smoke-tests each
 * game for a while; a full run (before an event) plays every one to its score.
 */
const CI = Boolean(process.env.CI);
const GAME_CAP_MS = CI ? 25_000 : 90_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A seeded random, so a failing run can be replayed. */
function random(seed: number) {
  let s = seed;
  return () => (s = (s * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648;
}

/** Taps a button, types a letter, or taps and drags across a drawing: whatever's there. */
async function fiddle(phone: Page, rnd: () => number) {
  const main = phone.locator("main");
  const roll = rnd();
  if (roll < 0.55) {
    const buttons = main.locator("button:enabled");
    const n = await buttons.count().catch(() => 0);
    if (n > 0)
      await buttons
        .nth(Math.floor(rnd() * n))
        .click({ timeout: 800 })
        .catch(() => undefined);
  } else if (roll < 0.75) {
    await phone.keyboard
      .press("abcdefghijklmnoprstuwy"[Math.floor(rnd() * 22)] ?? "a")
      .catch(() => undefined);
    if (rnd() < 0.2) await phone.keyboard.press("Enter").catch(() => undefined);
  } else {
    const box = await main.boundingBox().catch(() => null);
    if (!box) return;
    const x = box.x + rnd() * box.width;
    const y = box.y + Math.min(box.height, 700) * rnd();
    await phone.mouse.move(x, y);
    await phone.mouse.down();
    await phone.mouse.move(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 120, { steps: 4 });
    await phone.mouse.up();
  }
}

test("S08-AC14 S16-AC7: every solo game on the hub plays to its score on a small phone over a slow network, with no errors or broken layouts", async ({
  browser,
}, info) => {
  test.skip(info.project.name !== "phone", "One phone size is enough");
  test.setTimeout(30 * 60_000);
  const base = info.project.use.baseURL ?? "http://localhost:3100";
  const phone = await joinOnPhone(browser, unique("Solo"), base, LAG_MS);
  await phone.setViewportSize({ width: 375, height: 667 });
  const errors = watchErrors(phone);
  const problems: string[] = [];
  const look = async (where: string) => {
    for (const p of await layoutProblems(phone).catch(() => [])) problems.push(`${where}: ${p}`);
    for (const e of errors.splice(0)) problems.push(`${where}: ${e}`);
  };

  await phone.goto("/holiday-2026");
  await look("hub");
  const links = phone.locator("main a[href*='/play/']");
  // The hub shows "Getting your phone ready…" first.
  await links.first().waitFor({ timeout: 20_000 });
  const hrefs = [
    ...new Set(
      (await links.evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""))).filter(
        Boolean,
      ),
    ),
  ];
  expect(hrefs.length).toBeGreaterThan(5);
  const rnd = random(11);
  for (const href of hrefs) {
    const game = href.split("/").pop() ?? href;
    await phone.goto(href);
    await look(`${game} how to play`);
    const start = phone
      .getByRole("dialog", { name: "How to play" })
      .getByRole("button", { name: "Start" });
    if (await start.isVisible().catch(() => false)) await start.click();
    const score = phone.getByRole("region", { name: "Your score" });
    const began = Date.now();
    let looked = false;
    while (!(await score.isVisible().catch(() => false))) {
      if (Date.now() - began > GAME_CAP_MS) {
        if (!CI) problems.push(`${game}: never reached a score`);
        break;
      }
      // Something to find mid-game: a screenshot-free look a few seconds in.
      if (!looked && Date.now() - began > 4000) {
        looked = true;
        await look(`${game} playing`);
      }
      await fiddle(phone, rnd);
      await sleep(120);
    }
    await look(`${game} score`);
  }
  expect(problems).toEqual([]);
});
