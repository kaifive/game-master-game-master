import { z } from "zod";
import { lapRounds, leadOrder } from "../fairness";
import { defineShowdown, type Role, type ShowdownGame, type TurnInfo } from "../model";
import { roundShare } from "./scoring";

/**
 * Snowball to 21 (spec 27, S27-AC3): a shared count goes up by 1, 2 or 3 a
 * turn; the team that makes the round's number exactly (21, then others)
 * wins it. At least three rounds, in whole laps, so every team starts as
 * often as the others (S24-AC6).
 */
const Content = z.object({
  /** The number to make, round by round: a new one each round (Khai, 2026-11-24). */
  targets: z.array(z.number().int().min(5).max(50)).min(1).default([21, 17, 25, 13, 29, 19]),
  turnMs: z.number().int().min(3000).max(30_000).default(10_000),
  /** What the round's winner scores; left out, its share of 150. Every other team gets half (ADR-045). */
  points: z.number().int().min(1).max(500).optional(),
});

export type To21State = {
  startsAt: number;
  order: string[];
  /** Turns taken so far: whose turn it is is order[at % order.length]. */
  at: number;
  turnStartedAt: number;
  count: number;
  target: number;
  turnMs: number;
  history: { teamId: string; add: number; auto: boolean }[];
  winner: string | null;
};

const whose = (s: To21State) => s.order[s.at % s.order.length] ?? "";

/** Adds to the count for the team whose turn it is, then passes the turn on. */
function take(s: To21State, add: number, now: number, auto: boolean): To21State {
  const teamId = whose(s);
  const count = s.count + add;
  return {
    ...s,
    count,
    at: s.at + 1,
    turnStartedAt: now,
    history: [...s.history, { teamId, add, auto }],
    winner: count === s.target ? teamId : null,
  };
}

type C = z.infer<typeof Content>;
type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: To21State, _c: unknown, { role, now }: ViewCtx) {
  // Nobody's turn until the round starts, so no phone shows live buttons during the count.
  const turn = s.winner === null && now >= s.startsAt ? whose(s) : null;
  return {
    startsAt: s.startsAt,
    count: s.count,
    target: s.target,
    order: s.order,
    turn,
    turnEndsAt: s.turnStartedAt + s.turnMs,
    turnMs: s.turnMs,
    history: s.history,
    winner: s.winner,
    myTurn: role.kind !== "tv" && turn === role.teamId,
  };
}

const game: ShowdownGame<C, To21State> = {
  content: Content,
  demo: "Add 1, 2 or 3. Hit the number exactly to win!",
  timeout: "Out of time? 10 seconds, or you add 1.",
  rounds: (_c, teams) => lapRounds(teams),
  deal: (c, { round, teams, startsAt }) => ({
    startsAt,
    // A different team starts each round, so every team starts once (S24-AC6).
    order: leadOrder(teams, round - 1),
    at: 0,
    turnStartedAt: startsAt,
    count: 0,
    target: c.targets[(round - 1) % c.targets.length] ?? 21,
    turnMs: c.turnMs,
    history: [],
    winner: null,
  }),
  move(s, _c, { teamId, move, now }) {
    const parsed = z.object({ add: z.number().int() }).safeParse(move);
    if (!parsed.success) return { ok: false, message: "Add 1, 2 or 3." };
    if (s.winner !== null) return { ok: false, message: "This round is over." };
    if (now < s.startsAt) return { ok: false, message: "Not yet!" };
    if (whose(s) !== teamId) return { ok: false, message: "It isn't your turn." };
    const { add } = parsed.data;
    if (add < 1 || add > 3) return { ok: false, message: "Add 1, 2 or 3." };
    if (s.count + add > s.target)
      return { ok: false, message: `That goes past ${String(s.target)}.` };
    return { ok: true, state: take(s, add, now, false) };
  },
  // Too slow adds 1 (S27-AC3).
  tick(s, _c, now) {
    let out = s;
    while (out.winner === null && now >= out.turnStartedAt + out.turnMs && now >= out.startsAt)
      out = take(out, 1, out.turnStartedAt + out.turnMs, true);
    return out;
  },
  over: (s) => s.winner !== null,
  // The winner takes the round's share; every other team half of it (Khai, 2026-11-24).
  score: (s, c, teams) => {
    const win = c.points ?? Math.round(roundShare(lapRounds(teams.length)));
    return Object.fromEntries(teams.map((t) => [t, t === s.winner ? win : Math.round(win / 2)]));
  },
  turn: (s, _c, now): TurnInfo =>
    s.winner === null && now >= s.startsAt ? { teamId: whose(s), turnNo: s.at } : null,
  view,
};

export const to21 = defineShowdown(game);
export type To21View = ReturnType<typeof view>;
