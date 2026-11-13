import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { Media } from "../trivia/content";

/** Guessing Jar (spec 17): one guess; points come when the host enters the real count. */
export const JarContent = z
  .object({ prompt: z.string().min(1).max(200).optional(), image: Media.optional() })
  .strict();
export type JarContent = z.infer<typeof JarContent>;

const prompt = (c: JarContent) => c.prompt ?? "How many candies are in the jar?";
export const MAX_GUESS = 1_000_000;

export type JarState = {
  guess: number | null;
  /** Set when the host scores the jar. */
  actual: number | null;
  points: number | null;
  step: number;
};

export type JarView =
  | { kind: "guess"; prompt: string; image?: Media }
  | { kind: "done"; prompt: string; guess: number; actual: number | null; points: number | null };

const Move = z.object({
  type: z.literal("guess"),
  value: z.number().int().min(0).max(MAX_GUESS),
});

const fail = (message: string): MoveResult<JarState> => ({ ok: false, message });

/** Everyone who guessed gets at least this share (Khai, 2026-11-13). */
export const JAR_FLOOR = 0.33;

/**
 * The share of points for a guess: all when exact, 2 points fewer per 1% off
 * (at 100 points), never below a third (S17-AC3).
 */
export function jarShare(guess: number, actual: number): number {
  const pctOff = actual === 0 ? (guess === 0 ? 0 : 100) : (Math.abs(guess - actual) / actual) * 100;
  return Math.max(JAR_FLOOR, 1 - pctOff / 50);
}

export const jar: GameLogic<JarContent, JarState, JarView> = {
  content: JarContent,
  once: true,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      prompt(c),
      "You get just one guess, so make it count.",
      "Points come when the host reveals the real count: the closer, the more.",
    ],
  }),
  create: () => ({ guess: null, actual: null, points: null, step: 0 }),
  tick: (s) => s,
  view: (s, c) =>
    s.guess === null
      ? { kind: "guess", prompt: prompt(c), ...(c.image ? { image: c.image } : {}) }
      : { kind: "done", prompt: prompt(c), guess: s.guess, actual: s.actual, points: s.points },
  move(s, _c, raw) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("Enter a whole number.");
    if (s.guess !== null) return fail("You've already guessed.");
    return { ok: true, state: { ...s, guess: parsed.data.value, step: s.step + 1 } };
  },
  isOver: (s) => s.guess !== null,
  waiting: (s) => s.guess !== null && s.points === null,
  score: (s) => s.points ?? 0,
  step: (s) => s.step,
};
