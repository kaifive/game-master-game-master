import { expect, test } from "vitest";
import type { EventRuntimeRepo } from "./repo";

type Seed = (data: {
  status?: Record<string, string>;
  leaderboard?: Record<string, unknown>;
}) => Promise<EventRuntimeRepo>;

/** The same behavior from every EventRuntimeRepo (ADR-016). */
export function eventRuntimeContract(seed: Seed) {
  test("an event with nothing stored is upcoming", async () => {
    const repo = await seed({});
    expect(await repo.status("holiday-2026")).toBe("upcoming");
  });

  test("returns the status the admin set", async () => {
    const repo = await seed({ status: { "holiday-2026": "ended" } });
    expect(await repo.status("holiday-2026")).toBe("ended");
  });

  test("returns final standings, highest first, or null when there are none", async () => {
    const repo = await seed({
      leaderboard: {
        "holiday-2026": {
          teams: {
            t1: { name: "Team Dragon", color: 1, points: 1840 },
            t2: { name: "Team Crane", color: 2, points: 2010 },
          },
          players: { p1: { nickname: "Mai", teamId: "t2", points: 540 } },
        },
      },
    });
    const s = await repo.finalStandings("holiday-2026");
    expect(s?.teams.map((t) => t.name)).toEqual(["Team Crane", "Team Dragon"]);
    expect(s?.players[0]).toMatchObject({ name: "Mai", points: 540 });
    expect(await repo.finalStandings("other-party")).toBeNull();
  });
}
