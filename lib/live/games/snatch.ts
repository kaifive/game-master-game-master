import { z } from "zod";
import { seededRandom, shuffled } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";

/**
 * Share or Snatch (spec 26, S26-AC3): teams play in pairs for a pot of 100.
 * Each secretly picks Share or Snatch: both share, 50 each; one snatches, it
 * takes all; both snatch, nobody gets anything.
 */
const Content = z.object({
  pot: z.number().int().min(2).max(1000).default(100),
  chooseMs: z.number().int().min(5000).max(60_000).default(15_000),
  /** Rounds with an even number of teams; an odd number plays one per team. */
  evenRounds: z.number().int().min(1).max(10).default(3),
});

export type Pair = [string, string];

export type SnatchState = {
  startsAt: number;
  closesAt: number;
  teams: string[];
  pot: number;
  pairs: Pair[];
  sitOut: string | null;
  choices: Record<string, "share" | "snatch">;
  /** The seeded team order the schedule runs over, kept for the whole game. */
  order: string[];
};

/** The seat that sits out when the number of teams is odd. */
const BYE = "";

/**
 * Pairs for a round by the circle method over a seeded order of teams: with
 * an odd number one seat is a bye, so over one round per team each team sits
 * out exactly once and no two teams meet twice. With an even number, rounds
 * run through the same schedule, so pairs repeat only once every pairing has
 * been played (always, with two teams).
 */
export function pairUp(order: readonly string[], round: number) {
  const seats = order.length % 2 === 1 ? [...order, BYE] : [...order];
  const m = seats.length;
  const r = (round - 1) % Math.max(1, m - 1);
  const rest = seats.slice(1);
  const turned = [
    seats[0] ?? BYE,
    ...rest.slice(rest.length - r),
    ...rest.slice(0, rest.length - r),
  ];
  const pairs: Pair[] = [];
  let sitOut: string | null = null;
  for (let i = 0; i < m / 2; i++) {
    const a = turned[i] ?? BYE;
    const b = turned[m - 1 - i] ?? BYE;
    if (a === BYE) sitOut = b;
    else if (b === BYE) sitOut = a;
    else pairs.push([a, b]);
  }
  return { pairs, sitOut };
}

/** Points for one pair: 50/50, 100/0 or 0/0 of the pot. */
export function pairPoints(
  a: "share" | "snatch",
  b: "share" | "snatch",
  pot: number,
): [number, number] {
  if (a === "share" && b === "share") return [pot / 2, pot / 2];
  if (a === "snatch" && b === "snatch") return [0, 0];
  return a === "snatch" ? [pot, 0] : [0, pot];
}

type C = z.infer<typeof Content>;
type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: SnatchState, _c: unknown, { role, revealed }: ViewCtx) {
  const mine = role.kind !== "tv" ? role.teamId : null;
  return {
    startsAt: s.startsAt,
    closesAt: s.closesAt,
    pot: s.pot,
    pairs: s.pairs,
    sitOut: s.sitOut,
    mine: mine ? (s.choices[mine] ?? null) : null,
    /** Who has chosen, without what: both sides show at once on the reveal. */
    lockedIn: Object.keys(s.choices),
    choices: revealed ? s.choices : null,
  };
}

const game: ShowdownGame<C, SnatchState> = {
  content: Content,
  demo: "Two teams, one pot. Both Share: you split it. One Snatches: they take it all. Both Snatch: nobody gets a thing.",
  timeout: "Out of time? You Share.",
  minTeams: 2,
  rounds: (c, teams) => (teams % 2 === 1 ? teams : c.evenRounds),
  deal(c, { seed, round, startsAt, teams, prev }) {
    const order = prev?.order ?? shuffled(teams, seededRandom(seed));
    const { pairs, sitOut } = pairUp(order, round);
    return {
      startsAt,
      closesAt: startsAt + c.chooseMs,
      teams: [...teams],
      pot: c.pot - (c.pot % 2),
      pairs,
      sitOut,
      choices: {},
      order,
    };
  },
  move(s, _c, { teamId, move, now }) {
    const parsed = z.object({ choice: z.enum(["share", "snatch"]) }).safeParse(move);
    if (!parsed.success) return { ok: false, message: "Share or Snatch?" };
    if (teamId === s.sitOut) return { ok: false, message: "You sit this one out." };
    if (now < s.startsAt) return { ok: false, message: "Not yet!" };
    if (now > s.closesAt) return { ok: false, message: "Time's up." };
    if (s.choices[teamId]) return { ok: false, message: "You've chosen." };
    return { ok: true, state: { ...s, choices: { ...s.choices, [teamId]: parsed.data.choice } } };
  },
  tick: (s) => s,
  // No choice counts as Share.
  close(s) {
    const choices = { ...s.choices };
    for (const [a, b] of s.pairs) {
      choices[a] ??= "share";
      choices[b] ??= "share";
    }
    return { ...s, choices };
  },
  over: (s, _c, now) => now > s.closesAt || s.pairs.flat().every((t) => s.choices[t]),
  score(s, _c, teams) {
    const out: Record<string, number> = Object.fromEntries(teams.map((t) => [t, 0]));
    for (const [a, b] of s.pairs) {
      const [pa, pb] = pairPoints(s.choices[a] ?? "share", s.choices[b] ?? "share", s.pot);
      out[a] = pa;
      out[b] = pb;
    }
    return out;
  },
  view,
};

export const snatch = defineShowdown(game);
export type SnatchView = ReturnType<typeof view>;
