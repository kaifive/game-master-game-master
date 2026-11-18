import { describe, expect, it } from "vitest";
import { next, startSession, type Machine } from "../machine";
import type { AnyShowdown, MoveResult, Role, Session } from "../model";
import {
  PLAYTEST_TEAM_COUNTS,
  playtest,
  playtestTeams,
  type Bot,
  type BotContext,
} from "../playtest";
import { auction, auctionWinner, type AuctionState } from "./auction";
import { pairPoints, pairUp, snatch, type SnatchState } from "./snatch";
import { MAX_OPENINGS, REVEAL_MS, stockingFor, stockings, type StockingState } from "./stockings";

const T0 = 1_000_000;
const teams = ["t1", "t2", "t3", "t4"];
const cap = (teamId: string): Role => ({ kind: "captain", teamId });

function rig<S>(game: AnyShowdown, content: unknown = {}) {
  const c = game.content.parse(content);
  const deal = (round: number, prev: S | null, seed = 5, ts = teams) =>
    game.deal(c, { seed, round, teams: ts, startsAt: T0, prev }) as S;
  const move = (s: S, teamId: string, mv: unknown, now = T0 + 100) =>
    game.move(s, c, { teamId, move: mv, now }) as MoveResult<S>;
  const step = (s: S, teamId: string, mv: unknown, now = T0 + 100) => {
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
    close: (s: S, now = T0 + 100) => (game.close ? (game.close(s, c, now) as S) : s),
    score: (s: S, ts = teams) => game.score(s, c, ts),
    view: (s: S, role: Role, revealed = false, now = T0 + 100) =>
      game.view(s, c, { role, revealed, now, teams }) as Record<string, unknown>,
    over: (s: S, now: number) => game.over(s, c, now),
  };
}

describe("Auction", () => {
  it("S26-AC1: tied bids cancel, the highest untied bid wins, and nobody wins when every bid ties", () => {
    expect(auctionWinner({ t1: 9, t2: 9, t3: 7, t4: 3 })).toBe("t3");
    expect(auctionWinner({ t1: 9, t2: 9, t3: 7, t4: 7 })).toBeNull();
    expect(auctionWinner({ t1: 2 })).toBe("t1");
    expect(auctionWinner({})).toBeNull();
  });

  it("S26-AC1: each team has 1 to 10 once each; a missing bid spends the lowest left; prizes are paid to the winner", () => {
    const g = rig<AuctionState>(auction);
    expect(auction.rounds(g.c, 4)).toBe(10);
    let s = g.deal(1, null);
    expect(new Set(s.prizes).size).toBe(10);
    expect(s.left.t1).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    s = g.step(s, "t1", { bid: 10 });
    s = g.step(s, "t2", { bid: 10 });
    s = g.step(s, "t3", { bid: 6 });
    expect(g.move(s, "t3", { bid: 5 })).toMatchObject({ ok: false, message: "You've bid." });
    // Bids stay secret until the reveal; numbers left are public.
    expect(g.view(s, cap("t4"))).toMatchObject({
      bids: null,
      mine: null,
      lockedIn: ["t1", "t2", "t3"],
    });
    s = g.close(s);
    expect(s.bids.t4).toBe(1);
    expect(g.score(s)).toEqual({ t1: 0, t2: 0, t3: s.prize, t4: 0 });
    // Round 2 carries the numbers spent and the prize won.
    const r2 = g.deal(2, s);
    expect(r2.left.t1).not.toContain(10);
    expect(r2.left.t4).not.toContain(1);
    expect(r2.won).toEqual({ t3: s.prize });
    expect(r2.prize).toBe(s.prizes[1]);
    expect(g.move(r2, "t1", { bid: 10 })).toMatchObject({
      ok: false,
      message: "You've used that number.",
    });
    expect(g.move(r2, "t1", { bid: 9 }, T0 + 16_000)).toMatchObject({
      ok: false,
      message: "Time's up.",
    });
  });
});

describe("Stocking Stuffer", () => {
  it("S26-AC2: takes Open or Bank from everyone at once, reveals seeded stockings, and coal empties the pot and puts the team out", () => {
    const g = rig<StockingState>(stockings);
    let s = g.deal(1, null);
    const first = [0, 1, 2, 3].map((i) => stockingFor(s, i, 1));
    expect(stockingFor(s, 0, 1)).toEqual(first[0]);
    s = g.step(s, "t1", { choice: "open" });
    s = g.step(s, "t2", { choice: "bank" });
    // Nobody sees another's choice until the opening.
    expect(g.view(s, cap("t3"))).toMatchObject({ mine: null, lockedIn: ["t1", "t2"] });
    s = g.step(s, "t3", { choice: "open" });
    expect(s.history).toHaveLength(0);
    s = g.step(s, "t4", { choice: "open" });
    // Everyone has chosen: the stockings open at once.
    expect(s.history).toHaveLength(1);
    expect(s.status.t2).toBe("banked");
    for (const [i, t] of ["t1", "t3", "t4"].entries()) {
      const found = first[[0, 2, 3][i] ?? 0];
      if (found?.kind === "coal") expect([s.status[t], s.pots[t]]).toEqual(["coal", 0]);
      else expect([s.status[t], s.pots[t]]).toEqual(["in", found?.value]);
    }
    expect(g.move(s, "t2", { choice: "open" })).toMatchObject({
      ok: false,
      message: "You're done this round.",
    });
  });

  it("S26-AC2: no choice in time counts as Bank; the round ends when all have banked or busted, paying what was banked", () => {
    const g = rig<StockingState>(stockings);
    let s = g.deal(1, null);
    s = g.step(s, "t1", { choice: "open" });
    s = g.tick(s, T0 + 10_001);
    expect(["in", "coal"]).toContain(s.status.t1);
    expect([s.status.t2, s.status.t3, s.status.t4]).toEqual(["banked", "banked", "banked"]);
    // After the reveal, the next opening starts for whoever is still in.
    const again = g.tick(s, T0 + 10_001 + REVEAL_MS);
    if (s.status.t1 === "in") expect(again.opening).toBe(2);
    // Closing early banks everyone still in.
    const closed = g.close(again, T0 + 20_000);
    expect(Object.values(closed.status).every((v) => v !== "in")).toBe(true);
    const pts = g.score(closed);
    expect(pts.t2).toBe(0);
    expect(pts.t1).toBe(closed.status.t1 === "banked" ? closed.pots.t1 : 0);
  });

  it("S26-AC2: a round can't run forever: past the opening limit everyone still in banks", () => {
    const g = rig<StockingState>(stockings, { coalOneIn: 20 });
    let s = g.deal(1, null, 3, ["t1"]);
    let now = T0;
    for (let i = 0; i < MAX_OPENINGS + 2 && s.status.t1 === "in"; i++) {
      if (s.revealUntil === null) s = g.step(s, "t1", { choice: "open" }, now + 10);
      now += REVEAL_MS + 20;
      s = g.tick(s, now);
    }
    expect(s.status.t1).not.toBe("in");
  });
});

describe("Share or Snatch", () => {
  it("S26-AC3: needs two teams, plays three rounds with an even count and one per team with an odd count", () => {
    const g = rig<SnatchState>(snatch);
    expect(snatch.minTeams).toBe(2);
    expect(snatch.rounds(g.c, 4)).toBe(3);
    expect(snatch.rounds(g.c, 5)).toBe(5);
    expect(snatch.rounds(g.c, 2)).toBe(3);
  });

  it("S26-AC3: with an odd count each team sits out exactly once, and pairs avoid repeats when they can", () => {
    const five = ["a", "b", "c", "d", "e"];
    const sat: string[] = [];
    let history: [string, string][] = [];
    for (let r = 1; r <= 5; r++) {
      const { pairs, sitOut } = pairUp(five, r);
      expect(pairs).toHaveLength(2);
      if (sitOut) sat.push(sitOut);
      history = [...history, ...pairs];
    }
    expect(sat.sort()).toEqual(five);
    // 10 pairs over 5 rounds out of the 10 possible: all different.
    expect(new Set(history.map((p) => [...p].sort().join())).size).toBe(10);
  });

  it("S26-AC3: with an even count, three rounds never repeat a pair", () => {
    const seen = [1, 2, 3].flatMap((r) =>
      pairUp(["a", "b", "c", "d"], r).pairs.map((p) => [...p].sort().join()),
    );
    expect(new Set(seen).size).toBe(6);
  });

  it("S26-AC3: one secret choice each (Share if none) pays 50/50, 100/0 or 0/0", () => {
    expect(pairPoints("share", "share", 100)).toEqual([50, 50]);
    expect(pairPoints("snatch", "share", 100)).toEqual([100, 0]);
    expect(pairPoints("share", "snatch", 100)).toEqual([0, 100]);
    expect(pairPoints("snatch", "snatch", 100)).toEqual([0, 0]);
    const g = rig<SnatchState>(snatch);
    let s = g.deal(1, null);
    const [a, b] = s.pairs[0] ?? ["", ""];
    s = g.step(s, a, { choice: "snatch" });
    expect(g.view(s, cap(b))).toMatchObject({ choices: null, mine: null, lockedIn: [a] });
    s = g.close(s);
    expect(s.choices[b]).toBe("share");
    expect(g.score(s)[a]).toBe(100);
    expect(g.score(s)[b]).toBe(0);
  });
});

// ---- Mock play tests (S24-AC8)

type V = Record<string, unknown> & { startsAt: number; closesAt: number };
const gv = (ctx: BotContext) => ctx.view.game as V | null;
const open = (ctx: BotContext) => {
  const v = gv(ctx);
  return v !== null && ctx.now >= v.startsAt && ctx.now <= v.closesAt && v.mine === null;
};
const myLeft = (ctx: BotContext) =>
  (gv(ctx)?.left as Record<string, number[]> | undefined)?.[ctx.teamId] ?? [];

const AUCTION_BOTS: Record<string, Bot> = {
  greedy: (ctx) => (open(ctx) ? { bid: Math.max(...myLeft(ctx)) } : null),
  random: (ctx) => {
    const left = myLeft(ctx);
    return open(ctx) && ctx.now >= (gv(ctx)?.startsAt ?? 0) + 3000
      ? { bid: left[Math.floor(ctx.random() * left.length)] ?? 1 }
      : null;
  },
  cautious: (ctx) => (open(ctx) ? { bid: Math.min(...myLeft(ctx)) } : null),
  // Tries a number it doesn't have, then a real one.
  reckless: (ctx) =>
    open(ctx) ? { bid: ctx.random() < 0.5 ? 11 : Math.max(...myLeft(ctx)) } : null,
  late: (ctx) => {
    const v = gv(ctx);
    return v && ctx.now > v.closesAt ? { bid: Math.max(...myLeft(ctx)) } : null;
  },
};

const myIndex = (ctx: BotContext) => Number(ctx.teamId.slice(1)) - 1;
const stockOpen = (ctx: BotContext) => {
  const v = gv(ctx);
  const status = (v?.status as Record<string, string> | undefined)?.[ctx.teamId];
  return (
    v !== null &&
    v.revealUntil === null &&
    status === "in" &&
    ctx.now >= v.startsAt &&
    v.mine === null
  );
};
const STOCKING_BOTS: Record<string, Bot> = {
  // Peeks at the next stocking: opens unless it's coal.
  perfect: (ctx) => {
    if (!stockOpen(ctx)) return null;
    const s = ctx.peek as StockingState;
    const found = stockingFor(s, myIndex(ctx), s.opening);
    return { choice: found.kind === "coal" ? "bank" : "open" };
  },
  random: (ctx) => (stockOpen(ctx) ? { choice: ctx.random() < 0.5 ? "open" : "bank" } : null),
  cautious: (ctx) => (stockOpen(ctx) ? { choice: "bank" } : null),
  reckless: (ctx) => (stockOpen(ctx) ? { choice: "open" } : null),
  late: () => null,
};

const SNATCH_BOTS: Record<string, Bot> = {
  sharer: (ctx) => (open(ctx) ? { choice: "share" } : null),
  snatcher: (ctx) => (open(ctx) ? { choice: "snatch" } : null),
  random: (ctx) => (open(ctx) ? { choice: ctx.random() < 0.5 ? "share" : "snatch" } : null),
  late: (ctx) => {
    const v = gv(ctx);
    return v && ctx.now > v.closesAt ? { choice: "snatch" } : null;
  },
};

/** Team i plays kinds[(i + shift) % kinds.length]; "silent" never answers, "dropout" quits from round 2. */
function lineup(bots: Record<string, Bot>, kinds: string[], n: number, shift: number) {
  const mine = Array.from({ length: n }, (_, i) => kinds[(i + shift) % kinds.length] ?? "silent");
  return {
    mine,
    bots: (i: number) => {
      const k = mine[i] ?? "silent";
      if (k === "silent") return null;
      return bots[k === "dropout" ? (Object.keys(bots)[0] ?? "") : k] ?? null;
    },
    dropOutFrom: Object.fromEntries(
      mine.flatMap((k, i) => (k === "dropout" ? [[i, 2] as const] : [])),
    ),
  };
}

const noLeak = (secret: string[]) => (view: unknown) => {
  const v = (view ?? {}) as Record<string, unknown>;
  for (const k of secret) if (v[k] !== null && v[k] !== undefined) return `${k} before the reveal`;
  return null;
};

describe("spec 26 play tests (S24-AC8)", () => {
  it("S24-AC8: Auction plays whole games with 1 to 6 teams: each number once per team, prizes only to a winner, nothing leaks", () => {
    const kinds = ["greedy", "random", "cautious", "reckless", "late", "silent", "dropout"];
    for (const n of PLAYTEST_TEAM_COUNTS)
      for (const shift of [0, 1, 2, 3, 4, 5, 6]) {
        const line = lineup(AUCTION_BOTS, kinds, n, shift);
        const r = playtest(
          auction,
          {},
          {
            teams: n,
            seed: n * 11 + shift,
            stepMs: 250,
            leakCheck: noLeak(["bids"]),
            bots: line.bots,
            dropOutFrom: line.dropOutFrom,
          },
        );
        expect(r.ended).toBe(true);
        expect(r.leaks).toEqual([]);
        expect(r.rounds).toHaveLength(10);
        const finals = r.finals as AuctionState[];
        for (const t of Object.keys(r.scores)) {
          const spent = finals.map((f) => f.bids[t]).filter((b) => b !== undefined);
          expect(new Set(spent).size).toBe(spent.length);
        }
        r.rounds.forEach((pts, i) => {
          const winners = Object.values(pts).filter((p) => p > 0);
          expect(winners.length).toBeLessThanOrEqual(1);
          if (winners[0] !== undefined) expect(winners[0]).toBe(finals[i]?.prize);
        });
        // The prizes add up to no more than the whole pot of prizes.
        expect(Object.values(r.scores).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(550);
      }
  });

  it("S24-AC8: Auction where every team bids the same each round gives nobody anything", () => {
    const r = playtest(
      auction,
      {},
      { teams: 3, seed: 2, stepMs: 250, bots: () => AUCTION_BOTS.greedy ?? null },
    );
    expect(Object.values(r.scores)).toEqual([0, 0, 0]);
  });

  it("S24-AC8: Stocking Stuffer plays whole games with 1 to 6 teams: rounds end, banked points only, the peeking team never busts", () => {
    const kinds = ["perfect", "random", "cautious", "reckless", "late", "silent", "dropout"];
    for (const n of PLAYTEST_TEAM_COUNTS)
      for (const shift of [0, 1, 2, 3, 4, 5, 6]) {
        const line = lineup(STOCKING_BOTS, kinds, n, shift);
        const r = playtest(
          stockings,
          {},
          {
            teams: n,
            seed: n * 13 + shift,
            stepMs: 250,
            roundCapMs: 400_000,
            leakCheck: () => null,
            bots: line.bots,
            dropOutFrom: line.dropOutFrom,
          },
        );
        expect(r.ended).toBe(true);
        expect(r.rounds).toHaveLength(5);
        const finals = r.finals as StockingState[];
        finals.forEach((f, i) => {
          for (const t of Object.keys(f.status)) {
            expect(f.status[t]).not.toBe("in");
            expect(r.rounds[i]?.[t]).toBe(f.status[t] === "banked" ? f.pots[t] : 0);
          }
        });
        line.mine.forEach((k, i) => {
          const t = `t${String(i + 1)}`;
          if (k === "perfect") for (const f of finals) expect(f.status[t]).toBe("banked");
          if (k === "silent" || k === "late") expect(r.scores[t]).toBe(0);
        });
      }
  });

  it("S24-AC8: Stocking Stuffer where everyone banks at once ends the round on the first opening with nothing", () => {
    const r = playtest(
      stockings,
      {},
      { teams: 4, seed: 3, stepMs: 250, bots: () => STOCKING_BOTS.cautious ?? null },
    );
    for (const f of r.finals as StockingState[]) expect(f.history).toHaveLength(1);
    expect(Object.values(r.scores)).toEqual([0, 0, 0, 0]);
  });

  it("S24-AC8 S24-AC6: Share or Snatch gives every team the same number of matchups, pays only 0, 50 or 100, and nothing leaks", () => {
    const kinds = ["sharer", "snatcher", "random", "late", "silent", "dropout"];
    for (const n of PLAYTEST_TEAM_COUNTS.filter((x) => x >= 2))
      for (const shift of [0, 1, 2, 3, 4, 5]) {
        const line = lineup(SNATCH_BOTS, kinds, n, shift);
        const r = playtest(
          snatch,
          {},
          {
            teams: n,
            seed: n * 17 + shift,
            stepMs: 250,
            leakCheck: noLeak(["choices"]),
            bots: line.bots,
            dropOutFrom: line.dropOutFrom,
          },
        );
        expect(r.ended).toBe(true);
        expect(r.leaks).toEqual([]);
        const finals = r.finals as SnatchState[];
        const games: Record<string, number> = {};
        const sat: Record<string, number> = {};
        for (const f of finals) {
          for (const t of f.pairs.flat()) games[t] = (games[t] ?? 0) + 1;
          if (f.sitOut) sat[f.sitOut] = (sat[f.sitOut] ?? 0) + 1;
        }
        expect(new Set(Object.values(games)).size).toBe(1);
        if (n % 2 === 1) expect(Object.values(sat)).toEqual(Array(n).fill(1));
        for (const round of r.rounds)
          for (const p of Object.values(round)) expect([0, 50, 100]).toContain(p);
      }
  });

  it("S24-AC8: Share or Snatch where everyone snatches pays nobody", () => {
    const r = playtest(
      snatch,
      {},
      { teams: 4, seed: 1, stepMs: 250, bots: () => SNATCH_BOTS.snatcher ?? null },
    );
    expect(Object.values(r.scores)).toEqual([0, 0, 0, 0]);
  });

  it("S24-AC11: Share or Snatch can't start with one team", () => {
    const m: Machine = { game: snatch, content: snatch.content.parse({}) };
    expect(m.game.minTeams).toBe(2);
    const s: Session = startSession(m, {
      id: "x",
      gameId: "g",
      type: "snatch",
      title: "S",
      teams: playtestTeams(2),
      seed: 1,
      now: T0,
    });
    expect(next(m, s, T0).ok).toBe(true);
  });
});
