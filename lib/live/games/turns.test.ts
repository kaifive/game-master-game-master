import { describe, expect, it } from "vitest";
import { lapRounds, leadCounts } from "../fairness";
import type { AnyShowdown, MoveResult, Role } from "../model";
import { PLAYTEST_TEAM_COUNTS, playtest, type Bot, type BotContext } from "../playtest";
import { dealPath, path, type PathState, type Square } from "./path";
import { afterSwaps, shuffle, type ShuffleState } from "./shuffle";
import { to21, type To21State } from "./to21";

const T0 = 1_000_000;
const teams = ["t1", "t2", "t3"];
const cap = (teamId: string): Role => ({ kind: "captain", teamId });
const tv: Role = { kind: "tv" };

function rig<S>(game: AnyShowdown, content: unknown = {}) {
  const c = game.content.parse(content);
  const deal = (round = 1, seed = 5, ts = teams) =>
    game.deal(c, { seed, round, teams: ts, startsAt: T0, prev: null }) as S;
  const move = (s: S, teamId: string, mv: unknown, now: number) =>
    game.move(s, c, { teamId, move: mv, now }) as MoveResult<S>;
  const step = (s: S, teamId: string, mv: unknown, now: number) => {
    const r = move(s, teamId, mv, now);
    if (!r.ok) throw new Error(r.message);
    return r.state;
  };
  return {
    c,
    deal,
    move,
    step,
    tick: (s: S, now: number) => game.tick(s, c, now) as S,
    score: (s: S, ts = teams) => game.score(s, c, ts),
    view: (s: S, role: Role, now: number, revealed = false) =>
      game.view(s, c, { role, revealed, now, teams }) as Record<string, unknown>,
    over: (s: S, now: number) => game.over(s, c, now),
    turn: (s: S, now: number) => game.turn?.(s, c, now) ?? null,
  };
}

describe("Snowball to 21", () => {
  it("S27-AC3: whole laps, each team starting equally often, always to 21; 1, 2 or 3 a turn, never past 21; 1 if too slow; making 21 scores the round's share of 150 and every other team half", () => {
    const g = rig<To21State>(to21);
    expect(to21.rounds(g.c, 4)).toBe(4);
    expect([1, 2, 3].map((r) => g.deal(r).order[0])).toEqual(["t1", "t2", "t3"]);
    // 21 every round (Khai, 2026-11-25).
    expect([1, 2, 3, 4].map((r) => g.deal(r).target)).toEqual([21, 21, 21, 21]);
    // Nobody's turn during the count before the start: no live buttons (blind review).
    expect(g.view(g.deal(), cap("t1"), T0 - 500)).toMatchObject({ turn: null, myTurn: false });
    let s = g.deal();
    expect(g.move(s, "t2", { add: 1 }, T0 + 10)).toMatchObject({
      ok: false,
      message: "It isn't your turn.",
    });
    expect(g.move(s, "t1", { add: 4 }, T0 + 10)).toMatchObject({ ok: false });
    s = g.step(s, "t1", { add: 3 }, T0 + 10);
    s = g.step(s, "t2", { add: 3 }, T0 + 20);
    expect(g.turn(s, T0 + 30)?.teamId).toBe("t3");
    // Too slow adds 1 and the turn moves on.
    s = g.tick(s, T0 + 20 + 10_000);
    expect([s.count, g.turn(s, T0 + 10_021)?.teamId]).toEqual([7, "t1"]);
    s = { ...s, count: 19 };
    expect(g.move(s, "t1", { add: 3 }, T0 + 10_030)).toMatchObject({
      ok: false,
      message: "That goes past 21.",
    });
    s = g.step(s, "t1", { add: 2 }, T0 + 10_030);
    expect(s.winner).toBe("t1");
    expect(g.over(s, T0)).toBe(true);
    expect(g.score(s)).toEqual({ t1: 50, t2: 25, t3: 25 });
  });
});

describe("Memory Path", () => {
  it("S27-AC1: each round is harder: a longer path and less time to learn it", () => {
    const g = rig<PathState>(path);
    const rounds = [1, 2, 3, 4, 5, 6].map((r) => g.deal(r, 7, teams));
    for (let i = 1; i < rounds.length; i++) {
      const [a, b] = [rounds[i - 1], rounds[i]];
      if (!a || !b) throw new Error("no round");
      expect(b.path.length).toBeGreaterThan(a.path.length - 1);
      expect(b.showEndsAt - b.startsAt).toBeLessThan(a.showEndsAt - a.startsAt);
    }
    expect(rounds[5]?.path.length).toBeGreaterThanOrEqual(18);
  });

  it("S27-AC1: deals a path from the seed, bottom to top, up/left/right, never doubling back, in length", () => {
    for (let seed = 1; seed < 200; seed++) {
      const p = dealPath(seed, { cols: 5, rows: 9, minLength: 12, maxLength: 16 });
      expect(p[0]?.[1]).toBe(8);
      expect(p[p.length - 1]?.[1]).toBe(0);
      expect(p.length).toBeGreaterThanOrEqual(12);
      expect(p.length).toBeLessThanOrEqual(16);
      expect(new Set(p.map(String)).size).toBe(p.length);
      for (let i = 1; i < p.length; i++) {
        const a: Square = p[i - 1] ?? [0, 0];
        const b: Square = p[i] ?? [0, 0];
        const step = [b[0] - a[0], b[1] - a[1]].join();
        expect(["0,-1", "1,0", "-1,0"]).toContain(step);
        // One clean line: no square touches an earlier one but the square before it.
        for (let j = 0; j < i - 1; j++) {
          const e = p[j] ?? [0, 0];
          expect(Math.abs(e[0] - b[0]) + Math.abs(e[1] - b[1])).toBeGreaterThan(1);
        }
      }
    }
  });

  it("S27-AC1: shows then hides the path, knocks a team out on a wrong or slow step, keeps its right squares lit, and pays the crosser most, part way less, and nothing done least", () => {
    const g = rig<PathState>(path);
    // At least three rounds, in whole laps so every team leads equally often.
    expect(path.rounds(g.c, 3)).toBe(3);
    expect(path.rounds(g.c, 2)).toBe(4);
    expect(path.rounds(g.c, 5)).toBe(5);
    expect([1, 2, 3].map((r) => g.deal(r).order[0])).toEqual(["t1", "t2", "t3"]);
    let s = g.deal();
    const shownAt = (now: number, role: Role) => (g.view(s, role, now).shown as Square[]).length;
    expect(shownAt(T0 + 3000, tv)).toBeGreaterThan(0);
    expect(shownAt(T0 + 3000, cap("t1"))).toBe(0);
    const after = s.showEndsAt + 10;
    expect(shownAt(after, tv)).toBe(0);
    expect(g.move(s, "t1", { dir: "up" }, T0 + 100)).toMatchObject({
      ok: false,
      message: "Watch the path first!",
    });
    // The phone sends arrows: the way from each square of the path to the next.
    const dirTo = (i: number): "up" | "left" | "right" => {
      const [ac, ar] = s.path[i - 1] ?? [0, 0];
      const [bc, br] = s.path[i] ?? [0, 0];
      return br < ar ? "up" : bc < ac ? "left" : "right";
    };
    // Each team starts on the first square, given; t1 gets 3 steps right, then a wrong one.
    expect(g.view(s, tv, after).progress).toEqual([s.path[0]]);
    for (let i = 1; i <= 3; i++) s = g.step(s, "t1", { dir: dirTo(i) }, after + i);
    const wrong = (["up", "left", "right"] as const).find((d) => d !== dirTo(4)) ?? "up";
    s = g.step(s, "t1", { dir: wrong }, after + 10);
    expect(s.results.t1).toEqual({ reached: 4, crossed: false });
    expect((g.view(s, cap("t2"), after + 20).lit as Square[]).length).toBe(4);
    // t2 is too slow on its first step.
    s = g.tick(s, after + 10 + 5001);
    expect(s.results.t2).toEqual({ reached: 1, crossed: false });
    // t3 crosses.
    for (let i = 1; i < s.path.length; i++)
      s = g.step(s, "t3", { dir: dirTo(i) }, after + 6000 + i);
    expect(s.winner).toBe("t3");
    // Of three rounds' 50: across 50, some squares right 40, none 25 (Khai, 2026-11-24).
    expect(g.score(s)).toEqual({ t1: 40, t2: 25, t3: 50 });
    expect((g.view(s, tv, after + 9000, true).shown as Square[]).length).toBe(s.path.length);
  });
});

describe("Present Shuffle", () => {
  it("S27-AC2: shows seeded values, one more present each round, shuffles them, and the TV alone gets them while they're out", () => {
    expect(
      afterSwaps(3, [
        [0, 1],
        [1, 2],
      ]),
    ).toEqual([1, 2, 0]);
    const g = rig<ShuffleState>(shuffle);
    const s = g.deal();
    // One more present to follow each round (Khai, 2026-11-24), the best worth the round's 50.
    expect([1, 2, 3].map((r) => g.deal(r).values.length)).toEqual([5, 6, 7]);
    expect(new Set(s.values).size).toBe(5);
    expect(Math.max(...g.deal(3).values)).toBeLessThanOrEqual(50);
    expect(g.view(s, tv, T0 + 1000).shown).toEqual(s.values);
    expect(g.view(s, cap("t1"), T0 + 1000)).toMatchObject({ shown: null, swaps: null });
    expect(g.view(s, tv, s.shuffleEndsAt + 1)).toMatchObject({
      shown: null,
      swaps: null,
      final: null,
    });
  });

  it("S27-AC2: one pick each in a rotating order; a picked present is gone; a slow pick gets nothing; points are the presents picked", () => {
    const g = rig<ShuffleState>(shuffle);
    expect([1, 2, 3].map((r) => g.deal(r).order[0])).toEqual(["t1", "t2", "t3"]);
    let s = g.deal();
    const at = s.shuffleEndsAt + 10;
    expect(g.move(s, "t1", { slot: 0 }, s.showEndsAt + 10)).toMatchObject({ ok: false });
    s = g.step(s, "t1", { slot: 4 }, at);
    expect(g.move(s, "t2", { slot: 4 }, at + 5)).toMatchObject({
      ok: false,
      message: "That one's gone.",
    });
    s = g.tick(s, at + 15_001);
    expect(s.picks.t2).toBeNull();
    s = g.step(s, "t3", { slot: 0 }, at + 15_100);
    expect(g.over(s, at + 15_200)).toBe(true);
    const value = (slot: number) => s.values[s.slots[slot] ?? 0];
    expect(g.score(s)).toEqual({ t1: value(4), t2: 0, t3: value(0) });
  });
});

// ---- Mock play tests (S24-AC8, S24-AC6)

const gv = (ctx: BotContext) => ctx.view.game as Record<string, unknown> | null;
const myTurn = (ctx: BotContext) => gv(ctx)?.myTurn === true;
const since = (ctx: BotContext, key: string) => ctx.now - Number(gv(ctx)?.[key] ?? 0);

const TO21: Record<string, Bot> = {
  // Leaves the count one short of a multiple of 4 below 21 when it can.
  perfect: (ctx) => {
    if (!myTurn(ctx)) return null;
    const count = Number(gv(ctx)?.count);
    const want = (21 - count) % 4;
    return { add: want === 0 ? 1 : want };
  },
  random: (ctx) => (myTurn(ctx) ? { add: 1 + Math.floor(ctx.random() * 3) } : null),
  cautious: (ctx) => (myTurn(ctx) ? { add: 1 } : null),
  reckless: (ctx) => (myTurn(ctx) ? { add: 3 } : null),
  late: () => null,
};

const PATH: Record<string, Bot> = {
  perfect: (ctx) => {
    if (!myTurn(ctx)) return null;
    const s = ctx.peek as PathState;
    return { square: s.path[s.progress] };
  },
  random: (ctx) => {
    if (!myTurn(ctx)) return null;
    const v = gv(ctx) as { cols: number; rows: number };
    return { square: [Math.floor(ctx.random() * v.cols), Math.floor(ctx.random() * v.rows)] };
  },
  // Gets the lit squares right, then guesses.
  cautious: (ctx) => {
    if (!myTurn(ctx)) return null;
    const v = gv(ctx) as { lit: Square[]; progress: Square[]; cols: number };
    const next = v.lit[v.progress.length];
    return {
      square: next ?? [
        Math.floor(ctx.random() * v.cols),
        (v.progress[v.progress.length - 1]?.[1] ?? 9) - 1,
      ],
    };
  },
  reckless: (ctx) => (myTurn(ctx) ? { square: [0, 0] } : null),
  late: () => null,
};

const SHUFFLE: Record<string, Bot> = {
  perfect: (ctx) => {
    if (!myTurn(ctx)) return null;
    const s = ctx.peek as ShuffleState;
    const gone = new Set(Object.values(s.picks).flatMap((p) => (p ? [p.slot] : [])));
    const best = s.slots
      .map((p, slot) => ({ slot, v: s.values[p] ?? 0 }))
      .filter((x) => !gone.has(x.slot))
      .sort((a, b) => b.v - a.v)[0];
    return best ? { slot: best.slot } : null;
  },
  random: (ctx) => (myTurn(ctx) ? { slot: Math.floor(ctx.random() * 9) } : null),
  cautious: (ctx) =>
    myTurn(ctx) && since(ctx, "turnEndsAt") > -3000 ? { slot: Math.floor(ctx.random() * 9) } : null,
  reckless: (ctx) => (myTurn(ctx) ? { slot: 99 } : null),
  late: () => null,
};

function lineup(bots: Record<string, Bot>, n: number, shift: number) {
  const kinds = ["perfect", "random", "cautious", "reckless", "late", "silent", "dropout"];
  const mine = Array.from({ length: n }, (_, i) => kinds[(i + shift) % kinds.length] ?? "silent");
  return {
    mine,
    bots: (i: number) => {
      const k = mine[i] ?? "silent";
      if (k === "silent") return null;
      return bots[k === "dropout" ? "perfect" : k] ?? null;
    },
    dropOutFrom: Object.fromEntries(
      mine.flatMap((k, i) => (k === "dropout" ? [[i, 2] as const] : [])),
    ),
  };
}

/** The points a round can pay with n teams: its share of 150 over the game's rounds (ADR-045). */
const share = (n: number) => 150 / lapRounds(n);
const roundGames: [string, AnyShowdown, Record<string, Bot>, (n: number) => number[] | null][] = [
  [
    "Snowball to 21",
    to21,
    TO21,
    (n) => [Math.round(share(n)), Math.round(Math.round(share(n)) / 2)],
  ],
  ["Memory Path", path, PATH, (n) => [1, 0.8, 0.5].map((f) => Math.round(share(n) * f))],
  // Any present's value, up to the round's share.
  ["Present Shuffle", shuffle, SHUFFLE, () => null],
];

describe("spec 27 play tests (S24-AC8, S24-AC6)", () => {
  for (const [name, game, bots, allowed] of roundGames)
    it(`S24-AC8 S24-AC6: ${name} plays at least three rounds in whole laps with 1 to 6 teams, each team leading equally often, scores in its rules, nothing leaks`, () => {
      for (const n of PLAYTEST_TEAM_COUNTS)
        for (const shift of [0, 1, 2, 3, 4, 5, 6]) {
          const line = lineup(bots, n, shift);
          const r = playtest(
            game,
            {},
            {
              teams: n,
              seed: n * 19 + shift,
              stepMs: 250,
              roundCapMs: 600_000,
              bots: line.bots,
              dropOutFrom: line.dropOutFrom,
              leakCheck: (view, _state, role) => {
                const v = view as Record<string, unknown>;
                if (role.kind !== "tv" && Array.isArray(v.shown) && v.shown.length > 0)
                  return "path shown on a phone";
                if (
                  role.kind !== "tv" &&
                  v.shown !== undefined &&
                  v.shown !== null &&
                  !Array.isArray(v.shown)
                )
                  return "values on a phone";
                if (v.final !== undefined && v.final !== null)
                  return "final slots before the reveal";
                return null;
              },
            },
          );
          expect(r.ended).toBe(true);
          expect(r.leaks).toEqual([]);
          // At least three rounds, in whole laps (Khai, 2026-11-24).
          expect(r.rounds).toHaveLength(lapRounds(n));
          for (const round of r.rounds)
            for (const p of Object.values(round)) {
              const ok = allowed(n);
              if (ok) expect(ok).toContain(p);
              else expect(p).toBeLessThanOrEqual(Math.ceil(share(n)));
              expect(p).toBeGreaterThanOrEqual(0);
            }
          // Every team leads equally often over the game (S24-AC6).
          expect(leadCounts(r.turnOrders)).toEqual(
            Object.fromEntries(
              Array.from({ length: n }, (_, i) => [`t${String(i + 1)}`, lapRounds(n) / n]),
            ),
          );
          // A perfect team never loses a round it leads.
          line.mine.forEach((k, i) => {
            if (k !== "perfect" || game === to21) return;
            const id = `t${String(i + 1)}`;
            const led = r.turnOrders.findIndex((o) => o[0] === id);
            if (game === path) expect(r.rounds[led]?.[id]).toBe(Math.round(share(n)));
          });
          // Snowball: someone always makes 21.
          if (game === to21)
            for (const round of r.rounds)
              expect(Object.values(round)).toContain(Math.round(share(n)));
        }
    });
});
