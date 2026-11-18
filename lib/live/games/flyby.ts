import { z } from "zod";
import { seededRandom, shuffled } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { answered, answerWindow, lockIn, windowView, type AnswerWindow } from "./answer";
import { nearPoints } from "./scoring";

/**
 * Fly-by Count (spec 25, S25-AC1): presents fly across the TV in a gappy
 * grid; teams count them and lock in a number. Exact 100, one off 50.
 */
const Round = z
  .object({
    min: z.number().int().min(1).max(60),
    max: z.number().int().min(1).max(60),
    ms: z.number().int().min(1000).max(15_000),
    cols: z.number().int().min(2).max(16),
    rows: z.number().int().min(1).max(6),
  })
  .refine((r) => r.min <= r.max, "min must not be above max")
  .refine((r) => r.cols * r.rows >= r.max, "the grid needs a square for every present");

export const FLYBY_ROUNDS = [
  { min: 6, max: 12, ms: 4000, cols: 6, rows: 3 },
  { min: 10, max: 18, ms: 3500, cols: 8, rows: 3 },
  { min: 15, max: 25, ms: 3000, cols: 10, rows: 4 },
];

const Content = z.object({ rounds: z.array(Round).min(1).max(10).default(FLYBY_ROUNDS) });

export type FlybyState = AnswerWindow & {
  count: number;
  cols: number;
  rows: number;
  /** [row, col] of each present. */
  cells: [number, number][];
  /** How far each row is shifted, in squares, so rows don't line up. */
  offsets: number[];
  flyMs: number;
};

type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: FlybyState, _c: unknown, { role, revealed }: ViewCtx) {
  return {
    ...windowView(s, role, revealed),
    // Only the TV draws the presents; phones never get the layout (S24-AC7).
    fly:
      role.kind === "tv"
        ? { cols: s.cols, rows: s.rows, cells: s.cells, offsets: s.offsets, ms: s.flyMs }
        : null,
    count: revealed ? s.count : null,
  };
}

const game: ShowdownGame<z.infer<typeof Content>, FlybyState> = {
  content: Content,
  demo: "Count the presents as they fly past. Exactly right scores 100, one off scores 50.",
  rounds: (c) => c.rounds.length,
  deal(c, { seed, round, startsAt, teams }) {
    const r = c.rounds[round - 1] ?? c.rounds[c.rounds.length - 1] ?? FLYBY_ROUNDS[0];
    if (!r) throw new Error("no rounds");
    const random = seededRandom(seed);
    const count = r.min + Math.floor(random() * (r.max - r.min + 1));
    const all: [number, number][] = [];
    for (let row = 0; row < r.rows; row++)
      for (let col = 0; col < r.cols; col++) all.push([row, col]);
    const cells = shuffled(all, random)
      .slice(0, count)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const offsets = Array.from({ length: r.rows }, () => (random() < 0.5 ? 0 : 0.5));
    return {
      ...answerWindow(startsAt, r.ms, teams),
      count,
      cols: r.cols,
      rows: r.rows,
      cells,
      offsets,
      flyMs: r.ms,
    };
  },
  move: (s, _c, { teamId, move, now }) => lockIn(s, teamId, move, now, { min: 0, max: 99 }),
  tick: (s) => s,
  over: (s, _c, now) => answered(s, now),
  score: (s, _c, teams) =>
    Object.fromEntries(teams.map((t) => [t, nearPoints(s.answers[t], s.count)])),
  view,
};

export const flyby = defineShowdown(game);
export type FlybyView = ReturnType<typeof view>;
