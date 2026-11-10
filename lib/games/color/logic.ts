import { z } from "zod";
import { deltaE2000 } from "./de2000";
import type { GameLogic, MoveResult } from "../model";

/** Color Matcher (spec 18): pick on a color wheel to match a color from memory. */
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a color like #882E7E.");
export const ColorContent = z
  .object({ target: Hex, prompt: z.string().min(1).max(120).optional() })
  .strict();
export type ColorContent = z.infer<typeof ColorContent>;

const prompt = (c: ColorContent) => c.prompt ?? "Match the color";

/**
 * All the points within this difference; none at ZERO_AT (CIEDE2000 ΔE, where
 * about 2 is the smallest difference eyes notice). Tuned 2026-11-10 (Khai:
 * scores felt random): a slightly pinker or bluer purple ~90%, a clearly
 * lighter one ~65%, grey or hot pink next to nothing.
 */
export const FULL_DE = 2;
export const ZERO_AT_DE = 25;

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

/**
 * How far apart two colors look (CIEDE2000 ΔE). The older CIE76 distance
 * judged purples, greys and vividness unlike eyes do, so scores felt random.
 */
export const colorDistance = (a: string, b: string): number =>
  deltaE2000(lab(fromHex(a)), lab(fromHex(b)));

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
