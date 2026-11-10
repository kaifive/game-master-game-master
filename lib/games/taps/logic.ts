import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/** Tap Masher (spec 16): as many taps as you can in a few seconds. */
export const TapsContent = z
  .object({
    seconds: z.number().int().min(2).max(30).optional(),
    target: z.number().int().min(5).max(500).optional(),
  })
  .strict();
export type TapsContent = z.infer<typeof TapsContent>;

const seconds = (c: TapsContent) => c.seconds ?? 5;
const goal = (c: TapsContent) => c.target ?? 50;

/** The countdown before tapping starts. */
export const COUNTDOWN_MS = 3000;
/** Faster than this isn't a person (S16-AC3). */
export const MAX_TAPS_PER_SECOND = 20;
/** How early a finish may arrive (clocks and network). */
export const EARLY_SLACK_MS = 1000;
/** A run never finished by then times out with no taps. */
export const TIMEOUT_MS = 15_000;

export type TapsState = {
  phase: "ready" | "running" | "done";
  /** When tapping starts: after the countdown. */
  goAt: number | null;
  taps: number;
  seconds: number;
  target: number;
  step: number;
};

export type TapsView =
  | { kind: "ready"; seconds: number; target: number }
  | { kind: "running"; seconds: number; goInMs: number }
  | { kind: "done"; taps: number; target: number };

const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("finish"), taps: z.number().int().nonnegative() }),
]);

const fail = (message: string): MoveResult<TapsState> => ({ ok: false, message });

export const taps: GameLogic<TapsContent, TapsState, TapsView> = {
  content: TapsContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      "A countdown starts as soon as you close this box.",
      `Then tap the big button as fast as you can for ${String(seconds(c))} seconds.`,
      "The more taps, the more points.",
    ],
  }),
  // The countdown starts with the game: no second Start button.
  create: (c, _seed, { now }) => ({
    phase: "running",
    goAt: now + COUNTDOWN_MS,
    taps: 0,
    seconds: seconds(c),
    target: goal(c),
    step: 0,
  }),
  tick(s, _c, { now }) {
    if (s.phase !== "running" || s.goAt === null) return s;
    if (now <= s.goAt + s.seconds * 1000 + TIMEOUT_MS) return s;
    return { ...s, phase: "done", step: s.step + 1 };
  },
  view(s, _c, { now }) {
    if (s.phase === "ready") return { kind: "ready", seconds: s.seconds, target: s.target };
    if (s.phase === "running")
      return { kind: "running", seconds: s.seconds, goInMs: (s.goAt ?? now) - now };
    return { kind: "done", taps: s.taps, target: s.target };
  },
  move(s, _c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    if (parsed.data.type === "start") {
      if (s.phase !== "ready") return fail("You've already started.");
      return {
        ok: true,
        state: { ...s, phase: "running", goAt: now + COUNTDOWN_MS, step: s.step + 1 },
      };
    }
    if (s.phase !== "running" || s.goAt === null) return fail("Tap Start first.");
    if (now < s.goAt + s.seconds * 1000 - EARLY_SLACK_MS) return fail("Time isn't up yet.");
    if (parsed.data.taps > s.seconds * MAX_TAPS_PER_SECOND)
      return fail("That's more taps than a person can make.");
    return { ok: true, state: { ...s, phase: "done", taps: parsed.data.taps, step: s.step + 1 } };
  },
  isOver: (s) => s.phase === "done",
  score: (s, points) => Math.round(points * Math.min(1, s.taps / s.target)),
  step: (s) => s.step,
};
