import { z } from "zod";
import { seededRandom } from "../random";
import { clamp01, type Level, type PerceptionCore } from "./core";

const pick = <T>(random: () => number, list: readonly T[]): T =>
  list[Math.floor(random() * list.length)] as T;
const between = (random: () => number, lo: number, hi: number) =>
  lo + Math.floor(random() * (hi - lo + 1));

// ---- Snow Pile: how many snowflakes?

export type SnowPileTask = {
  level: Level;
  count: number;
  flakes: [number, number][];
  showMs: number;
};

const PILE: Record<Level, { min: number; max: number; showMs: number }> = {
  1: { min: 12, max: 25, showMs: 2000 },
  2: { min: 25, max: 50, showMs: 1500 },
  3: { min: 50, max: 100, showMs: 1200 },
};

export const snowpileCore: PerceptionCore<SnowPileTask, number> = {
  type: "snowpile",
  name: "Snow Pile",
  demo: "A pile of snowflakes flashes up for a moment. Type how many there were. The closer, the more points.",
  timeout: "Out of time? No answer scores 0.",
  instructions: [
    "Snowflakes flash up for a moment, then vanish.",
    "Type how many there were.",
    "The closer you are, the more points. Three piles, each bigger.",
  ],
  deal(seed, level) {
    const random = seededRandom(seed);
    const { min, max, showMs } = PILE[level];
    const count = between(random, min, max);
    // Spread out on a jittered grid, so flakes don't sit on top of each other.
    const side = Math.ceil(Math.sqrt(count * 1.6));
    const cells = Array.from({ length: side * side }, (_, i) => i)
      .sort(() => random() - 0.5)
      .slice(0, count);
    const flakes = cells.map((c): [number, number] => [
      ((c % side) + 0.2 + random() * 0.6) / side,
      (Math.floor(c / side) + 0.2 + random() * 0.6) / side,
    ]);
    return { level, count, flakes, showMs };
  },
  showMs: (t) => t.showMs,
  answerMs: () => 10_000,
  answer: z.number().int(),
  valid: (_t, a) => a >= 0 && a <= 999,
  closeness: (t, a) => clamp01(1 - Math.abs(a - t.count) / t.count),
  scene: (t, phase) =>
    phase === "answer" ? null : { flakes: t.flakes, count: phase === "reveal" ? t.count : null },
  truth: (t) => `${String(t.count)} snowflakes`,
  said: (_t, a) => String(a),
};

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

// ---- Sleigh Run: where does the sleigh come out of the cloud?

export type SleighTask = {
  level: Level;
  /** Height where the sleigh starts at the left edge, 0 at the top, 1 at the bottom. */
  startY: number;
  /** Height change per screen width. */
  slope: number;
  /** The cloud's left and right edges, as shares of the width. */
  cloudFrom: number;
  cloudTo: number;
  /** How long the sleigh takes to reach the cloud. */
  flightMs: number;
};

const SLEIGH: Record<Level, { slope: number; width: [number, number]; flightMs: number }> = {
  1: { slope: 0.25, width: [0.18, 0.24], flightMs: 2200 },
  2: { slope: 0.5, width: [0.26, 0.34], flightMs: 1900 },
  3: { slope: 0.8, width: [0.34, 0.42], flightMs: 1600 },
};

/** Where the sleigh comes out of the cloud. */
export const exitY = (t: SleighTask) => t.startY + t.slope * t.cloudTo;

export const sleighrunCore: PerceptionCore<SleighTask, number> = {
  type: "sleighrun",
  name: "Sleigh Run",
  demo: "Watch the sleigh fly into the cloud, then tap the cloud's far edge where it'll come out.",
  timeout: "Out of time? No answer scores 0.",
  instructions: [
    "A sleigh flies in a straight line into a cloud.",
    "Tap the cloud's far edge where you think it comes out.",
    "The closer, the more points. Three flights, each trickier.",
  ],
  deal(seed, level) {
    const random = seededRandom(seed);
    const { slope: s, width, flightMs } = SLEIGH[level];
    const cloudFrom = 0.42 + random() * 0.08;
    const cloudTo = Math.min(0.92, cloudFrom + width[0] + random() * (width[1] - width[0]));
    // Up or down, and starting where the path stays on screen to the far edge.
    const slope = (random() < 0.5 ? -1 : 1) * s * (0.6 + random() * 0.4);
    for (;;) {
      const startY = 0.1 + random() * 0.8;
      const end = startY + slope * cloudTo;
      if (end > 0.08 && end < 0.92) return { level, startY, slope, cloudFrom, cloudTo, flightMs };
    }
  },
  showMs: (t) => t.flightMs,
  answerMs: () => 10_000,
  answer: z.number(),
  valid: (_t, a) => a >= 0 && a <= 1,
  closeness: (t, a) => clamp01(1 - Math.abs(a - exitY(t)) / 0.25),
  scene: (t, phase) => ({
    startY: t.startY,
    slope: t.slope,
    cloudFrom: t.cloudFrom,
    cloudTo: t.cloudTo,
    flightMs: t.flightMs,
    exitY: phase === "reveal" ? exitY(t) : null,
  }),
  truth: (t) => `${String(Math.round((1 - exitY(t)) * 100))}% up`,
  said: (_t, a) => `${String(Math.round((1 - a) * 100))}% up`,
};

// ---- Lion Drum: keep the beat.

export type DrumTask = { level: Level; intervalMs: number; shown: number; keep: number };

const DRUM: Record<Level, { bpm: [number, number]; shown: number; keep: number }> = {
  1: { bpm: [70, 90], shown: 8, keep: 4 },
  2: { bpm: [90, 120], shown: 6, keep: 6 },
  3: { bpm: [120, 150], shown: 4, keep: 8 },
};

/** When each beat to keep falls, in ms from the first flash. */
export const keepBeats = (t: DrumTask) =>
  Array.from({ length: t.keep }, (_, j) => (t.shown + j) * t.intervalMs);

/** How far each kept beat is from the nearest unused tap; a missing tap misses by half a beat. */
export function drumMisses(t: DrumTask, taps: readonly number[]): number[] {
  const left = [...taps];
  return keepBeats(t).map((beat) => {
    let best = -1;
    for (let i = 0; i < left.length; i++)
      if (best === -1 || Math.abs((left[i] ?? 0) - beat) < Math.abs((left[best] ?? 0) - beat))
        best = i;
    const half = t.intervalMs / 2;
    if (best === -1) return half;
    const miss = Math.min(half, Math.abs((left[best] ?? 0) - beat));
    left.splice(best, 1);
    return miss;
  });
}

export const liondrumCore: PerceptionCore<DrumTask, number[]> = {
  type: "liondrum",
  name: "Lion Drum",
  demo: "The lion drum flashes a beat, then goes dark. Keep tapping in time, one tap per beat.",
  timeout: "Out of time? Beats you didn't tap count as misses.",
  instructions: [
    "The drum flashes on every beat for a few beats.",
    "When it goes dark, keep tapping the drum in time.",
    "The closer to the beat, the more points. Three beats, each faster.",
  ],
  deal(seed, level) {
    const random = seededRandom(seed);
    const { bpm, shown, keep } = DRUM[level];
    const intervalMs = Math.round(60_000 / between(random, bpm[0], bpm[1]));
    return { level, intervalMs, shown, keep };
  },
  // Taps are taken while it's dark; they're sent once the beats to keep are over.
  showMs: (t) => t.shown * t.intervalMs,
  answerMs: (t) => t.keep * t.intervalMs + 2500,
  answer: z.array(z.number().int().nonnegative()).max(40),
  valid: () => true,
  closeness: (t, taps) => {
    const misses = drumMisses(t, taps);
    const mean = misses.reduce((a, b) => a + b, 0) / Math.max(1, misses.length);
    return clamp01(1 - mean / (t.intervalMs / 2));
  },
  scene: (t) => ({ intervalMs: t.intervalMs, shown: t.shown, keep: t.keep }),
  truth: (t) => `${String(Math.round(60_000 / t.intervalMs))} beats a minute`,
  said: (t, taps) => `${String(taps.length)} of ${String(t.keep)} taps`,
  claims: (taps) => Math.max(0, ...taps),
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

export const PERCEPTION_CORES = [
  snowpileCore,
  staffangleCore,
  sleighrunCore,
  liondrumCore,
  ribbonCore,
] as const;
