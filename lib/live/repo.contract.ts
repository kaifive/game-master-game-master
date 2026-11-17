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
  up: {},
  upTurn: null,
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
    expect(await repo.read(SLUG)).toEqual({ session: null, rotation: {} });
    await repo.update(SLUG, () => ({ session: session(1), rotation: { t1: ["p1"] } }));
    expect(await repo.read(SLUG)).toEqual({ session: session(1), rotation: { t1: ["p1"] } });
    await repo.clear(SLUG);
    expect(await repo.read(SLUG)).toEqual({ session: null, rotation: {} });
  });

  test("S11-AC8: an update sees the latest state, and returning null leaves it", async () => {
    const repo = await make();
    await repo.update(SLUG, () => ({ session: session(1), rotation: {} }));
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
