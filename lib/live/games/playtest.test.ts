import { describe, expect, it } from "vitest";
import type { AnyShowdown, Role } from "../model";
import { PLAYTEST_TEAM_COUNTS, playtest, type Bot, type BotContext } from "../playtest";
import { blindstop, EXACT_BONUS } from "./blindstop";
import { colorcount } from "./colorcount";
import { flyby } from "./flyby";
import { lastsecond } from "./lastsecond";
import { snowsum } from "./snowsum";

/**
 * Mock play tests (S24-AC8) for the count and stop showdowns (spec 25):
 * whole games played by bot teams in every scenario, checking each game
 * ends, scores stay within its rules, nothing secret leaks, and the bots
 * that play well never lose to the ones that don't.
 */

type Game = {
  startsAt: number;
  showEndsAt?: number;
  closesAt?: number;
  mine?: unknown;
  stopped?: boolean;
};
const g = (ctx: BotContext) => ctx.view.game as Game | null;

// ---- Bots for the counting games: each reads the truth from `peek` only when it's "perfect".
type Truth = (peek: unknown) => number;

const countBots = (truth: Truth, max: number) => ({
  perfect: (ctx: BotContext) => {
    const v = g(ctx);
    return v?.showEndsAt !== undefined && ctx.now >= v.showEndsAt + 400 && v.mine === null
      ? { answer: truth(ctx.peek) }
      : null;
  },
  random: (ctx: BotContext) => {
    const v = g(ctx);
    return v?.showEndsAt !== undefined && ctx.now >= v.showEndsAt + 2000 && v.mine === null
      ? { answer: Math.floor(ctx.random() * (max + 1)) }
      : null;
  },
  // Takes its time and lands close.
  cautious: (ctx: BotContext) => {
    const v = g(ctx);
    return v?.closesAt !== undefined && ctx.now >= v.closesAt - 1500 && v.mine === null
      ? { answer: truth(ctx.peek) + (ctx.random() < 0.5 ? 1 : 0) }
      : null;
  },
  // Answers before the show is over (turned down), then guesses wildly.
  reckless: (ctx: BotContext) => {
    const v = g(ctx);
    return v && v.mine === null && ctx.now >= v.startsAt
      ? { answer: Math.floor(ctx.random() * (max + 1)) }
      : null;
  },
  // Only answers once the window has shut.
  late: (ctx: BotContext) => {
    const v = g(ctx);
    return v?.closesAt !== undefined && ctx.now > v.closesAt && v.mine === null
      ? { answer: truth(ctx.peek) }
      : null;
  },
});

// ---- Bots for the stop games: they stop at a chosen time from the shared start.
const stopAt =
  (pick: (ctx: BotContext) => number) =>
  (ctx: BotContext): unknown => {
    const v = g(ctx);
    if (!v || v.stopped === true || (v.mine !== undefined && v.mine !== null)) return null;
    const elapsed = ctx.now - v.startsAt;
    return elapsed >= pick(ctx) ? { elapsedMs: elapsed } : null;
  };

const SCENARIOS = [
  "perfect",
  "random",
  "cautious",
  "reckless",
  "late",
  "silent",
  "dropout",
] as const;
type Scenario = (typeof SCENARIOS)[number];

const OTHERS = SCENARIOS.filter((k) => k !== "perfect");

/**
 * Team 1 plays perfectly; the others take the other scenarios in turn,
 * shifted by `shift` so every scenario gets a team across a few runs. The
 * drop-out team plays perfectly, then quits from round 2.
 */
function lineup(bots: Record<string, Bot>, n: number, shift: number) {
  const kinds: Scenario[] = Array.from({ length: n }, (_, i) =>
    i === 0 ? "perfect" : (OTHERS[(i - 1 + shift) % OTHERS.length] ?? "silent"),
  );
  return {
    kinds,
    bots: (i: number): Bot | null => {
      const kind = kinds[i] ?? "silent";
      if (kind === "silent") return null;
      return (kind === "dropout" ? bots.perfect : bots[kind]) ?? null;
    },
    dropOutFrom: Object.fromEntries(
      kinds.flatMap((k, i) => (k === "dropout" ? [[i, 2] as const] : [])),
    ),
  };
}

const secretKeys = ["answers", "stops", "count", "total", "truth"];
const tvOnly = ["fly", "flakes", "flashes"];

/** Nothing secret in a view before the reveal (S24-AC7). */
function leakCheck(view: unknown, _state: unknown, role: Role): string | null {
  const v = (view ?? {}) as Record<string, unknown>;
  for (const k of secretKeys)
    if (v[k] !== null && v[k] !== undefined) return `${k} before the reveal`;
  if (role.kind !== "tv")
    for (const k of tvOnly) if (v[k] !== null && v[k] !== undefined) return `${k} on a phone`;
  return null;
}

type Case = {
  name: string;
  game: AnyShowdown;
  bots: Record<string, Bot>;
  /** Points a team can get in one round. */
  allowed: number[];
  stepMs?: number;
};

const ranked = [0, 10, 30, 50, 70, 100];
const flybyTruth: Truth = (p) => (p as { count: number }).count;
const snowTruth: Truth = (p) => (p as { total: number }).total;
const colorTruth: Truth = (p) => (p as { truth: number }).truth;

const CASES: Case[] = [
  { name: "Fly-by Count", game: flyby, bots: countBots(flybyTruth, 30), allowed: [0, 50, 100] },
  { name: "Snow Sum", game: snowsum, bots: countBots(snowTruth, 60), allowed: [0, 50, 100] },
  { name: "Color Count", game: colorcount, bots: countBots(colorTruth, 20), allowed: ranked },
  {
    name: "Blind Stop",
    game: blindstop,
    stepMs: 10,
    allowed: [...ranked, ...ranked.filter((p) => p > 0).map((p) => p + EXACT_BONUS)],
    bots: {
      perfect: stopAt(() => 10_000),
      random: stopAt((ctx) => 2000 + ctx.random() * 16_000),
      cautious: stopAt(() => 9_500),
      reckless: stopAt(() => 0),
      late: stopAt(() => 25_000),
    },
  },
  {
    name: "Last Second",
    game: lastsecond,
    stepMs: 10,
    allowed: ranked,
    bots: {
      perfect: stopAt(() => 9_980),
      random: stopAt((ctx) => ctx.random() * 12_000),
      cautious: stopAt(() => 6_000),
      reckless: stopAt(() => 9_999 + 50),
      late: stopAt(() => 11_000),
    },
  },
];

describe("spec 25 play tests (S24-AC8)", () => {
  for (const c of CASES) {
    it(`S24-AC8: ${c.name} plays whole games with 1 to 6 teams of every kind: ends, scores within its rules, leaks nothing`, () => {
      const seen = new Set<string>();
      for (const n of PLAYTEST_TEAM_COUNTS) {
        for (const seed of [0, 1, 2, 3, 4, 5]) {
          const { kinds, ...line } = lineup(c.bots, n, seed);
          const result = playtest(
            c.game,
            {},
            {
              teams: n,
              seed: seed * 31 + n,
              stepMs: c.stepMs ?? 100,
              roundCapMs: 40_000,
              leakCheck,
              ...line,
            },
          );
          expect(result.ended).toBe(true);
          expect(result.leaks).toEqual([]);
          expect(result.rounds.length).toBe(c.game.rounds(c.game.content.parse({}), n));
          for (const round of result.rounds) {
            expect(Object.keys(round).sort()).toEqual(
              Array.from({ length: n }, (_, i) => `t${String(i + 1)}`).sort(),
            );
            for (const p of Object.values(round)) expect(c.allowed).toContain(p);
          }
          // The perfect team (t1) is never turned down and never loses to anyone.
          expect(result.rejected.filter((r) => r.teamId === "t1")).toEqual([]);
          const best = Math.max(...Object.values(result.scores));
          expect(result.scores.t1).toBe(best);
          // A silent team never scores; a team that drops out scores nothing after it leaves.
          kinds.forEach((k, i) => {
            const id = `t${String(i + 1)}`;
            if (k === "silent") expect(result.scores[id]).toBe(0);
            if (k === "dropout") for (const r of result.rounds.slice(1)) expect(r[id]).toBe(0);
          });
          for (const k of kinds) seen.add(k);
        }
      }
      expect([...seen].sort()).toEqual([...SCENARIOS].sort());
    });

    it(`S24-AC8: ${c.name} with every team playing perfectly ties them all`, () => {
      const result = playtest(
        c.game,
        {},
        {
          teams: 4,
          seed: 9,
          stepMs: c.stepMs ?? 100,
          bots: () => c.bots.perfect ?? null,
          leakCheck,
        },
      );
      const scores = Object.values(result.scores);
      expect(new Set(scores).size).toBe(1);
      expect(scores[0]).toBeGreaterThan(0);
    });
  }
});
