import { z } from "zod";
import { defineShowdown, type Role, type ShowdownGame } from "../model";
import { rankedPoints } from "./scoring";
import { acceptStop, MAX_LAG_MS, type Stops } from "./stop";

/**
 * Last Second (spec 25, S25-AC5): a countdown runs on the TV; stop it as late
 * as you dare. Ranked by how little time was left; hit zero and you bust.
 */
const Content = z.object({
  rounds: z.number().int().min(1).max(10).default(3),
  countdownMs: z.number().int().min(3000).max(30_000).default(10_000),
});

export type LastState = Stops & { teams: string[]; countdownMs: number };

type C = z.infer<typeof Content>;

type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: LastState, _c: unknown, { role, revealed }: ViewCtx) {
  return {
    startsAt: s.startsAt,
    countdownMs: s.countdownMs,
    // Your own stop, so your phone can show it; others stay secret until the reveal.
    mine: role.kind !== "tv" ? (s.stops[role.teamId] ?? null) : null,
    stops: revealed ? s.stops : null,
  };
}

const game: ShowdownGame<C, LastState> = {
  content: Content,
  demo: "Stop the countdown as late as you dare. The latest stop wins, but hit zero and you get nothing.",
  rounds: (c) => c.rounds,
  deal: (c, { startsAt, teams }) => ({
    startsAt,
    stops: {},
    teams: [...teams],
    countdownMs: c.countdownMs,
  }),
  // A stop at zero or after is a bust, so the latest stop allowed is a hundredth before.
  move: (s, _c, { teamId, move, now }) => acceptStop(s, teamId, move, now, s.countdownMs - 10),
  tick: (s) => s,
  // A stop made just before zero can still be on its way, so wait out the lag.
  over: (s, _c, now) =>
    now > s.startsAt + s.countdownMs + MAX_LAG_MS || s.teams.every((t) => s.stops[t] !== undefined),
  score: (s, _c, teams) =>
    rankedPoints(teams, (t) => {
      const ms = s.stops[t];
      return ms === undefined ? null : s.countdownMs - ms;
    }),
  view,
};

export const lastsecond = defineShowdown(game);
export type LastView = ReturnType<typeof view>;
