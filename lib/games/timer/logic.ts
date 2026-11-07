import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/** T-Timer (spec 16): stop the clock at the target, with the clock hidden after a few seconds. */
export const TimerContent = z
  .object({
    targetSeconds: z.number().min(3).max(60).optional(),
    visibleSeconds: z.number().min(0).max(30).optional(),
  })
  .strict()
  .refine((c) => (c.visibleSeconds ?? 3) < (c.targetSeconds ?? 10), {
    message: "visibleSeconds must be less than targetSeconds.",
  });
export type TimerContent = z.infer<typeof TimerContent>;

const target = (c: TimerContent) => (c.targetSeconds ?? 10) * 1000;
const visible = (c: TimerContent) => (c.visibleSeconds ?? 3) * 1000;

/** How much later than the server's clock a phone's time may be (network on both taps). */
export const CLAIM_SLACK_MS = 1000;
/** How much earlier: a slower network can't be used to shave time. */
export const LATE_SLACK_MS = 1500;
/** All points within this; none at FULL + ZERO_AT ms off. */
export const FULL_MS = 50;
export const ZERO_AT_MS = 2000;
/** A run left running this long past the target times out. */
export const TIMEOUT_MS = 10_000;

export type TimerState = {
  phase: "ready" | "running" | "done";
  startedAt: number | null;
  /** The time the player stopped at, or null when they never did. */
  elapsedMs: number | null;
  targetMs: number;
  step: number;
};

export type TimerView =
  | { kind: "ready"; targetSeconds: number; visibleSeconds: number }
  | { kind: "running"; targetSeconds: number; visibleSeconds: number; elapsedMs: number }
  | { kind: "done"; targetSeconds: number; elapsedMs: number | null; offMs: number | null };

const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("stop"), elapsedMs: z.number().int().nonnegative() }),
]);

const fail = (message: string): MoveResult<TimerState> => ({ ok: false, message });

/** The share of points for stopping this far off (S16-AC2). */
export function timerShare(offMs: number): number {
  if (offMs <= FULL_MS) return 1;
  return Math.max(0, 1 - (offMs - FULL_MS) / (ZERO_AT_MS - FULL_MS));
}

export const timer: GameLogic<TimerContent, TimerState, TimerView> = {
  content: TimerContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      "Tap Start and count in your head.",
      `The clock shows for ${String(visible(c) / 1000)} seconds, then hides.`,
      `Tap Stop at exactly ${String(target(c) / 1000)} seconds.`,
      "The closer you are, the more points. Within a twentieth of a second scores them all.",
    ],
  }),
  create: (c) => ({
    phase: "ready",
    startedAt: null,
    elapsedMs: null,
    targetMs: target(c),
    step: 0,
  }),
  tick(s, _c, { now }) {
    if (s.phase !== "running" || s.startedAt === null) return s;
    if (now <= s.startedAt + s.targetMs + TIMEOUT_MS) return s;
    return { ...s, phase: "done", step: s.step + 1 };
  },
  view(s, c, { now }) {
    const targetSeconds = target(c) / 1000;
    const visibleSeconds = visible(c) / 1000;
    if (s.phase === "ready") return { kind: "ready", targetSeconds, visibleSeconds };
    if (s.phase === "running")
      return {
        kind: "running",
        targetSeconds,
        visibleSeconds,
        elapsedMs: Math.max(0, now - (s.startedAt ?? now)),
      };
    return {
      kind: "done",
      targetSeconds,
      elapsedMs: s.elapsedMs,
      offMs: s.elapsedMs === null ? null : Math.abs(s.elapsedMs - s.targetMs),
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
    // The phone times the run exactly; the server only checks the claim is possible.
    if (parsed.data.elapsedMs > served + CLAIM_SLACK_MS) return fail("That time isn't possible.");
    const elapsedMs = Math.max(parsed.data.elapsedMs, served - LATE_SLACK_MS);
    return { ok: true, state: { ...s, phase: "done", elapsedMs, step: s.step + 1 } };
  },
  isOver: (s) => s.phase === "done",
  score: (s, points) =>
    s.elapsedMs === null ? 0 : Math.round(points * timerShare(Math.abs(s.elapsedMs - s.targetMs))),
  step: (s) => s.step,
};
