import { z } from "zod";
import { dealFormation, FLYBY_ROUNDS } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { answered, answerWindow, lockIn, windowView, type AnswerWindow } from "./answer";
import { countCloseness } from "@/lib/games";
import { closePoints } from "./scoring";

/**
 * Fly-by Count (spec 25, S25-AC1): presents fly across the TV in a gappy
 * grid; teams count them and lock in a number. Round 1 counts them all; later
 * rounds mix red, white and green presents and ask about one kind only once
 * they've flown past (Khai, 2026-11-24: Color Count merged in). Exact 100,
 * one off 50.
 */
const Round = z
  .object({
    min: z.number().int().min(1).max(60),
    max: z.number().int().min(1).max(60),
    ms: z.number().int().min(1000).max(15_000),
    cols: z.number().int().min(2).max(16),
    rows: z.number().int().min(1).max(6),
    /** Kinds of present (1 to 3); with more than one, it asks about one kind. */
    kinds: z.number().int().min(1).max(3).default(1),
  })
  .refine((r) => r.min <= r.max, "min must not be above max")
  .refine((r) => r.cols * r.rows >= r.max, "the grid needs a square for every present");

export { FLYBY_ROUNDS };

const Content = z.object({ rounds: z.array(Round).min(1).max(10).default(FLYBY_ROUNDS) });

export type FlybyState = AnswerWindow & {
  /** The answer: how many presents, or how many of the kind asked about. */
  count: number;
  /** The kind it asks about (an index into PRESENT_KINDS), or null for all of them. */
  ask: number | null;
  cols: number;
  rows: number;
  /** [row, col, kind] of each present. */
  cells: [number, number, number][];
  /** How far each row is shifted, in squares, so rows don't line up. */
  offsets: number[];
  flyMs: number;
};

type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: FlybyState, _c: unknown, { role, revealed, now }: ViewCtx) {
  return {
    ...windowView(s, role, revealed),
    // Only the TV draws the presents; phones never get the layout (S24-AC7).
    fly:
      role.kind === "tv"
        ? { cols: s.cols, rows: s.rows, cells: s.cells, offsets: s.offsets, ms: s.flyMs }
        : null,
    /** Whether it asks about one kind: known from the start, so teams know to watch the kinds. */
    byKind: s.ask !== null,
    // Which kind only once they've flown past, so teams can't count just that one.
    ask: revealed || now >= s.showEndsAt ? s.ask : null,
    count: revealed ? s.count : null,
  };
}

const game: ShowdownGame<z.infer<typeof Content>, FlybyState> = {
  content: Content,
  demo: "Count the presents as they fly past!",
  timeout: "Out of time? What's on your phone goes in.",
  rounds: (c) => c.rounds.length,
  deal(c, { seed, round, startsAt, teams, prev }) {
    const r = c.rounds[round - 1] ?? c.rounds[c.rounds.length - 1] ?? FLYBY_ROUNDS[0];
    if (!r) throw new Error("no rounds");
    // Never the same answer as the round before (Khai, 2026-11-24).
    const { count, ask, cols, rows, cells, offsets } = dealFormation(seed, r, prev?.count ?? null);
    return {
      ...answerWindow(startsAt, r.ms, teams),
      count,
      ask,
      cols,
      rows,
      cells,
      offsets,
      flyMs: r.ms,
    };
  },
  move: (s, _c, { teamId, move, now }) => lockIn(s, teamId, move, now, { min: 0, max: 99 }),
  tick: (s) => s,
  over: (s, _c, now) => answered(s, now),
  score: (s, c, teams) =>
    Object.fromEntries(
      teams.map((t) => {
        const a = s.answers[t];
        return [
          t,
          closePoints(a === undefined ? null : countCloseness(a, s.count), c.rounds.length),
        ];
      }),
    ),
  view,
};

export const flyby = defineShowdown(game);
export type FlybyView = ReturnType<typeof view>;
