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
  })
  .strict();
export type DrawContent = z.infer<typeof DrawContent>;

const prompt = (c: DrawContent) => c.prompt ?? "Draw the Nova Wushu logo from memory";

/** Limits on what a phone may send: plenty for a sketch, small enough to store. */
export const MAX_STROKES = 600;
export const MAX_POINTS = 4000;

export type DrawState = {
  phase: "drawing" | "done";
  reference: string;
  /** Kept so the host can see it later. */
  strokes: Point[][] | null;
  match: number | null;
  step: number;
};

export type DrawView = { kind: "drawing"; prompt: string } | { kind: "done"; match: number | null };

const Coord = z.number().min(0).max(1);
const Move = z.object({
  type: z.literal("submit"),
  strokes: z
    .array(
      z
        .array(z.tuple([Coord, Coord]))
        .min(1)
        .max(MAX_POINTS),
    )
    .min(1)
    .max(MAX_STROKES),
});

const fail = (message: string): MoveResult<DrawState> => ({ ok: false, message });

/** Untimed (Khai, 2026-11-10): draw as long as you like, then send it. */
export const draw: GameLogic<DrawContent, DrawState, DrawView> = {
  content: DrawContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      `${prompt(c)}.`,
      "One pen, no peeking, and no rush. Tap I'm done when it's ready.",
      "The judge compares the shapes, not the size or where you drew it.",
    ],
  }),
  create: (c) => ({
    phase: "drawing",
    reference: c.reference ?? "nova-logo",
    strokes: null,
    match: null,
    step: 0,
  }),
  tick: (s) => s,
  view: (s, c) =>
    s.phase === "done"
      ? // The judge's verdict as the share of points earned, so it agrees with the score card.
        { kind: "done", match: s.match === null ? null : drawShare(s.match) }
      : { kind: "drawing", prompt: prompt(c) },
  move(s, _c, raw) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("Draw something first.");
    if (s.phase !== "drawing") return fail("You've already sent your drawing.");
    const strokes = parsed.data.strokes as Point[][];
    if (strokes.flat().length > MAX_POINTS) return fail("That drawing is too big to send.");
    const ref = REFERENCES[s.reference] ?? NOVA_LOGO;
    const match = Math.round(matchOf(strokes, ref) * 1000) / 1000;
    return { ok: true, state: { ...s, phase: "done", strokes, match, step: s.step + 1 } };
  },
  isOver: (s) => s.phase === "done",
  drawing: (s) => s.strokes,
  score: (s, points) => (s.match === null ? 0 : Math.round(points * drawShare(s.match))),
  step: (s) => s.step,
};
