import { z } from "zod";
import { colorDistance, colorShare, hsvToRgb, toHex } from "../color/logic";
import {
  dealFlakes,
  dealFormation,
  FLYBY_ROUNDS,
  PRESENT_KINDS,
  SNOW_MAX,
  SNOW_MIN,
  SNOW_ROUNDS,
  sum,
  type Flake,
  type Formation,
} from "../counts";
import { seededRandom } from "../random";
import { type Level, type PerceptionCore } from "./core";

/**
 * The second modes of spec 30 (ADR-041), built as perception cores: Fly-by
 * Count and Snow Sum as solo games, Color Matcher as a showdown.
 */

/** The counting showdowns' own rule: exact 1, one off a half, else 0 (spec 25). */
export const nearCloseness = (answer: number, truth: number) =>
  answer === truth ? 1 : Math.abs(answer - truth) === 1 ? 0.5 : 0;

const roundFor = <T>(rounds: readonly T[], level: Level): T =>
  (rounds[level - 1] ?? rounds[rounds.length - 1]) as T;

/** The time to answer once the show is over, as in the showdowns (spec 25). */
const ANSWER_MS = 10_000;

// ---- Fly-by Count

export type FlybyTask = Formation & { level: Level; ms: number };

export const flybyCore: PerceptionCore<FlybyTask, number> = {
  type: "flyby",
  name: "Fly-by Count",
  demo: "Count the presents as they fly past. First count them all; later it asks how many of one kind, only once they've gone.",
  timeout: "Out of time? No answer scores 0.",
  instructions: [
    "Presents fly across the screen.",
    "First count them all. Then there are red, white and green ones, and it only asks which kind once they've flown past.",
    "Exactly right scores full points, one off scores half. Three flights, each harder.",
  ],
  deal(seed, level) {
    const r = roundFor(FLYBY_ROUNDS, level);
    return { level, ms: r.ms, ...dealFormation(seed, r) };
  },
  showMs: (t) => t.ms,
  answerMs: () => ANSWER_MS,
  answer: z.number().int(),
  valid: (_t, a) => a >= 0 && a <= 99,
  closeness: (t, a) => nearCloseness(a, t.count),
  // The layout only while it flies, which kind is asked about only after,
  // and the count only at the reveal (S30-AC3).
  scene: (t, phase) =>
    phase === "show"
      ? { cols: t.cols, rows: t.rows, cells: t.cells, offsets: t.offsets, ms: t.ms }
      : phase === "answer"
        ? { ask: t.ask }
        : { count: t.count, ask: t.ask },
  truth: (t) =>
    `${String(t.count)}${t.ask === null ? "" : ` ${PRESENT_KINDS[t.ask] ?? ""}`} presents`,
  answerKey: (t) => t.count,
  said: (_t, a) => String(a),
};

// ---- Snow Sum

export type SnowSumTask = { level: Level; flakes: Flake[]; flakeMs: number; total: number };

/** How long each snowflake takes to fall, as the showdown's default. */
const FLAKE_MS = 1400;

export const snowsumCore: PerceptionCore<SnowSumTask, number> = {
  type: "snowsum",
  name: "Snow Sum",
  demo: "Start at 0 and do each snowflake in order: + adds, − takes away, ×2 doubles. Exactly right scores full points, one off scores half.",
  timeout: "Out of time? No answer scores 0.",
  instructions: [
    "Start at 0. Snowflakes fall one at a time.",
    "+ adds, − takes away, ×2 doubles. Keep the total in your head.",
    "Type the total. Exactly right scores full points, one off scores half.",
  ],
  deal(seed, level) {
    const r = roundFor(SNOW_ROUNDS, level);
    const flakes = dealFlakes(seed, r.flakes, r.ops);
    return { level, flakes, flakeMs: FLAKE_MS, total: sum(flakes) };
  },
  showMs: (t) => t.flakes.length * t.flakeMs,
  answerMs: () => ANSWER_MS,
  answer: z.number().int(),
  valid: (_t, a) => a >= SNOW_MIN && a <= SNOW_MAX,
  closeness: (t, a) => nearCloseness(a, t.total),
  scene: (t, phase) =>
    phase === "show"
      ? { flakes: t.flakes, flakeMs: t.flakeMs }
      : phase === "reveal"
        ? { total: t.total }
        : null,
  truth: (t) => `a total of ${String(t.total)}`,
  said: (_t, a) => String(a),
};

// ---- Color Matcher as a showdown

export type ColorTask = { level: Level; target: string; showMs: number };

/** Vivid, then softer, then muted and dark (S30-AC1). */
const SHADES: Record<Level, { s: [number, number]; v: [number, number]; showMs: number }> = {
  1: { s: [0.85, 1], v: [0.85, 1], showMs: 3000 },
  2: { s: [0.5, 0.85], v: [0.6, 0.9], showMs: 2500 },
  3: { s: [0.2, 0.55], v: [0.35, 0.7], showMs: 2000 },
};

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const colorCore: PerceptionCore<ColorTask, string> = {
  type: "color",
  name: "Color Matcher",
  demo: "A color shows on the TV for a moment. Make it again on the color wheel: the closest team wins.",
  timeout: "Out of time? No answer scores 0.",
  instructions: [
    "A color shows for a moment, then hides.",
    "Make it again on the wheel and the brightness slider.",
    "Lock it in. The closer, the more points.",
  ],
  deal(seed, level) {
    const random = seededRandom(seed);
    const { s, v, showMs } = SHADES[level];
    const at = ([lo, hi]: [number, number]) => lo + random() * (hi - lo);
    const target = toHex(hsvToRgb({ h: random() * 360, s: at(s), v: at(v) }));
    return { level, target, showMs };
  },
  showMs: (t) => t.showMs,
  answerMs: () => 15_000,
  answer: Hex,
  valid: () => true,
  closeness: (t, a) => colorShare(colorDistance(a.toUpperCase(), t.target)),
  distance: (t, a) => colorDistance(a.toUpperCase(), t.target),
  scene: (t, phase) => (phase === "answer" ? null : { color: t.target }),
  truth: () => "this color",
  said: (t, a) =>
    `${String(Math.round(colorShare(colorDistance(a.toUpperCase(), t.target)) * 100))}% match`,
};

/** Every core that has a solo version, and every one that has a showdown (ADR-041). */
export const SOLO_ONLY_CORES = [flybyCore, snowsumCore] as const;
export const SHOWDOWN_ONLY_CORES = [colorCore] as const;
