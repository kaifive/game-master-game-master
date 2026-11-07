import { describe, expect, it } from "vitest";
import { recall, RecallContent } from "./logic";

const c = RecallContent.parse({});
const at = { now: 0 };

describe("Rapid Recall", () => {
  it("S16-AC6: three growing rounds from the seed, an equal share per square found", () => {
    const s = recall.create(c, 7, at);
    expect(s.rounds.map((r) => [r.size, r.lit.length])).toEqual([
      [3, 3],
      [4, 5],
      [5, 7],
    ]);
    expect(recall.create(c, 7, at)).toEqual(s);
    expect(recall.create(c, 8, at).rounds).not.toEqual(s.rounds);
    let state = s;
    const view = recall.view(state, c, at);
    expect(view).toMatchObject({ kind: "round", number: 1, size: 3, showMs: 1500 });
    // Round 1: all right. Round 2: 3 of 5. Round 3: wrong count is refused, then none right.
    const round1 = recall.move(state, c, { type: "pick", round: 1, cells: s.rounds[0]?.lit }, at);
    if (!round1.ok) throw new Error(round1.message);
    state = round1.state;
    const lit2 = s.rounds[1]?.lit ?? [];
    const dark2 = Array.from({ length: 16 }, (_, i) => i).filter((i) => !lit2.includes(i));
    const round2 = recall.move(
      state,
      c,
      { type: "pick", round: 2, cells: [...lit2.slice(0, 3), ...dark2.slice(0, 2)] },
      at,
    );
    if (!round2.ok) throw new Error(round2.message);
    state = round2.state;
    expect(recall.move(state, c, { type: "pick", round: 3, cells: [0] }, at).ok).toBe(false);
    expect(recall.move(state, c, { type: "pick", round: 2, cells: [] }, at).ok).toBe(false);
    const dark3 = Array.from({ length: 25 }, (_, i) => i).filter(
      (i) => !(s.rounds[2]?.lit ?? []).includes(i),
    );
    const round3 = recall.move(state, c, { type: "pick", round: 3, cells: dark3.slice(0, 7) }, at);
    if (!round3.ok) throw new Error(round3.message);
    expect(recall.isOver(round3.state)).toBe(true);
    expect(recall.view(round3.state, c, at)).toMatchObject({ kind: "done", found: 6, total: 15 });
    expect(recall.score(round3.state, 100)).toBe(40);
  });
});
