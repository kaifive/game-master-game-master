import { z } from "zod";
import {
  dealFlakes,
  SNOW_MAX,
  SNOW_MIN,
  SNOW_OPS,
  SNOW_ROUNDS,
  sum,
  type Flake,
} from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { answered, answerWindow, lockIn, windowView, type AnswerWindow } from "./answer";
import { nearPoints } from "./scoring";

/**
 * Snow Sum (spec 25, S25-AC2): snowflakes marked +3, −2 or ×2 fall one at a
 * time from 0; teams keep the running total in their heads and lock it in.
 * Exact 100, one off 50.
 */
export {
  apply,
  dealFlakes,
  runningTotals,
  SNOW_MAX,
  SNOW_MIN,
  SNOW_OPS,
  SNOW_ROUNDS,
  sum,
} from "@/lib/games";
export type { Flake, SnowOp } from "@/lib/games";

const Round = z.object({
  flakes: z.number().int().min(2).max(15),
  ops: z.array(z.enum(SNOW_OPS)).min(1),
});

const Content = z.object({
  rounds: z.array(Round).min(1).max(10).default(SNOW_ROUNDS),
  /** How long each snowflake takes to fall. */
  flakeMs: z.number().int().min(600).max(4000).default(1400),
});

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
  demo: "Start at 0 and do each snowflake in order: + adds, − takes away, ×2 doubles. Exactly right scores 100, one off scores 50.",
  timeout: "Out of time? No answer scores 0.",
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
