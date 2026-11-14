import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { solveAndSpeedShare } from "../speed";
import { Media } from "../trivia/content";
import { checkPath, makePuzzle } from "./puzzle";

/** Pathfinder (spec 16): our own path puzzle, for any event; a new one every play. */
export const TrailContent = z
  .object({
    size: z.number().int().min(4).max(8).optional(),
    checkpoints: z.number().int().min(2).max(16).optional(),
    /**
     * A picture that stands on 1 and walks the trail, turning to face each
     * step (Khai, 2026-11-14: Danny at the holiday party). `intro` opens the
     * instructions.
     */
    runner: Media.extend({
      name: z.string().min(1).max(30),
      intro: z.string().min(1).max(80).optional(),
    })
      .strict()
      .optional(),
  })
  .strict()
  .refine((c) => (c.checkpoints ?? 8) <= (c.size ?? 7) * (c.size ?? 7), {
    message: "checkpoints can't be more than the squares.",
  });
export type TrailContent = z.infer<typeof TrailContent>;

const size = (c: TrailContent) => c.size ?? 7;
const count = (c: TrailContent) => c.checkpoints ?? 8;

/** All the speed points within this; none at SLOW_MS (S16-AC4). Harder than the first cut. */
export const FAST_MS = 15_000;
export const SLOW_MS = 90_000;

export type TrailState = {
  size: number;
  dots: number[];
  startedAt: number;
  phase: "playing" | "solved" | "timeout";
  tookMs: number | null;
  step: number;
};

export type TrailView =
  | { kind: "playing"; size: number; dots: number[]; elapsedMs: number; runner?: Media }
  | { kind: "done"; solved: boolean; tookMs: number | null; size: number; dots: number[] };

const Move = z.object({
  type: z.literal("solve"),
  path: z.array(z.number().int().nonnegative()).max(64),
});

const fail = (message: string): MoveResult<TrailState> => ({ ok: false, message });

/** Half the points for solving, and up to half more for speed. */
export const trailShare = (tookMs: number): number => solveAndSpeedShare(tookMs, FAST_MS, SLOW_MS);

export const trail: GameLogic<TrailContent, TrailState, TrailView> = {
  content: TrailContent,
  instructions: (c) => ({
    title: "How to play",
    lines: c.runner
      ? [
          c.runner.intro ?? `Help ${c.runner.name} hit every number!`,
          `Drag ${c.runner.name} from 1 around the board, through every square once.`,
          "Hit the numbers in order and they turn green. Skip one and it turns red. Drag back to undo.",
          "Solving it scores half the points. Solving it fast scores the rest.",
        ]
      : [
          "Draw one trail from 1 to the last number, through every square.",
          "Pass the numbers in order. Drag back to undo.",
          "Solving it scores half the points. Solving it fast scores the rest.",
        ],
  }),
  create(c, seed, { now }) {
    const { dots } = makePuzzle(size(c), count(c), seed);
    return { size: size(c), dots, startedAt: now, phase: "playing", tookMs: null, step: 0 };
  },
  // No time limit (Khai, 2026-11-10): the clock only counts for the speed points.
  tick: (s) => s,
  view: (s, c, { now }) =>
    s.phase === "playing"
      ? {
          kind: "playing",
          size: s.size,
          dots: s.dots,
          elapsedMs: Math.max(0, now - s.startedAt),
          ...(c.runner ? { runner: { src: c.runner.src, alt: c.runner.alt } } : {}),
        }
      : {
          kind: "done",
          solved: s.phase === "solved",
          tookMs: s.tookMs,
          size: s.size,
          dots: s.dots,
        },
  move(s, _c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    if (s.phase !== "playing") return fail("This puzzle is over.");
    const why = checkPath({ size: s.size, dots: s.dots }, parsed.data.path);
    if (why) return fail(why);
    return {
      ok: true,
      state: { ...s, phase: "solved", tookMs: now - s.startedAt, step: s.step + 1 },
    };
  },
  isOver: (s) => s.phase !== "playing",
  score: (s, points) => (s.tookMs === null ? 0 : Math.round(points * trailShare(s.tookMs))),
  step: (s) => s.step,
};
