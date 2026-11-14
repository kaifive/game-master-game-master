import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/**
 * T-Timer (spec 16): the clock counts up in plain sight; stop it inside the
 * window (Khai, 2026-11-14: 1.20 to 1.25 seconds).
 */
export const TimerContent = z
  .object({
    fromSeconds: z.number().min(0.5).max(60).optional(),
    toSeconds: z.number().min(0.5).max(60).optional(),
  })
  .strict()
  .refine((c) => (c.fromSeconds ?? 1.2) < (c.toSeconds ?? 1.25), {
    message: "fromSeconds must be less than toSeconds.",
  });
export type TimerContent = z.infer<typeof TimerContent>;

const fromMs = (c: TimerContent) => Math.round((c.fromSeconds ?? 1.2) * 1000);
const toMs = (c: TimerContent) => Math.round((c.toSeconds ?? 1.25) * 1000);

/** How much later than the server's clock a phone's time may be (network on both taps). */
export const CLAIM_SLACK_MS = 1000;
/** How much earlier: a slower network can't be used to shave time. */
export const LATE_SLACK_MS = 1500;
/** Points fall off outside the window, to none this far from its nearest edge. */
export const ZERO_AT_MS = 500;
/** A run left running this long past the window times out. */
export const TIMEOUT_MS = 10_000;

export type TimerState = {
  phase: "ready" | "running" | "done";
  startedAt: number | null;
  /** The time the player stopped at, or null when they never did. */
  elapsedMs: number | null;
  /** The window to stop in. */
  fromMs: number;
  toMs: number;
  step: number;
};

export type TimerView =
  | { kind: "ready"; fromSeconds: number; toSeconds: number }
  | { kind: "running"; fromSeconds: number; toSeconds: number; elapsedMs: number }
  | {
      kind: "done";
      fromSeconds: number;
      toSeconds: number;
      elapsedMs: number | null;
      /** How far outside the window the stop was: 0 inside it. */
      offMs: number | null;
    };

const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("stop"), elapsedMs: z.number().int().nonnegative() }),
]);

const fail = (message: string): MoveResult<TimerState> => ({ ok: false, message });

/** How far a time is outside the window, in ms: 0 anywhere inside it, edges included. */
export const offWindow = (elapsedMs: number, from: number, to: number) =>
  elapsedMs < from ? from - elapsedMs : elapsedMs > to ? elapsedMs - to : 0;

/** The share of points for stopping this far outside the window (S16-AC2). */
export const timerShare = (offMs: number) => Math.max(0, 1 - offMs / ZERO_AT_MS);

const seconds = (ms: number) => (ms / 1000).toFixed(2);

export const timer: GameLogic<TimerContent, TimerState, TimerView> = {
  content: TimerContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      "The clock starts as soon as you close this box, and you can watch it the whole time.",
      `Tap Stop between ${seconds(fromMs(c))} and ${seconds(toMs(c))} seconds.`,
      "Anywhere in there scores all the points. Just outside still scores some.",
    ],
  }),
  // The clock starts with the game: no second Start button (Khai, 2026-11-10).
  create: (c, _seed, { now }) => ({
    phase: "running",
    startedAt: now,
    elapsedMs: null,
    fromMs: fromMs(c),
    toMs: toMs(c),
    step: 0,
  }),
  tick(s, _c, { now }) {
    if (s.phase !== "running" || s.startedAt === null) return s;
    if (now <= s.startedAt + s.toMs + TIMEOUT_MS) return s;
    return { ...s, phase: "done", step: s.step + 1 };
  },
  view(s, _c, { now }) {
    const win = { fromSeconds: s.fromMs / 1000, toSeconds: s.toMs / 1000 };
    if (s.phase === "ready") return { kind: "ready", ...win };
    if (s.phase === "running")
      return { kind: "running", ...win, elapsedMs: Math.max(0, now - (s.startedAt ?? now)) };
    return {
      kind: "done",
      ...win,
      elapsedMs: s.elapsedMs,
      offMs: s.elapsedMs === null ? null : offWindow(s.elapsedMs, s.fromMs, s.toMs),
    };
  },
  move(s, _c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    if (parsed.data.type === "start") {
      if (s.phase !== "ready") return fail("The clock is already running.");
      return { ok: true, state: { ...s, phase: "running", startedAt: now, step: s.step + 1 } };
    }
    if (s.phase !== "running" || s.startedAt === null) return fail("Tap Start first.");
    const served = now - s.startedAt;
    // The phone times the run exactly (network lag would swamp a 50 ms window);
    // the server only checks the claim is possible.
    if (parsed.data.elapsedMs > served + CLAIM_SLACK_MS) return fail("That time isn't possible.");
    const elapsedMs = Math.max(parsed.data.elapsedMs, served - LATE_SLACK_MS);
    return { ok: true, state: { ...s, phase: "done", elapsedMs, step: s.step + 1 } };
  },
  isOver: (s) => s.phase === "done",
  score: (s, points) =>
    s.elapsedMs === null
      ? 0
      : Math.round(points * timerShare(offWindow(s.elapsedMs, s.fromMs, s.toMs))),
  step: (s) => s.step,
};
