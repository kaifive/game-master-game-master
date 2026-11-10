import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { NOVA_LOGO } from "./nova-logo";
import { drawShare, matchOf, type Point, type Reference } from "./score";

/** Quick Draw (spec 18): draw a shape from memory; the server judges how close it is. */
export const REFERENCES: Record<string, Reference> = { "nova-logo": NOVA_LOGO };

export const DrawContent = z
  .object({
    prompt: z.string().min(1).max(120).optional(),
    reference: z.enum(["nova-logo"]).optional(),
    seconds: z.number().int().min(10).max(120).optional(),
  })
  .strict();
export type DrawContent = z.infer<typeof DrawContent>;

const prompt = (c: DrawContent) => c.prompt ?? "Draw the Nova Wushu logo from memory";
const seconds = (c: DrawContent) => c.seconds ?? 30;

/** Limits on what a phone may send: plenty for a sketch, small enough to store. */
export const MAX_STROKES = 600;
export const MAX_POINTS = 4000;
/** Network slack after the clock before a drawing is refused, and when an unsent run ends. */
export const GRACE_MS = 10_000;

export type DrawState = {
  phase: "ready" | "drawing" | "done";
  startedAt: number | null;
  seconds: number;
  reference: string;
  /** Kept so the host can see it later; null when time ran out with nothing sent. */
  strokes: Point[][] | null;
  match: number | null;
  step: number;
};

export type DrawView =
  | { kind: "ready" | "drawing"; prompt: string; seconds: number; msLeft: number }
  | { kind: "done"; match: number | null };

const Coord = z.number().min(0).max(1);
const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({
    type: z.literal("submit"),
    strokes: z
      .array(
        z
          .array(z.tuple([Coord, Coord]))
          .min(1)
          .max(MAX_POINTS),
      )
      .max(MAX_STROKES),
  }),
]);

const fail = (message: string): MoveResult<DrawState> => ({ ok: false, message });

export const draw: GameLogic<DrawContent, DrawState, DrawView> = {
  content: DrawContent,
  once: true,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      `${prompt(c)}.`,
      `You have ${String(seconds(c))} seconds and one pen. No peeking!`,
      "The judge compares the shapes, not the size or where you drew it.",
      "You get one drawing.",
    ],
  }),
  create: (c) => ({
    phase: "ready",
    startedAt: null,
    seconds: seconds(c),
    reference: c.reference ?? "nova-logo",
    strokes: null,
    match: null,
    step: 0,
  }),
  tick(s, _c, { now }) {
    if (s.phase !== "drawing" || s.startedAt === null) return s;
    if (now <= s.startedAt + s.seconds * 1000 + GRACE_MS) return s;
    return { ...s, phase: "done", step: s.step + 1 };
  },
  view(s, c, { now }) {
    // The judge's verdict as the share of points earned, so it agrees with the score card.
    if (s.phase === "done")
      return { kind: "done", match: s.match === null ? null : drawShare(s.match) };
    const msLeft =
      s.startedAt === null ? s.seconds * 1000 : Math.max(0, s.startedAt + s.seconds * 1000 - now);
    return { kind: s.phase, prompt: prompt(c), seconds: s.seconds, msLeft };
  },
  move(s, _c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That drawing couldn't be read. Try again.");
    if (parsed.data.type === "start") {
      if (s.phase !== "ready") return fail("You've already started.");
      return { ok: true, state: { ...s, phase: "drawing", startedAt: now, step: s.step + 1 } };
    }
    if (s.phase !== "drawing") return fail("Tap Start first.");
    const strokes = parsed.data.strokes as Point[][];
    if (strokes.flat().length > MAX_POINTS) return fail("That drawing is too big to send.");
    const ref = REFERENCES[s.reference] ?? NOVA_LOGO;
    const match = Math.round(matchOf(strokes, ref) * 1000) / 1000;
    return { ok: true, state: { ...s, phase: "done", strokes, match, step: s.step + 1 } };
  },
  isOver: (s) => s.phase === "done",
  score: (s, points) => (s.match === null ? 0 : Math.round(points * drawShare(s.match))),
  step: (s) => s.step,
};
