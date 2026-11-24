import { z } from "zod";
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
import { type Level, type PerceptionCore } from "./core";

/**
 * The second modes of spec 30 (ADR-041), built as perception cores: Fly-by
 * Count and Snow Sum as solo games (Color Matcher's showdown was dropped, ADR-044).
 */

/**
 * How close a counted or summed answer is (spec 25, ADR-045): exact is 1, and
 * it falls away evenly to 0 at a miss of half the true number (at least 5),
 * so being near still scores.
 */
export const countCloseness = (answer: number, truth: number) =>
  Math.max(0, 1 - Math.abs(answer - truth) / Math.max(5, Math.abs(truth) / 2));

const roundFor = <T>(rounds: readonly T[], level: Level): T =>
  (rounds[level - 1] ?? rounds[rounds.length - 1]) as T;

/** The time to answer once the show is over, as in the showdowns (spec 25). */
const ANSWER_MS = 10_000;

// ---- Fly-by Count

export type FlybyTask = Formation & { level: Level; ms: number };

export const flybyCore: PerceptionCore<FlybyTask, number> = {
  type: "flyby",
  name: "Fly-by Count",
  demo: "Count the presents as they fly past!",
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
  closeness: (t, a) => countCloseness(a, t.count),
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
  demo: "Do the math as the snowflakes fall!",
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
  closeness: (t, a) => countCloseness(a, t.total),
  scene: (t, phase) =>
    phase === "show"
      ? { flakes: t.flakes, flakeMs: t.flakeMs }
      : phase === "reveal"
        ? { total: t.total }
        : null,
  truth: (t) => `a total of ${String(t.total)}`,
  said: (_t, a) => String(a),
};

/** Every core that has a solo version, and every one that has a showdown (ADR-041). */
export const SOLO_ONLY_CORES = [flybyCore, snowsumCore] as const;
