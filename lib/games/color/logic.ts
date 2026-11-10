import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/** Color Matcher (spec 18): mix red, green and blue to match a color from memory. */
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a color like #882E7E.");
export const ColorContent = z
  .object({ target: Hex, prompt: z.string().min(1).max(120).optional() })
  .strict();
export type ColorContent = z.infer<typeof ColorContent>;

const prompt = (c: ColorContent) => c.prompt ?? "Match the color";

/** All the points within this difference; none at ZERO_AT (CIE76 ΔE, where 2 is barely visible). */
export const FULL_DE = 3;
export const ZERO_AT_DE = 50;

type Rgb = [number, number, number];

export const toHex = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const fromHex = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

/** sRGB to CIE Lab (D65), so differences match what eyes see. */
function lab([r, g, b]: Rgb): Rgb {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** How far apart two colors look (CIE76 ΔE). */
export function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = lab(fromHex(a));
  const [l2, a2, b2] = lab(fromHex(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** The share of points for a difference (S18-AC2). */
export const colorShare = (de: number) =>
  de <= FULL_DE ? 1 : Math.max(0, 1 - (de - FULL_DE) / (ZERO_AT_DE - FULL_DE));

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
      "Slide red, green and blue until the swatch looks right, then lock it in.",
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
