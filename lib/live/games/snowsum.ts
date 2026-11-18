import { z } from "zod";
import { seededRandom } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { answered, answerWindow, lockIn, windowView, type AnswerWindow } from "./answer";
import { nearPoints } from "./scoring";

/**
 * Snow Sum (spec 25, S25-AC2): snowflakes marked +3, −2 or ×2 fall one at a
 * time from 0; teams keep the running total in their heads and lock it in.
 * Exact 100, one off 50.
 */
export const SNOW_OPS = ["add", "sub", "double"] as const;
export type SnowOp = (typeof SNOW_OPS)[number];
export type Flake = { op: SnowOp; n: number };

/** Totals never leave this range (spec 25). */
export const SNOW_MIN = -50;
export const SNOW_MAX = 200;

const Round = z.object({
  flakes: z.number().int().min(2).max(15),
  ops: z.array(z.enum(SNOW_OPS)).min(1),
});

export const SNOW_ROUNDS = [
  { flakes: 5, ops: ["add", "sub"] as SnowOp[] },
  { flakes: 7, ops: ["add", "sub"] as SnowOp[] },
  { flakes: 8, ops: ["add", "sub", "double"] as SnowOp[] },
];

const Content = z.object({
  rounds: z.array(Round).min(1).max(10).default(SNOW_ROUNDS),
  /** How long each snowflake takes to fall. */
  flakeMs: z.number().int().min(600).max(4000).default(1400),
});

export const apply = (total: number, f: Flake) =>
  f.op === "add" ? total + f.n : f.op === "sub" ? total - f.n : total * 2;

/** The flakes for one round, from the seed, keeping every running total in range. */
export function dealFlakes(seed: number, flakes: number, ops: readonly SnowOp[]): Flake[] {
  const random = seededRandom(seed);
  const out: Flake[] = [];
  let total = 0;
  for (let i = 0; i < flakes; i++) {
    // Doubling 0 or a negative is no fun to count; doubling twice running is too hard.
    const allowed = ops.filter(
      (op) =>
        op !== "double" ||
        (total > 0 && total * 2 <= SNOW_MAX && out[out.length - 1]?.op !== "double"),
    );
    const pick = (list: readonly SnowOp[]): SnowOp =>
      list[Math.floor(random() * list.length)] ?? "add";
    // Taking away from nothing is no fun to count, so at 0 or below it adds.
    let op = total <= 0 ? "add" : pick(allowed.length > 0 ? allowed : ["add"]);
    let n =
      op === "add" ? 1 + Math.floor(random() * 9) : op === "sub" ? 1 + Math.floor(random() * 5) : 2;
    if (apply(total, { op, n }) < SNOW_MIN) op = "add";
    if (apply(total, { op, n }) > SNOW_MAX) op = "sub";
    if (op === "double") n = 2;
    out.push({ op, n });
    total = apply(total, { op, n });
  }
  return out;
}

export const sum = (flakes: readonly Flake[]) => flakes.reduce(apply, 0);

/** The total after each flake, for the reveal. */
export const runningTotals = (flakes: readonly Flake[]): number[] =>
  flakes.reduce<number[]>((acc, f) => [...acc, apply(acc[acc.length - 1] ?? 0, f)], []);

export type SnowState = AnswerWindow & { flakes: Flake[]; total: number; flakeMs: number };

type C = z.infer<typeof Content>;

type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: SnowState, _c: unknown, { role, revealed }: ViewCtx) {
  return {
    ...windowView(s, role, revealed),
    // The TV shows the flakes as they fall; phones never get them (S24-AC7).
    flakes: role.kind === "tv" ? s.flakes : null,
    flakeMs: s.flakeMs,
    total: revealed ? s.total : null,
  };
}

const game: ShowdownGame<C, SnowState> = {
  content: Content,
  demo: "Add up the snowflakes as they fall, starting from 0. Exactly right scores 100, one off scores 50.",
  rounds: (c) => c.rounds.length,
  deal(c, { seed, round, startsAt, teams }) {
    const r = c.rounds[round - 1] ?? c.rounds[c.rounds.length - 1] ?? SNOW_ROUNDS[0];
    if (!r) throw new Error("no rounds");
    const flakes = dealFlakes(seed, r.flakes, r.ops);
    return {
      ...answerWindow(startsAt, flakes.length * c.flakeMs, teams),
      flakes,
      total: sum(flakes),
      flakeMs: c.flakeMs,
    };
  },
  move: (s, _c, { teamId, move, now }) =>
    lockIn(s, teamId, move, now, { min: SNOW_MIN, max: SNOW_MAX }),
  tick: (s) => s,
  over: (s, _c, now) => answered(s, now),
  score: (s, _c, teams) =>
    Object.fromEntries(teams.map((t) => [t, nearPoints(s.answers[t], s.total)])),
  view,
};

export const snowsum = defineShowdown(game);
export type SnowView = ReturnType<typeof view>;
