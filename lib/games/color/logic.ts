import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/** Color Matcher (spec 18): pick on a color wheel to match a color from memory. */
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a color like #882E7E.");
export const ColorContent = z
  .object({ target: Hex, prompt: z.string().min(1).max(120).optional() })
  .strict();
export type ColorContent = z.infer<typeof ColorContent>;

const prompt = (c: ColorContent) => c.prompt ?? "Match the color";

/**
 * All the points within this distance; none at ZERO_AT. The distance is
 * measured on the game's own controls (below), so being a quarter off on
 * any one of them lands near half the points (Khai, 2026-11-13).
 */
export const FULL_AT = 0.04;
export const ZERO_AT = 0.5;

type Rgb = [number, number, number];

export const toHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const fromHex = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

/** Red, green and blue to the wheel's shade (degrees), strength and brightness (0 to 1). */
export function toHsv([r, g, b]: Rgb): { h: number; s: number; v: number } {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const d = max - Math.min(R, G, B);
  let h = 0;
  if (d > 0)
    h =
      max === R
        ? 60 * (((G - B) / d + 6) % 6)
        : max === G
          ? 60 * ((B - R) / d + 2)
          : 60 * ((R - G) / d + 4);
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/**
 * How far apart two colors are on the game's controls: the distance between
 * the two points on the color wheel (shade around it, strength out from the
 * middle, the wheel's radius being 1), together with the gap on the
 * brightness slider (0 to 1). Each control counts the same, so a too-vivid
 * magenta no longer beats a slightly-too-light purple, as it did when the
 * score used CIEDE2000 (Khai, 2026-11-13: scores still felt off).
 */
export function colorDistance(a: string, b: string): number {
  const p = toHsv(fromHex(a));
  const q = toHsv(fromHex(b));
  const rad = Math.PI / 180;
  const wheel = Math.hypot(
    p.s * Math.cos(p.h * rad) - q.s * Math.cos(q.h * rad),
    p.s * Math.sin(p.h * rad) - q.s * Math.sin(q.h * rad),
  );
  return Math.hypot(wheel, p.v - q.v);
}

/** The share of points for a distance (S18-AC2). */
export const colorShare = (d: number) =>
  d <= FULL_AT ? 1 : Math.max(0, 1 - (d - FULL_AT) / (ZERO_AT - FULL_AT));

export type ColorState = { picked: string | null; target: string; step: number };
export type ColorView =
  | { kind: "pick"; prompt: string }
  | {
      kind: "done";
      picked: string;
      /** Kept back when the event is replayable, so a replay can't just copy it (S18-AC2). */
      target: string | null;
      match: number;
    };

const Move = z.object({ type: z.literal("pick"), color: Hex });
const fail = (message: string): MoveResult<ColorState> => ({ ok: false, message });

export const color: GameLogic<ColorContent, ColorState, ColorView> = {
  content: ColorContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      `${prompt(c)}.`,
      "Tap the color wheel for the shade and set the brightness, then lock it in.",
      "The closer the color, the more points.",
    ],
  }),
  create: (c) => ({ picked: null, target: c.target.toUpperCase(), step: 0 }),
  tick: (s) => s,
  view: (s, c, { replayable }) =>
    s.picked === null
      ? { kind: "pick", prompt: prompt(c) }
      : {
          kind: "done",
          picked: s.picked,
          target: replayable === true ? null : s.target,
          match: Math.round(colorShare(colorDistance(s.picked, s.target)) * 100),
        },
  move(s, _c, raw) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("Pick a color.");
    if (s.picked !== null) return fail("You've already locked in a color.");
    return { ok: true, state: { ...s, picked: parsed.data.color.toUpperCase(), step: s.step + 1 } };
  },
  isOver: (s) => s.picked !== null,
  score: (s, points) =>
    s.picked === null ? 0 : Math.round(points * colorShare(colorDistance(s.picked, s.target))),
  step: (s) => s.step,
};
