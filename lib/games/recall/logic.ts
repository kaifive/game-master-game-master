import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { seededRandom, shuffled } from "../random";

/** Rapid Recall (spec 16): remember which squares lit up, three rounds, each harder. */
const Round = z
  .object({ size: z.number().int().min(2).max(8), lit: z.number().int().min(1) })
  .refine((r) => r.lit < r.size * r.size, { message: "lit must leave some squares dark." });
export const RecallContent = z
  .object({
    rounds: z.array(Round).min(1).max(8).optional(),
    showMs: z.number().int().min(500).max(5000).optional(),
  })
  .strict();
export type RecallContent = z.infer<typeof RecallContent>;

/** Harder than the first cut (Khai: too easy). */
export const DEFAULT_ROUNDS = [
  { size: 4, lit: 5 },
  { size: 5, lit: 8 },
  { size: 6, lit: 11 },
];
const roundsOf = (c: RecallContent) => c.rounds ?? DEFAULT_ROUNDS;
const showMs = (c: RecallContent) => c.showMs ?? 1200;

export type RecallState = {
  rounds: { size: number; lit: number[] }[];
  /** Squares found per round played. */
  found: number[];
  index: number;
  step: number;
};

export type RecallView =
  | {
      kind: "round";
      number: number;
      total: number;
      size: number;
      /** Shown for showMs, then hidden by the phone. */
      lit: number[];
      showMs: number;
      found: number;
      seen: number;
    }
  | { kind: "done"; found: number; total: number; rounds: { found: number; of: number }[] };

const Move = z.object({
  type: z.literal("pick"),
  round: z.number().int().nonnegative(),
  cells: z.array(z.number().int().nonnegative()).max(64),
});

const fail = (message: string): MoveResult<RecallState> => ({ ok: false, message });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const recall: GameLogic<RecallContent, RecallState, RecallView> = {
  content: RecallContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      "Some squares light up for a moment, then go dark.",
      "Tap the squares that were lit.",
      `${String(roundsOf(c).length)} rounds, and each one is bigger.`,
      "Every square you remember scores.",
    ],
  }),
  create(c, seed) {
    const random = seededRandom(seed);
    return {
      rounds: roundsOf(c).map((r) => ({
        size: r.size,
        lit: shuffled(
          Array.from({ length: r.size * r.size }, (_, i) => i),
          random,
        )
          .slice(0, r.lit)
          .sort((a, b) => a - b),
      })),
      found: [],
      index: 0,
      step: 0,
    };
  },
  tick: (s) => s,
  view(s, c) {
    const seen = sum(s.rounds.slice(0, s.index).map((r) => r.lit.length));
    const round = s.rounds[s.index];
    if (!round)
      return {
        kind: "done",
        found: sum(s.found),
        total: sum(s.rounds.map((r) => r.lit.length)),
        rounds: s.rounds.map((r, i) => ({ found: s.found[i] ?? 0, of: r.lit.length })),
      };
    return {
      kind: "round",
      number: s.index + 1,
      total: s.rounds.length,
      size: round.size,
      lit: round.lit,
      showMs: showMs(c),
      found: sum(s.found),
      seen,
    };
  },
  move(s, _c, raw) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    const round = s.rounds[s.index];
    if (!round) return fail("The game is over.");
    if (parsed.data.round !== s.index + 1) return fail("That round is over.");
    const cells = new Set(parsed.data.cells);
    if (cells.size !== parsed.data.cells.length || cells.size !== round.lit.length)
      return fail(`Pick ${String(round.lit.length)} different squares.`);
    if ([...cells].some((c) => c >= round.size * round.size))
      return fail("Pick squares on the grid.");
    const found = round.lit.filter((c) => cells.has(c)).length;
    return {
      ok: true,
      state: { ...s, found: [...s.found, found], index: s.index + 1, step: s.step + 1 },
    };
  },
  isOver: (s) => s.index >= s.rounds.length,
  score: (s, points) =>
    Math.round((points * sum(s.found)) / Math.max(1, sum(s.rounds.map((r) => r.lit.length)))),
  step: (s) => s.step,
};
