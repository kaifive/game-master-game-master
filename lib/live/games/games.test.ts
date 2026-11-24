import { describe, expect, it } from "vitest";
import { LATE_MS, type AnyShowdown, type MoveResult } from "../model";
import { ANSWER_MS } from "./answer";
import { blindstop, EXACT_BONUS } from "./blindstop";
import { flyby, FLYBY_ROUNDS, type FlybyState } from "./flyby";
import { lastsecond } from "./lastsecond";
import { rankedPoints } from "./scoring";
import { dealFlakes, SNOW_MAX, SNOW_MIN, snowsum, sum, type SnowState } from "./snowsum";
import { MAX_LAG_MS } from "./stop";

const T0 = 1_000_000;
const teams = ["t1", "t2", "t3", "t4", "t5", "t6"];
const tv = { kind: "tv" } as const;
const cap = (teamId: string) => ({ kind: "captain", teamId }) as const;

function play<S>(game: AnyShowdown, content: unknown, round = 1, seed = 7) {
  const c = game.content.parse(content);
  const state = game.deal(c, { seed, round, teams, startsAt: T0, prev: null }) as S;
  const step = (s: S, teamId: string, move: unknown, now: number) => {
    const r = game.move(s, c, { teamId, move, now }) as MoveResult<S>;
    if (!r.ok) throw new Error(r.message);
    return r.state;
  };
  const refuse = (s: S, teamId: string, move: unknown, now: number) => {
    const r = game.move(s, c, { teamId, move, now }) as MoveResult<S>;
    return r.ok ? "accepted" : r.message;
  };
  return {
    c,
    state,
    step,
    refuse,
    score: (s: S) => game.score(s, c, teams),
    view: (s: S, role: Parameters<AnyShowdown["view"]>[2]["role"], revealed: boolean, now = T0) =>
      game.view(s, c, { role, revealed, now, teams }) as Record<string, unknown>,
    over: (s: S, now: number) => game.over(s, c, now),
  };
}

describe("ranked points (spec 25)", () => {
  it("ranks 100, 70, 50, 30, then 10; ties share a place; no answer scores 0", () => {
    const v: Record<string, number | null> = { t1: 3, t2: 0, t3: 3, t4: 9, t5: 12, t6: null };
    expect(rankedPoints(teams, (t) => v[t] ?? null)).toEqual({
      t2: 100,
      t1: 70,
      t3: 70,
      t4: 30,
      t5: 10,
      t6: 0,
    });
  });
});

describe("Fly-by Count", () => {
  it("S25-AC1: deals rounds from the seed, keeps the count off phones, takes one number in the window, and scores exact 100, one off 50", () => {
    const g = play<FlybyState>(flyby, {});
    expect(flyby.rounds(g.c, 4)).toBe(3);
    const again = play<FlybyState>(flyby, {});
    expect(again.state.cells).toEqual(g.state.cells);
    const r1 = FLYBY_ROUNDS[0];
    expect(g.state.count).toBeGreaterThanOrEqual(r1?.min ?? 0);
    expect(g.state.count).toBeLessThanOrEqual(r1?.max ?? 0);
    expect(g.state.cells).toHaveLength(g.state.count);
    expect(new Set(g.state.cells.map(String)).size).toBe(g.state.count);
    // Phones never get the layout or the count before the reveal; the TV gets the layout.
    expect(g.view(g.state, cap("t1"), false)).toMatchObject({ fly: null, count: null });
    expect(g.view(g.state, tv, false)).toMatchObject({ count: null });
    expect(g.view(g.state, tv, false).fly).not.toBeNull();
    const n = g.state.count;
    const shown = g.state.showEndsAt;
    expect(g.refuse(g.state, "t1", { answer: n }, shown - 1)).toBe("Watch the TV first!");
    let s = g.step(g.state, "t1", { answer: n }, shown + 10);
    s = g.step(s, "t2", { answer: n + 1 }, shown + 20);
    s = g.step(s, "t3", { answer: n - 2 }, shown + 30);
    expect(g.refuse(s, "t1", { answer: 3 }, shown + 40)).toBe("You've locked in.");
    // One sent as the time ran out may land a moment late (LATE_MS); after that, no.
    expect(g.refuse(s, "t4", { answer: 3 }, shown + ANSWER_MS + LATE_MS - 1)).toBe("accepted");
    expect(g.refuse(s, "t4", { answer: 3 }, shown + ANSWER_MS + LATE_MS + 1)).toBe("Time's up.");
    expect(g.refuse(s, "t4", { answer: 100 }, shown + 50)).toMatch(/from 0 to 99/);
    expect(g.refuse(s, "t4", { answer: 2.5 }, shown + 50)).toBe("Type a whole number.");
    // Other teams' answers stay hidden from a phone until the reveal.
    expect(g.view(s, cap("t2"), false)).toMatchObject({ mine: n + 1, answers: null });
    expect(g.score(s)).toMatchObject({ t1: 100, t2: 50, t3: 0, t4: 0 });
    expect(g.view(s, cap("t4"), true)).toMatchObject({ count: n });
    // The round is over once everyone has locked in, or the window closes.
    expect(g.over(s, shown + 100)).toBe(false);
    expect(g.over(s, shown + ANSWER_MS + 1)).toBe(true);
  });

  it("S25-AC1: refuses content whose grid can't hold the presents", () => {
    expect(
      flyby.content.safeParse({ rounds: [{ min: 5, max: 30, ms: 3000, cols: 4, rows: 3 }] })
        .success,
    ).toBe(false);
  });
});

describe("Snow Sum", () => {
  it("S25-AC2: deals harder seeded sums each round in range, takes one total in the window, and scores exact 100, one off 50", () => {
    for (let seed = 1; seed < 300; seed++) {
      const flakes = dealFlakes(seed, 8, ["add", "sub", "double"]);
      let total = 0;
      for (const f of flakes) {
        total = f.op === "add" ? total + f.n : f.op === "sub" ? total - f.n : total * 2;
        expect(total).toBeGreaterThanOrEqual(SNOW_MIN);
        expect(total).toBeLessThanOrEqual(SNOW_MAX);
      }
    }
    const lengths = [1, 2, 3].map((r) => play<SnowState>(snowsum, {}, r).state.flakes.length);
    expect(lengths).toEqual([5, 7, 8]);
    expect(play<SnowState>(snowsum, {}, 1).state.flakes.every((f) => f.op !== "double")).toBe(true);
    const g = play<SnowState>(snowsum, {}, 3, 11);
    expect(g.state.total).toBe(sum(g.state.flakes));
    expect(g.view(g.state, cap("t1"), false)).toMatchObject({ flakes: null, total: null });
    const at = g.state.showEndsAt + 5;
    let s = g.step(g.state, "t1", { answer: g.state.total }, at);
    s = g.step(s, "t2", { answer: g.state.total - 1 }, at);
    s = g.step(s, "t3", { answer: g.state.total + 3 }, at);
    expect(g.score(s)).toMatchObject({ t1: 100, t2: 50, t3: 0, t5: 0 });
    expect(g.refuse(s, "t4", { answer: -51 }, at)).toMatch(/from -50 to 200/);
  });
});

describe("Fly-by Count by kind", () => {
  it("S25-AC3: later rounds mix red, white and green presents and ask about one kind only once they've flown past; never the last round's answer", () => {
    const c = flyby.content.parse({});
    const deal = (round: number, prev: FlybyState | null, seed = 7) =>
      flyby.deal(c, { seed, round, teams, startsAt: T0, prev }) as FlybyState;
    const r1 = deal(1, null);
    expect(r1.ask).toBeNull();
    expect(new Set(r1.cells.map((x) => x[2]))).toEqual(new Set([0]));
    const r3 = deal(3, r1);
    expect(new Set(r3.cells.map((x) => x[2])).size).toBe(3);
    expect(r3.ask).not.toBeNull();
    expect(r3.count).toBe(r3.cells.filter((x) => x[2] === r3.ask).length);
    // Nobody learns which kind until the presents have gone, though all know it's by kind.
    const view = (role: Parameters<typeof flyby.view>[2]["role"], now: number) =>
      flyby.view(r3, c, { role, revealed: false, now, teams }) as Record<string, unknown>;
    expect(view(tv, r3.showEndsAt - 1)).toMatchObject({ byKind: true, ask: null });
    expect(view(cap("t1"), r3.showEndsAt)).toMatchObject({ ask: r3.ask, fly: null, count: null });
    // Never the same answer as the round before, whatever the seed.
    for (let seed = 1; seed <= 200; seed++) {
      const a = deal(1, null, seed);
      expect(deal(2, a, seed).count).not.toBe(a.count);
    }
  });
});

describe("Blind Stop", () => {
  type S = { startsAt: number; stops: Record<string, number> };
  it("S25-AC4: shows the clock for 3 s, takes phone-timed stops checked against the server, and ranks by closeness to 10.00 with a 50 bonus for exact", () => {
    const g = play<S>(blindstop, {});
    expect(g.view(g.state, tv, false)).toMatchObject({
      showMs: 3000,
      targetMs: 10_000,
      stops: null,
    });
    const stopAt = (ms: number) => ({ elapsedMs: ms });
    let s = g.step(g.state, "t1", stopAt(10_004), T0 + 10_100);
    s = g.step(s, "t2", stopAt(9_900), T0 + 10_000);
    s = g.step(s, "t3", stopAt(10_300), T0 + 10_400);
    s = g.step(s, "t4", stopAt(12_000), T0 + 12_050);
    // A stop can't claim a time after it arrived, or one long gone.
    expect(g.refuse(s, "t5", stopAt(11_000), T0 + 10_000)).toMatch(/didn't add up/);
    expect(g.refuse(s, "t5", stopAt(5_000), T0 + 10_000)).toMatch(/didn't add up/);
    expect(g.refuse(s, "t5", stopAt(25_000), T0 + 25_000)).toBe("Time's up.");
    expect(g.refuse(s, "t1", stopAt(10_000), T0 + 10_100)).toBe("You've stopped.");
    expect(g.view(s, cap("t2"), false)).toMatchObject({ stopped: true, stops: null });
    // 10.004 shows as 10.00: exact, so top place and the bonus.
    expect(g.score(s)).toEqual({
      t1: 100 + EXACT_BONUS,
      t2: 70,
      t3: 50,
      t4: 30,
      t5: 0,
      t6: 0,
    });
    expect(g.over(s, T0 + 19_000)).toBe(false);
    expect(g.over(s, T0 + 20_001)).toBe(true);
  });
});

describe("Last Second", () => {
  type S = { startsAt: number; stops: Record<string, number> };
  it("S25-AC5: runs a visible countdown, busts teams that didn't stop before zero, and ranks the rest by how late they stopped", () => {
    const g = play<S>(lastsecond, {});
    expect(lastsecond.rounds(g.c, 3)).toBe(3);
    let s = g.step(g.state, "t1", { elapsedMs: 9_800 }, T0 + 9_850);
    s = g.step(s, "t2", { elapsedMs: 9_950 }, T0 + 9_990);
    s = g.step(s, "t3", { elapsedMs: 9_950 }, T0 + 9_995);
    s = g.step(s, "t4", { elapsedMs: 4_000 }, T0 + 4_100);
    expect(g.refuse(s, "t5", { elapsedMs: 10_000 }, T0 + 10_050)).toBe("Time's up.");
    expect(g.view(s, cap("t1"), false)).toMatchObject({ mine: 9_800, stops: null });
    expect(g.view(s, tv, false)).toMatchObject({ mine: null, stops: null });
    expect(g.score(s)).toEqual({ t2: 100, t3: 100, t1: 50, t4: 30, t5: 0, t6: 0 });
    // A stop made just before zero may still be on its way.
    expect(g.over(s, T0 + 10_000 + MAX_LAG_MS - 1)).toBe(false);
    expect(g.over(s, T0 + 10_000 + MAX_LAG_MS + 1)).toBe(true);
  });
});

describe("Snow Sum dealing", () => {
  it("S25-AC2: never takes away from 0 or less, so totals stay friendly", () => {
    for (let seed = 1; seed < 300; seed++) {
      let total = 0;
      for (const f of dealFlakes(seed, 8, ["add", "sub", "double"])) {
        if (total <= 0) expect(f.op).toBe("add");
        total = f.op === "add" ? total + f.n : f.op === "sub" ? total - f.n : total * 2;
      }
    }
  });
});

describe("every showdown's intro (blind review)", () => {
  it("S24-AC4: every showdown has a one-line how-to-play and says what happens if a team runs out of time", async () => {
    const { showdownFor, showdownTypes } = await import("../registry");
    for (const type of showdownTypes()) {
      const game = showdownFor(type);
      expect(game?.demo.length).toBeGreaterThan(20);
      expect(game?.timeout).toMatch(/^Out of time\?/);
    }
  });
});
