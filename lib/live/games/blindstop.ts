import { z } from "zod";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { rankedPoints } from "./scoring";
import { acceptStop, hundredths, type Stops } from "./stop";

/**
 * Blind Stop (spec 25, S25-AC4): a clock counts up on the TV, turns into "?"
 * after 3 s, and every team tries to stop it at exactly 10.00. Ranked by
 * closeness, with 50 more for exactly 10.00.
 */
const Content = z.object({
  rounds: z.number().int().min(1).max(5).default(1),
  targetMs: z.number().int().min(3000).max(30_000).default(10_000),
  showMs: z.number().int().min(0).max(10_000).default(3000),
  /** A phone that hasn't stopped by then counts as no answer. */
  limitMs: z.number().int().min(5000).max(60_000).default(20_000),
});

export const EXACT_BONUS = 50;

export type BlindState = Stops & {
  teams: string[];
  targetMs: number;
  showMs: number;
  limitMs: number;
};

type C = z.infer<typeof Content>;

/** Exactly on target, as the clock shows it: the same hundredth. */
export const exact = (ms: number, target: number) => hundredths(ms) === hundredths(target);

type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: BlindState, _c: unknown, { role, revealed }: ViewCtx) {
  return {
    startsAt: s.startsAt,
    targetMs: s.targetMs,
    showMs: s.showMs,
    limitMs: s.limitMs,
    // Your own stop, so the phone knows it's in; nobody's time shows until the reveal.
    stopped: role.kind !== "tv" && s.stops[role.teamId] !== undefined,
    stops: revealed ? s.stops : null,
  };
}

const game: ShowdownGame<C, BlindState> = {
  content: Content,
  demo: "Stop the clock at exactly 10.00. It hides after 3 seconds, so count in your head!",
  rounds: (c) => c.rounds,
  deal: (c, { startsAt, teams }) => ({
    startsAt,
    stops: {},
    teams: [...teams],
    targetMs: c.targetMs,
    showMs: c.showMs,
    limitMs: c.limitMs,
  }),
  move: (s, _c, { teamId, move, now }) => acceptStop(s, teamId, move, now, s.limitMs),
  tick: (s) => s,
  over: (s, _c, now) =>
    now > s.startsAt + s.limitMs || s.teams.every((t) => s.stops[t] !== undefined),
  score(s, _c, teams) {
    const points = rankedPoints(teams, (t) => {
      const ms = s.stops[t];
      return ms === undefined ? null : Math.abs(ms - s.targetMs);
    });
    for (const t of teams) {
      const ms = s.stops[t];
      if (ms !== undefined && exact(ms, s.targetMs)) points[t] = (points[t] ?? 0) + EXACT_BONUS;
    }
    return points;
  },
  view,
};

export const blindstop = defineShowdown(game);
export type BlindView = ReturnType<typeof view>;
