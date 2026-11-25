import { expect, test } from "@playwright/test";
import { layoutProblems, watchErrors } from "./support/layout";

/**
 * Every showdown at every moment, on the TV (2 and 6 teams) and on two
 * captains' phones, from the dev gallery: no errors, nothing cut off or off
 * screen, no text over text, and the TV never scrolls (Khai, 2026-11-24: QA
 * found clipped presents and an overlapping demo that no test drew).
 */
const GAMES = [
  "flyby",
  "snowsum",
  "blindstop",
  "lastsecond",
  "auction",
  "stockings",
  "snatch",
  "path",
  "shuffle",
  "to21",
  "buzzer",
  "staffangle",
  "ribbon",
];
const MOMENTS = ["intro", "ready", "show", "answer", "results", "final"];

for (const game of GAMES)
  test(`S24-AC9: ${game} lays out cleanly at every moment on the TV and phones`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    const tv = info.project.name === "tv";
    const errors = watchErrors(page);
    const problems: string[] = [];
    const views = tv
      ? ["on=tv&teams=2", "on=tv&teams=6"]
      : ["on=phone&teams=3&as=t1", "on=phone&teams=3&as=t2"];
    // The turn games' later rounds have longer paths and more presents.
    const rounds = ["path", "shuffle", "to21"].includes(game) ? [1, 3] : [1];
    for (const view of views)
      for (const round of rounds)
        for (const moment of MOMENTS) {
          await page.goto(
            `/dev/ui/showdowns?game=${game}&moment=${moment}&${view}&round=${String(round)}`,
          );
          await page.waitForLoadState("networkidle");
          const where = `${moment} ${view} round ${String(round)}`;
          for (const p of await layoutProblems(page)) problems.push(`${where}: ${p}`);
          if (tv) {
            const down = await page.evaluate(
              () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
            );
            if (down > 1) problems.push(`${where}: TV scrolls down by ${String(down)}px`);
          }
          for (const e of errors.splice(0)) problems.push(`${where}: ${e}`);
        }
    expect(problems).toEqual([]);
  });
