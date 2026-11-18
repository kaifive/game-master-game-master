import { z } from "zod";
import { seededRandom, shuffled } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { answerWindow, answered, lockIn, windowView, type AnswerWindow } from "./answer";
import { rankedPoints } from "./scoring";

/**
 * Color Count (spec 25, S25-AC3): ornaments flash on the TV a few at a time;
 * only at the end does it ask how many of one color there were. Ranked by
 * closeness: 100, 70, 50, 30, then 10.
 */
export const ORNAMENT_COLORS = ["red", "green", "blue", "gold", "purple"] as const;
export type OrnamentColor = (typeof ORNAMENT_COLORS)[number];

/** One flash: a few ornaments, each with its color and spot on the TV (0 to 1 each way). */
export type Flash = { color: number; x: number; y: number }[];

const Round = z.object({
  colors: z.number().int().min(2).max(ORNAMENT_COLORS.length),
  count: z.number().int().min(4).max(40),
  ms: z.number().int().min(1500).max(15_000),
});

export const COLOR_ROUNDS = [
  { colors: 3, count: 12, ms: 4000 },
  { colors: 4, count: 18, ms: 3500 },
  { colors: 5, count: 24, ms: 3000 },
];

const Content = z.object({ rounds: z.array(Round).min(1).max(10).default(COLOR_ROUNDS) });

export type ColorState = AnswerWindow & { flashes: Flash[]; ask: number; truth: number };

/** The flashes for one round: every color shows at least once, 2 or 3 ornaments at a time. */
export function dealFlashes(seed: number, colors: number, count: number) {
  const random = seededRandom(seed);
  const picks = Array.from({ length: count }, (_, i) =>
    i < colors ? i : Math.floor(random() * colors),
  );
  const order = shuffled(picks, random);
  const flashes: Flash[] = [];
  for (let i = 0; i < order.length;) {
    const size = Math.min(order.length - i, 2 + Math.floor(random() * 2));
    // Spots spread across the screen, apart from each other.
    const slots = shuffled([0, 1, 2, 3, 4, 5], random).slice(0, size);
    flashes.push(
      order.slice(i, i + size).map((color, j) => ({
        color,
        x: ((slots[j] ?? 0) % 3) / 3 + 0.08 + random() * 0.17,
        y: Math.floor((slots[j] ?? 0) / 3) / 2 + 0.08 + random() * 0.25,
      })),
    );
    i += size;
  }
  const ask = Math.floor(random() * colors);
  return { flashes, ask, truth: order.filter((c) => c === ask).length };
}

type C = z.infer<typeof Content>;

type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: ColorState, _c: unknown, { role, revealed, now }: ViewCtx) {
  return {
    ...windowView(s, role, revealed),
    flashes: role.kind === "tv" ? s.flashes : null,
    colors: ORNAMENT_COLORS.slice(0, Math.max(...s.flashes.flat().map((o) => o.color)) + 1),
    // Which color to count stays secret until the flashes are over (S25-AC3).
    ask: now >= s.showEndsAt || revealed ? s.ask : null,
    truth: revealed ? s.truth : null,
  };
}

const game: ShowdownGame<C, ColorState> = {
  content: Content,
  demo: "Count every color of ornament. At the end you'll be asked how many of one color there were. Closest team scores most.",
  timeout: "Out of time? No answer scores 0.",
  rounds: (c) => c.rounds.length,
  deal(c, { seed, round, startsAt, teams }) {
    const r = c.rounds[round - 1] ?? c.rounds[c.rounds.length - 1] ?? COLOR_ROUNDS[0];
    if (!r) throw new Error("no rounds");
    return { ...answerWindow(startsAt, r.ms, teams), ...dealFlashes(seed, r.colors, r.count) };
  },
  move: (s, _c, { teamId, move, now }) => lockIn(s, teamId, move, now, { min: 0, max: 99 }),
  tick: (s) => s,
  over: (s, _c, now) => answered(s, now),
  score: (s, _c, teams) =>
    rankedPoints(teams, (t) => {
      const a = s.answers[t];
      return a === undefined ? null : Math.abs(a - s.truth);
    }),
  view,
};

export const colorcount = defineShowdown(game);
export type ColorView = ReturnType<typeof view>;
