import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { seededRandom } from "../random";

/** Secret Word (spec 19): guess a five-letter word in a few tries. */
const Word = z
  .string()
  .regex(/^[A-Za-z]{5}$/, "Use a word of exactly five letters.")
  .transform((w) => w.toUpperCase());
export const WordContent = z
  .object({
    answers: z.array(Word).min(1).max(500),
    maxGuesses: z.number().int().min(3).max(8).optional(),
  })
  .strict();
export type WordContent = z.infer<typeof WordContent>;

export const LENGTH = 5;
const tries = (c: WordContent) => c.maxGuesses ?? 6;

export type Mark = "correct" | "present" | "absent";
export type WordState = {
  answer: string;
  guesses: string[];
  /** The last guess turned away as not a word, so the phone can say so. */
  rejected: string | null;
  maxGuesses: number;
  step: number;
};
export type WordRow = { word: string; marks: Mark[] };
export type WordView =
  | { kind: "guessing"; rows: WordRow[]; maxGuesses: number; rejected: string | null }
  | {
      kind: "done";
      rows: WordRow[];
      maxGuesses: number;
      solved: boolean;
      /** Kept back when the event is replayable and the word wasn't found (S19-AC4). */
      answer: string | null;
    };

/** Marks a guess the standard way: right spots first, then "present" as often as the answer still holds the letter. */
export function marksFor(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array.from({ length: guess.length }, () => "absent");
  const left = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    const a = answer[i] as string;
    if (guess[i] === a) marks[i] = "correct";
    else left.set(a, (left.get(a) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    const g = guess[i] as string;
    if (marks[i] === "correct") continue;
    const n = left.get(g) ?? 0;
    if (n > 0) {
      marks[i] = "present";
      left.set(g, n - 1);
    }
  }
  return marks;
}

/** The share of points by guesses taken (S19-AC4). */
export const wordShare = (guesses: number, solved: boolean): number =>
  !solved ? 0 : guesses <= 2 ? 1 : ({ 3: 0.9, 4: 0.75, 5: 0.6, 6: 0.45 }[guesses] ?? 0.3);

const solved = (s: WordState) => s.guesses.at(-1) === s.answer;
const over = (s: WordState) => solved(s) || s.guesses.length >= s.maxGuesses;
const rows = (s: WordState): WordRow[] =>
  s.guesses.map((word) => ({ word, marks: marksFor(word, s.answer) }));

const Move = z.object({ type: z.literal("guess"), word: z.string().max(10) });
const fail = (message: string): MoveResult<WordState> => ({ ok: false, message });

export const word: GameLogic<WordContent, WordState, WordView> = {
  content: WordContent,
  // Nothing about the theme: the answers are a surprise (Khai, 2026-11-13).
  instructions: (c) => ({
    title: "How to play",
    lines: [
      `Guess the secret ${String(LENGTH)}-letter word in ${String(tries(c))} tries.`,
      "Each guess must be a real word.",
      "Gold: right letter, right spot. White with a red corner: in the word, wrong spot. Dark: not in the word.",
      "The fewer guesses, the more points.",
    ],
  }),
  create: (c, seed) => {
    const answers = c.answers;
    return {
      answer: answers[Math.floor(seededRandom(seed)() * answers.length)] ?? answers[0] ?? "",
      guesses: [],
      rejected: null,
      maxGuesses: tries(c),
      step: 0,
    };
  },
  tick: (s) => s,
  view: (s, _c, { replayable }) =>
    over(s)
      ? {
          kind: "done",
          rows: rows(s),
          maxGuesses: s.maxGuesses,
          solved: solved(s),
          answer: solved(s) || replayable !== true ? s.answer : null,
        }
      : { kind: "guessing", rows: rows(s), maxGuesses: s.maxGuesses, rejected: s.rejected },
  move(s, c, raw, { isWord }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("Type a word first.");
    if (over(s)) return fail("This round is over.");
    const guess = parsed.data.word.toUpperCase();
    if (!/^[A-Z]+$/.test(guess) || guess.length !== LENGTH)
      return fail(`Guesses have ${String(LENGTH)} letters.`);
    // Not a word: turned away without using a try (S19-AC2).
    const known = c.answers.includes(guess) || (isWord ? isWord(guess) : true);
    if (!known) return { ok: true, state: { ...s, rejected: guess, step: s.step + 1 } };
    return {
      ok: true,
      state: { ...s, guesses: [...s.guesses, guess], rejected: null, step: s.step + 1 },
    };
  },
  isOver: over,
  score: (s, points) => Math.round(points * wordShare(s.guesses.length, solved(s))),
  step: (s) => s.step,
};
