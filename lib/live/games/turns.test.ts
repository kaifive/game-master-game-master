import { describe, expect, it } from "vitest";
import { leadCounts, leadOrder } from "../fairness";
import type { AnyShowdown, MoveResult, Role } from "../model";
import { PLAYTEST_TEAM_COUNTS, playtest, type Bot, type BotContext } from "../playtest";
import {
  cover,
  dealPiece,
  landmass,
  LAND_LADDER,
  placements,
  squaresOf,
  type LandState,
} from "./landmass";
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
  it("S27-AC3: one round per team, each starting one; 1, 2 or 3 a turn, never past 21; 1 if too slow; 100 for making 21", () => {
    const g = rig<To21State>(to21);
    expect(to21.rounds(g.c, 4)).toBe(4);
    expect([1, 2, 3].map((r) => g.deal(r).order[0])).toEqual(["t1", "t2", "t3"]);
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
    expect(g.score(s)).toEqual({ t1: 100, t2: 0, t3: 0 });
  });
});

describe("Memory Path", () => {
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
      }
    }
  });

  it("S27-AC1: shows then hides the path, knocks a team out on a wrong or slow step, keeps its right squares lit, and pays only the crosser", () => {
    const g = rig<PathState>(path);
    expect(path.rounds(g.c, 3)).toBe(3);
    expect([1, 2, 3].map((r) => g.deal(r).order[0])).toEqual(["t1", "t2", "t3"]);
    let s = g.deal();
    const shownAt = (now: number, role: Role) => (g.view(s, role, now).shown as Square[]).length;
    expect(shownAt(T0 + 3000, tv)).toBeGreaterThan(0);
    expect(shownAt(T0 + 3000, cap("t1"))).toBe(0);
    const after = s.showEndsAt + 10;
    expect(shownAt(after, tv)).toBe(0);
    expect(g.move(s, "t1", { square: s.path[0] }, T0 + 100)).toMatchObject({
      ok: false,
      message: "Watch the path first!",
    });
    // t1 gets 3 right, then taps a wrong square.
    for (let i = 0; i < 3; i++) s = g.step(s, "t1", { square: s.path[i] }, after + i);
    const wrong: Square = [((s.path[3]?.[0] ?? 0) + 1) % s.cols, s.path[3]?.[1] ?? 0];
    const away = s.path.slice(4).some((q) => q[0] === wrong[0] && q[1] === wrong[1]);
    s = g.step(s, "t1", { square: away ? [-1, -1] : wrong }, after + 10);
    expect(s.results.t1).toEqual({ reached: 3, crossed: false });
    expect((g.view(s, cap("t2"), after + 20).lit as Square[]).length).toBe(3);
    // t2 is too slow on its first step.
    s = g.tick(s, after + 10 + 5001);
    expect(s.results.t2).toEqual({ reached: 0, crossed: false });
    // t3 crosses.
    for (let i = 0; i < s.path.length; i++)
      s = g.step(s, "t3", { square: s.path[i] }, after + 6000 + i);
    expect(s.winner).toBe("t3");
    expect(g.score(s)).toEqual({ t1: 0, t2: 0, t3: 150 });
    expect((g.view(s, tv, after + 9000, true).shown as Square[]).length).toBe(s.path.length);
  });
});

describe("Present Shuffle", () => {
  it("S27-AC2: shows seeded values, shuffles them, and the TV alone gets them while they're out", () => {
    expect(
      afterSwaps(3, [
        [0, 1],
        [1, 2],
      ]),
    ).toEqual([1, 2, 0]);
    const g = rig<ShuffleState>(shuffle);
    const s = g.deal();
    expect(s.values).toHaveLength(9);
    expect(new Set(s.values).size).toBe(9);
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

describe("Land Mass", () => {
  it("S27-AC4: deals pieces of 3 to 5 squares; a piece goes anywhere it fits, takes the team's color, and is replaced in the tray", () => {
    for (let seed = 1; seed < 100; seed++) {
      const p = dealPiece(seed);
      expect(p.length).toBeGreaterThanOrEqual(3);
      expect(p.length).toBeLessThanOrEqual(5);
    }
    const g = rig<LandState>(landmass);
    expect(landmass.rounds(g.c, 4)).toBe(1);
    let s = g.deal();
    expect(s.tray).toHaveLength(4);
    const first = placements(s, s.tray[0] ?? []).next().value;
    if (!first) throw new Error("no place");
    const piece = s.tray[0] ?? [];
    expect(g.move(s, "t2", { piece: 0, ...first }, T0 + 10)).toMatchObject({
      ok: false,
      message: "It isn't your turn.",
    });
    s = g.step(s, "t1", { piece: 0, ...first }, T0 + 10);
    expect(squaresOf(s, "t1")).toBe(piece.length);
    expect(s.tray[0]).not.toEqual(piece);
    // No overlap, nothing off the board.
    expect(
      g.move(s, "t2", { piece: 1, turns: first.turns, row: first.row, col: first.col }, T0 + 20),
    ).toMatchObject({ ok: false });
    expect(cover(s, [[0, 0]], 0, s.rows, 0)).toBeNull();
  });

  it("S27-AC4: turns time out after 20 s; the lead moves one team on each time round", () => {
    const g = rig<LandState>(landmass);
    let s = g.deal();
    const turns: string[] = [];
    for (let i = 0; i < 9; i++) {
      turns.push(g.turn(s, T0 + i * 20_001)?.teamId ?? "");
      s = g.tick(s, T0 + (i + 1) * 20_001);
    }
    expect(turns).toEqual([...leadOrder(teams, 0), ...leadOrder(teams, 1), ...leadOrder(teams, 2)]);
  });

  it("S27-AC4: when nothing fits the tray swaps once, then the game ends; points are ranked by squares", () => {
    const g = rig<LandState>(landmass, { cols: 6, rows: 6 });
    let s = g.deal();
    // Fill the board but one lone square: no piece of 3 or more can fit.
    s = { ...s, board: s.board.map((_, i) => (i === 0 ? null : i % 2 ? "t1" : "t2")) };
    s = g.tick(s, T0 + 20_001);
    expect(s.ended).toBe(true);
    expect(s.swaps).toBe(1);
    const pts = g.score({ ...s, board: s.board.map((o, i) => (i < 3 ? "t3" : o)) });
    expect(pts.t3).toBe(LAND_LADDER[2]);
    expect(g.score({ ...s, board: s.board.map(() => null) })).toEqual({ t1: 0, t2: 0, t3: 0 });
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

const landPlace = (ctx: BotContext, pickRandom: boolean) => {
  if (!myTurn(ctx)) return null;
  const s = ctx.peek as LandState;
  for (const [i, piece] of s.tray.entries()) {
    const spots = [...placements(s, piece)];
    if (spots.length === 0) continue;
    const spot = pickRandom ? spots[Math.floor(ctx.random() * spots.length)] : spots[0];
    if (spot) return { piece: i, ...spot };
  }
  return null;
};
const LAND: Record<string, Bot> = {
  perfect: (ctx) => landPlace(ctx, false),
  random: (ctx) => landPlace(ctx, true),
  cautious: (ctx) =>
    myTurn(ctx) && since(ctx, "turnEndsAt") > -4000 ? landPlace(ctx, true) : null,
  reckless: (ctx) => (myTurn(ctx) ? { piece: 0, turns: 0, row: -1, col: -1 } : null),
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

const roundGames: [string, AnyShowdown, Record<string, Bot>, number[]][] = [
  ["Snowball to 21", to21, TO21, [0, 100]],
  ["Memory Path", path, PATH, [0, 150]],
  ["Present Shuffle", shuffle, SHUFFLE, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]],
];

describe("spec 27 play tests (S24-AC8, S24-AC6)", () => {
  for (const [name, game, bots, allowed] of roundGames)
    it(`S24-AC8 S24-AC6: ${name} plays one round per team with 1 to 6 teams, each team leading one, scores in its rules, nothing leaks`, () => {
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
          expect(r.rounds).toHaveLength(n);
          for (const round of r.rounds)
            for (const p of Object.values(round)) expect(allowed).toContain(p);
          // Every team leads exactly once over the game (S24-AC6).
          expect(leadCounts(r.turnOrders)).toEqual(
            Object.fromEntries(Array.from({ length: n }, (_, i) => [`t${String(i + 1)}`, 1])),
          );
          // A perfect team never loses a round it leads.
          line.mine.forEach((k, i) => {
            if (k !== "perfect" || game === to21) return;
            const id = `t${String(i + 1)}`;
            const led = r.turnOrders.findIndex((o) => o[0] === id);
            if (game === path) expect(r.rounds[led]?.[id]).toBe(150);
          });
          // Snowball: someone always makes 21.
          if (game === to21)
            for (const round of r.rounds) expect(Object.values(round)).toContain(100);
        }
    });

  it("S24-AC8 S24-AC6: Land Mass plays to the end with 1 to 6 teams, leads rotating each lap, squares ranked into points", () => {
    for (const n of PLAYTEST_TEAM_COUNTS)
      for (const shift of [0, 2, 4, 6]) {
        const line = lineup(LAND, n, shift);
        const r = playtest(
          landmass,
          { cols: 8, rows: 6 },
          {
            teams: n,
            seed: n * 23 + shift,
            stepMs: 2000,
            roundCapMs: 6_000_000,
            bots: line.bots,
            dropOutFrom: line.dropOutFrom,
          },
        );
        expect(r.ended).toBe(true);
        const final = r.finals[0] as LandState;
        expect(final.ended).toBe(true);
        // The lead moves one team on each time round.
        const order = r.turnOrders[0] ?? [];
        const flat = final.history.map((h) => h.teamId);
        for (let lap = 0; lap * n < flat.length; lap++)
          expect(flat.slice(lap * n, lap * n + n)).toEqual(
            leadOrder(
              Array.from({ length: n }, (_, i) => `t${String(i + 1)}`),
              lap,
            ).slice(0, flat.slice(lap * n, lap * n + n).length),
          );
        expect(order.length).toBeGreaterThan(0);
        for (const p of Object.values(r.rounds[0] ?? {}))
          expect([0, 10, ...LAND_LADDER]).toContain(p);
        // Nobody owns a square twice: the board adds up.
        const owned = final.board.filter((o) => o !== null).length;
        expect(owned).toBe(Object.keys(r.scores).reduce((a, t) => a + squaresOf(final, t), 0));
      }
  });
});
