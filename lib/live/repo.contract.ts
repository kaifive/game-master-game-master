import { expect, test } from "vitest";
import type { Session } from "./model";
import type { LiveRepo } from "./repo";

const SLUG = "holiday-2026";

const session = (revision: number): Session => ({
  id: "s1",
  gameId: "g",
  type: "tap",
  title: "Tap",
  step: "intro",
  round: 0,
  rounds: 1,
  seed: 1,
  teams: [],
  state: null,
  scores: {},
  roundPoints: null,
  captainDevices: {},
  revision,
  startedAt: 0,
});

/** The same behavior from every LiveRepo (S11-AC8). */
export function liveRepoContract(make: () => Promise<LiveRepo>) {
  test("S11-AC8: starts empty, stores the session and rotation, and clears", async () => {
    const repo = await make();
    const empty = { session: null, played: {}, screen: "leaderboard", finished: [], raffle: null };
    expect(await repo.read(SLUG)).toEqual(empty);
    const stored = {
      session: session(1),
      played: { t1: { added: [{ id: "x1", name: "Grandma" }], played: ["p1"] } },
      screen: "showdown" as const,
      finished: ["fly"],
      raffle: null,
    };
    await repo.update(SLUG, () => stored);
    expect(await repo.read(SLUG)).toEqual(stored);
    await repo.clear(SLUG);
    expect(await repo.read(SLUG)).toEqual(empty);
  });

  test("S11-AC8: an update sees the latest state, and returning null leaves it", async () => {
    const repo = await make();
    await repo.update(SLUG, () => ({
      session: session(1),
      played: {},
      screen: "leaderboard",
      finished: [],
      raffle: null,
    }));
    const after = await repo.update(SLUG, (cur) =>
      cur.session
        ? { ...cur, session: { ...cur.session, revision: cur.session.revision + 1 } }
        : null,
    );
    expect(after.session?.revision).toBe(2);
    const kept = await repo.update(SLUG, () => null);
    expect(kept.session?.revision).toBe(2);
    // Updates in a row each see the one before.
    await Promise.all(
      [1, 2, 3].map(() =>
        repo.update(SLUG, (cur) =>
          cur.session
            ? { ...cur, session: { ...cur.session, revision: cur.session.revision + 1 } }
            : null,
        ),
      ),
    );
    expect((await repo.read(SLUG)).session?.revision).toBe(5);
  });
}
