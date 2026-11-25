import { z } from "zod";
import { seededRandom } from "../random";
import { clamp01, type Level, type PerceptionCore } from "./core";

const pick = <T>(random: () => number, list: readonly T[]): T =>
  list[Math.floor(random() * list.length)] as T;
const between = (random: () => number, lo: number, hi: number) =>
  lo + Math.floor(random() * (hi - lo + 1));

// ---- Staff Angle: set the staff to an angle.

export type AngleTask = { level: Level; target: number };

/** How far the staff can turn, by level: half a turn, a full turn, then one and a half (Khai, 2026-11-25). */
export const STAFF_MAX: Record<Level, number> = { 1: 180, 2: 360, 3: 540 };

/**
 * Closeness that rewards skill: full marks within `exact`, falling off
 * steeply to nothing at `zero`, so a rough guess scores little (Khai, 2026-11-25).
 */
export const sharp = (off: number, exact: number, zero: number) =>
  off <= exact + 1e-9 ? 1 : clamp01((zero - off) / (zero - exact)) ** 2;

/** Seconds to set the staff, by level: less each round. */
export const STAFF_ANSWER_MS: Record<Level, number> = { 1: 15_000, 2: 12_000, 3: 9_000 };

export const staffangleCore: PerceptionCore<AngleTask, number> = {
  type: "staffangle",
  name: "Staff Angle",
  demo: "Turn the staff to the angle, by eye!",
  timeout: "Out of time? What's on your phone goes in.",
  instructions: [
    "The screen says an angle, like 35°.",
    "Drag the staff round until you think it's right.",
    "Round 1 goes up to 180°, round 2 a full turn (360°), round 3 one and a half turns (540°).",
    "Within 2° scores full points; a few more off and they drop fast.",
  ],
  deal(seed, level) {
    const random = seededRandom(seed);
    const step = level === 1 ? 15 : level === 2 ? 5 : 1;
    const top = STAFF_MAX[level] - 10;
    const target = step * between(random, Math.ceil(10 / step), Math.floor(top / step));
    return { level, target };
  },
  showMs: () => 0,
  // Less time each round: 15 s, then 12, then 9 (Khai, 2026-11-24).
  answerMs: (t) => STAFF_ANSWER_MS[t.level],
  answer: z.number(),
  valid: (t, a) => a >= 0 && a <= STAFF_MAX[t.level],
  closeness: (t, a) => sharp(Math.abs(a - t.target), 2, 27),
  scene: (t) => ({ target: t.target, max: STAFF_MAX[t.level] }),
  truth: (t) => `${String(t.target)}°`,
  said: (_t, a) => `${String(Math.round(a))}°`,
};

// ---- Cut the Ribbon: how far along?

export type RibbonTask = { level: Level; at: number; label: string };

const FRACTIONS: Record<1 | 2, [number, number, string][]> = {
  1: [
    [1, 2, "half"],
    [1, 3, "one third"],
    [2, 3, "two thirds"],
    [1, 4, "one quarter"],
    [3, 4, "three quarters"],
  ],
  2: [
    [1, 5, "one fifth"],
    [2, 5, "two fifths"],
    [3, 5, "three fifths"],
    [4, 5, "four fifths"],
    [1, 8, "one eighth"],
    [3, 8, "three eighths"],
    [5, 8, "five eighths"],
    [7, 8, "seven eighths"],
  ],
};

export const ribbonCore: PerceptionCore<RibbonTask, number> = {
  type: "ribbon",
  name: "Cut the Ribbon",
  demo: "Cut the ribbon at the right spot!",
  timeout: "Out of time? What's on your phone goes in.",
  instructions: [
    "The screen says how far along to cut, like one third.",
    "Tap the ribbon where you'd cut it; tap again to move it.",
    "Lock it in. Spot on scores full points; a little off and they drop fast. Three cuts, each trickier.",
  ],
  deal(seed, level) {
    const random = seededRandom(seed);
    if (level === 3) {
      const tenths = pick(random, [1, 2, 3, 4, 6, 7, 8, 9]);
      return { level, at: tenths / 10, label: `${String(tenths * 10)}% of the way` };
    }
    const [n, d, words] = pick(random, FRACTIONS[level]);
    return { level, at: n / d, label: words === "half" ? "halfway" : `${words} of the way` };
  },
  showMs: () => 0,
  answerMs: () => 10_000,
  answer: z.number(),
  valid: (_t, a) => a >= 0 && a <= 1,
  closeness: (t, a) => sharp(Math.abs(a - t.at), 0.01, 0.12),
  scene: (t, phase) => ({ label: t.label, at: phase === "reveal" ? t.at : null }),
  truth: (t) => `${String(Math.round(t.at * 100))}% along`,
  said: (_t, a) => `${String(Math.round(a * 100))}% along`,
};

export const PERCEPTION_CORES = [staffangleCore, ribbonCore] as const;
