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

  test("S07-AC2: the admin's Start, End and Reopen are stored", async () => {
    const repo = await seed({});
    await repo.setStatus("holiday-2026", "live");
    expect(await repo.status("holiday-2026")).toBe("live");
    await repo.setStatus("holiday-2026", "ended");
    expect(await repo.status("holiday-2026")).toBe("ended");
    expect(await repo.status("other-party")).toBe("upcoming");
  });

  test("S03-AC1 S03-AC4: the phase and maximum team size the host set are stored", async () => {
    const repo = await seed({});
    expect(await repo.settings("holiday-2026")).toEqual({});
    await repo.setSettings("holiday-2026", { phase: "team" });
    await repo.setSettings("holiday-2026", { maxTeamSize: 6 });
    expect(await repo.settings("holiday-2026")).toEqual({ phase: "team", maxTeamSize: 6 });
    expect(await repo.settings("other-party")).toEqual({});
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
