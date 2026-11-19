import { z } from "zod";
import { COLOR_ROUNDS, dealFlashes, ORNAMENT_COLORS, type Flash } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { answerWindow, answered, lockIn, windowView, type AnswerWindow } from "./answer";
import { rankedPoints } from "./scoring";

/**
 * Color Count (spec 25, S25-AC3): ornaments flash on the TV a few at a time;
 * only at the end does it ask how many of one color there were. Ranked by
 * closeness: 100, 70, 50, 30, then 10.
 */
export { COLOR_ROUNDS, dealFlashes, ORNAMENT_COLORS } from "@/lib/games";
export type { Flash, OrnamentColor } from "@/lib/games";

const Round = z.object({
  colors: z.number().int().min(2).max(ORNAMENT_COLORS.length),
  count: z.number().int().min(4).max(40),
  ms: z.number().int().min(1500).max(15_000),
});

const Content = z.object({ rounds: z.array(Round).min(1).max(10).default(COLOR_ROUNDS) });

export type ColorState = AnswerWindow & { flashes: Flash[]; ask: number; truth: number };

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
