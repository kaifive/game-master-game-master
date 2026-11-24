import { z } from "zod";
import { seededRandom } from "../random";
import { clamp01, type Level, type PerceptionCore } from "./core";

const pick = <T>(random: () => number, list: readonly T[]): T =>
  list[Math.floor(random() * list.length)] as T;
const between = (random: () => number, lo: number, hi: number) =>
  lo + Math.floor(random() * (hi - lo + 1));

// ---- Staff Angle: set the staff to an angle.

export type AngleTask = { level: Level; target: number };

export const staffangleCore: PerceptionCore<AngleTask, number> = {
  type: "staffangle",
  name: "Staff Angle",
  demo: "Turn the staff to the angle on the screen, judging by eye: there's no number to read while you turn it.",
  timeout: "Out of time? No answer scores 0.",
  instructions: [
    "The screen says an angle, like 35°.",
    "Drag the staff, or use the nudge buttons, until you think it's right.",
    "Lock it in. Within a few degrees scores big. Three angles.",
  ],
  deal(seed, level) {
    const random = seededRandom(seed);
    const step = level === 1 ? 15 : level === 2 ? 5 : 1;
    const target = step * between(random, Math.ceil(10 / step), Math.floor(170 / step));
    return { level, target };
  },
  showMs: () => 0,
  answerMs: () => 15_000,
  answer: z.number(),
  valid: (_t, a) => a >= 0 && a <= 180,
  closeness: (t, a) => clamp01(1 - Math.abs(a - t.target) / 45),
  scene: (t) => ({ target: t.target }),
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
  demo: "Tap where to cut the ribbon, like one third of the way along. There are no marks to help!",
  timeout: "Out of time? No answer scores 0.",
  instructions: [
    "The screen says how far along to cut, like one third.",
    "Tap the ribbon where you'd cut it; tap again to move it.",
    "Lock it in. The closer, the more points. Three cuts, each trickier.",
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
  closeness: (t, a) => clamp01(1 - Math.abs(a - t.at) / 0.15),
  scene: (t, phase) => ({ label: t.label, at: phase === "reveal" ? t.at : null }),
  truth: (t) => `${String(Math.round(t.at * 100))}% along`,
  said: (_t, a) => `${String(Math.round(a * 100))}% along`,
};

export const PERCEPTION_CORES = [staffangleCore, ribbonCore] as const;
