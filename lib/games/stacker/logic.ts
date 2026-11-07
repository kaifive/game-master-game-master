import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/** Stack Attack (spec 16): stop the sliding bar on the one below; the phone runs it. */
export const StackerContent = z
  .object({
    rows: z.number().int().min(4).max(30).optional(),
    width: z.number().int().min(4).max(12).optional(),
  })
  .strict();
export type StackerContent = z.infer<typeof StackerContent>;

const rows = (c: StackerContent) => c.rows ?? 12;
const width = (c: StackerContent) => c.width ?? 7;

/** No row can be stacked faster than this, so a claimed count must fit the time taken. */
export const MIN_MS_PER_ROW = 200;
export const SLACK_MS = 1500;
/** A run left running this long ends with what it has (nothing). */
export const TIMEOUT_MS = 5 * 60_000;

export type StackerState = {
  phase: "ready" | "running" | "done";
  startedAt: number | null;
  rows: number;
  maxRows: number;
  width: number;
  step: number;
};

export type StackerView =
  | { kind: "ready" | "running"; rows: number; width: number }
  | { kind: "done"; stacked: number; rows: number };

const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("finish"), rows: z.number().int().nonnegative() }),
]);

const fail = (message: string): MoveResult<StackerState> => ({ ok: false, message });

export const stacker: GameLogic<StackerContent, StackerState, StackerView> = {
  content: StackerContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      "A bar slides side to side. Tap to stop it.",
      "Whatever hangs over the row below falls off, so the next bar is smaller.",
      `Stack as many rows as you can, up to ${String(rows(c))}. Each row climbs faster.`,
    ],
  }),
  create: (c) => ({
    phase: "ready",
    startedAt: null,
    rows: 0,
    maxRows: rows(c),
    width: width(c),
    step: 0,
  }),
  tick(s, _c, { now }) {
    if (s.phase !== "running" || s.startedAt === null || now <= s.startedAt + TIMEOUT_MS) return s;
    return { ...s, phase: "done", step: s.step + 1 };
  },
  view: (s) =>
    s.phase === "done"
      ? { kind: "done", stacked: s.rows, rows: s.maxRows }
      : { kind: s.phase, rows: s.maxRows, width: s.width },
  move(s, _c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    if (parsed.data.type === "start") {
      if (s.phase !== "ready") return fail("You've already started.");
      return { ok: true, state: { ...s, phase: "running", startedAt: now, step: s.step + 1 } };
    }
    if (s.phase !== "running" || s.startedAt === null) return fail("Tap Start first.");
    const claimed = parsed.data.rows;
    if (claimed > s.maxRows) return fail("That's more rows than the tower has.");
    if (claimed * MIN_MS_PER_ROW > now - s.startedAt + SLACK_MS)
      return fail("That's faster than the bars can move.");
    return { ok: true, state: { ...s, phase: "done", rows: claimed, step: s.step + 1 } };
  },
  isOver: (s) => s.phase === "done",
  score: (s, points) => Math.round((points * s.rows) / s.maxRows),
  step: (s) => s.step,
};
