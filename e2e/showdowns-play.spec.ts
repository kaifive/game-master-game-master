import { expect, test, type Page } from "@playwright/test";
import { layoutProblems, watchErrors } from "./support/layout";
import { joinOnPhone, slowNetwork, teamPhaseWithCaptains, unique } from "./support/party";

/**
 * Every showdown played start to finish on a real TV and two captains'
 * phones, polling over a slow network (Khai, 2026-11-24: the TV crashed on
 * games no test had played end to end). The host steps through with Next; the
 * phones tap whatever their controller offers. It fails on any page error, on
 * a step that never comes, or on a screen that's cut off or overlapping.
 *
 * SMOKE_ROUNDS caps the rounds played per game (CI plays 2); unset plays all.
 */
const LAG_MS = 250;
const LIVE = "/api/admin/events/holiday-2026/live";
const CAP = Number(process.env.SMOKE_ROUNDS ?? (process.env.CI ? 2 : 99));
/** Longest a round may wait for teams before the host shows results anyway. */
const PLAY_CAP_MS = 25_000;

type Step = "intro" | "play" | "results" | "final";
type View = {
  active: boolean;
  session?: { step: Step; round: number; rounds: number; gameId: string; type: string };
  games: { id: string; title: string; type: string; blocked: string | null }[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A seeded random, so a failing run can be replayed. */
function random(seed: number) {
  let s = seed;
  return () => (s = (s * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648;
}

/** A captain taps something its controller offers: a button, or the staff or ribbon. */
async function poke(phone: Page, rnd: () => number) {
  const buttons = phone.locator("main button:enabled");
  const n = await buttons.count().catch(() => 0);
  if (n > 0)
    await buttons
      .nth(Math.floor(rnd() * n))
      .click({ timeout: 800 })
      .catch(() => undefined);
  const slider = phone.locator("main [role=slider]").first();
  if (await slider.isVisible().catch(() => false)) {
    await slider.click({ timeout: 800 }).catch(() => undefined);
    await slider.press(rnd() < 0.5 ? "ArrowLeft" : "ArrowRight").catch(() => undefined);
  }
}

test("S24-AC8 S11-AC2 S11-AC5: every showdown plays through on the TV and two phones over a slow network, with no errors or broken layouts", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(30 * 60_000);
  const base = info.project.use.baseURL ?? "http://localhost:3100";
  const names = [unique("PlayA"), unique("PlayB")];
  const phones = await Promise.all(names.map((n) => joinOnPhone(browser, n, base, LAG_MS)));
  await teamPhaseWithCaptains(page, names);

  const tvContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await slowNetwork(tvContext, LAG_MS);
  const tv = await tvContext.newPage();
  await tv.goto("/holiday-2026/display");
  // The TV shows the showdown screen from the first start.
  const screens: [string, Page][] = [
    ["tv", tv],
    ["phone A", phones[0] as Page],
    ["phone B", phones[1] as Page],
  ];
  const errors = screens.map(([, p]) => watchErrors(p));

  const view = async (): Promise<View> => {
    const res = await page.request.get(LIVE);
    const json = (await res.json()) as View | { data: View };
    return "data" in json ? json.data : json;
  };
  const act = async (body: unknown) => {
    const res = await page.request.post(LIVE, { data: body });
    return res.ok();
  };

  const problems: string[] = [];
  const look = async (where: string) => {
    await sleep(700);
    for (const [name, p] of screens)
      for (const issue of await layoutProblems(p).catch(() => []))
        problems.push(`${where} on ${name}: ${issue}`);
    screens.forEach(([name], i) => {
      for (const e of errors[i]?.splice(0) ?? []) problems.push(`${where} on ${name}: ${e}`);
    });
  };

  const games = (await view()).games.filter((g) => g.blocked === null);
  expect(games.length).toBeGreaterThan(5);
  const rnd = random(7);
  for (const g of games) {
    expect(await act({ action: "start", gameId: g.id }), `start ${g.title}`).toBe(true);
    await look(`${g.title} intro`);
    let playSince = 0;
    let lastStep = "";
    const deadline = Date.now() + 6 * 60_000;
    for (;;) {
      if (Date.now() > deadline) {
        problems.push(`${g.title}: never finished`);
        await act({ action: "end" });
        break;
      }
      const v = await view();
      if (!v.active || !v.session) break;
      const { step, round } = v.session;
      const where = `${g.title} round ${String(round)} ${step}`;
      if (`${step}${String(round)}` !== lastStep) {
        lastStep = `${step}${String(round)}`;
        playSince = Date.now();
        if (step !== "play") await look(where);
        // The TV catches up with the round's results within a few polls.
        if (step === "results") {
          const shown = g.type === "snatch" ? "Points so far" : "This showdown";
          const ok = await tv
            .getByText(shown)
            .first()
            .waitFor({ timeout: 5000 })
            .then(() => true)
            .catch(() => false);
          if (!ok) problems.push(`${where}: the TV didn't show the results`);
        }
      }
      if (step === "intro") await act({ action: "next" });
      else if (step === "results") {
        if (round >= Math.min(CAP, v.session.rounds)) {
          await act({ action: "end" });
          break;
        }
        await act({ action: "next" });
      } else if (step === "final") {
        await look(`${g.title} final`);
        await act({ action: "next" });
      } else {
        // Play: the host opens buzzers when the game has its own steps; the phones tap away.
        if (g.type === "buzzer") await act({ action: "host", act: "open" });
        await Promise.all(phones.map((p) => poke(p, rnd)));
        if (Date.now() - playSince > 6000 && Date.now() - playSince < 6800)
          await look(`${where} (mid-play)`);
        if (
          Date.now() - playSince > PLAY_CAP_MS ||
          (g.type === "buzzer" && Date.now() - playSince > 5000)
        ) {
          if (g.type === "buzzer" && round >= Math.min(CAP, v.session.rounds)) {
            await act({ action: "end" });
            break;
          }
          await act({ action: "next" });
        }
      }
      await sleep(400);
    }
    await look(`${g.title} after`);
  }
  // Back to the individual phase for any test after this one.
  await page.reload();
  if (await page.getByRole("button", { name: "Back to individual" }).isVisible()) {
    await page.getByRole("button", { name: "Back to individual" }).click();
    await page.getByRole("button", { name: "Yes, go back" }).click();
  }
  expect(problems).toEqual([]);
});
