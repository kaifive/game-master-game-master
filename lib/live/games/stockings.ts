import { z } from "zod";
import { seededRandom } from "@/lib/games";
import { defineShowdown, type Role, type ShowdownGame } from "../model";

/**
 * Stocking Stuffer (spec 26, S26-AC2): every team still in picks Open or
 * Bank at the same time. Openers get a stocking: points into their pot, or
 * coal, which empties it and puts them out for the round. Bankers keep their
 * pot. The round ends when everyone has banked or hit coal.
 */
const Content = z.object({
  rounds: z.number().int().min(1).max(10).default(5),
  min: z.number().int().min(1).max(100).default(5),
  max: z.number().int().min(1).max(200).default(30),
  /** One stocking in this many is coal. */
  coalOneIn: z.number().int().min(2).max(20).default(6),
  chooseMs: z.number().int().min(4000).max(30_000).default(10_000),
});

/** How long each opening shows on the TV before the next choice. */
export const REVEAL_MS = 3000;
/** Openings in a round before everyone still in banks anyway. */
export const MAX_OPENINGS = 12;

export type Found = { kind: "stocking"; value: number } | { kind: "coal" };
export type Opened = Found | { kind: "bank" };
export type StockingStatus = "in" | "banked" | "coal";

export type StockingState = {
  seed: number;
  teams: string[];
  /** Which opening this is, from 1. */
  opening: number;
  startsAt: number;
  closesAt: number;
  /** When the last opening's reveal ends and the next choice starts; null while choosing. */
  revealUntil: number | null;
  choices: Record<string, "open" | "bank">;
  pots: Record<string, number>;
  status: Record<string, StockingStatus>;
  /** What each team got at each opening. */
  history: Record<string, Opened>[];
  chooseMs: number;
  min: number;
  max: number;
  coalOneIn: number;
};

/** The stocking a team finds at one opening: the same for a given seed, team and opening. */
export function stockingFor(
  s: Pick<StockingState, "seed" | "min" | "max" | "coalOneIn">,
  teamIndex: number,
  opening: number,
): Found {
  const random = seededRandom(
    (s.seed ^ Math.imul(teamIndex + 1, 0x9e3779b1) ^ Math.imul(opening, 0x85ebca6b)) >>> 0,
  );
  random();
  if (random() < 1 / s.coalOneIn) return { kind: "coal" };
  return { kind: "stocking", value: s.min + Math.floor(random() * (s.max - s.min + 1)) };
}

const stillIn = (s: StockingState) => s.teams.filter((t) => s.status[t] === "in");

/** Settles one opening: missing choices bank; openers get their stockings. */
function resolve(s: StockingState, now: number, everyoneBanks = false): StockingState {
  const pots = { ...s.pots };
  const status = { ...s.status };
  const got: Record<string, Opened> = {};
  s.teams.forEach((t, i) => {
    if (status[t] !== "in") return;
    const choice = everyoneBanks ? "bank" : (s.choices[t] ?? "bank");
    if (choice === "bank") {
      status[t] = "banked";
      got[t] = { kind: "bank" };
      return;
    }
    const found = stockingFor(s, i, s.opening);
    got[t] = found;
    if (found.kind === "coal") {
      pots[t] = 0;
      status[t] = "coal";
    } else pots[t] = (pots[t] ?? 0) + found.value;
  });
  return {
    ...s,
    pots,
    status,
    history: [...s.history, got],
    choices: {},
    revealUntil: now + REVEAL_MS,
  };
}

type C = z.infer<typeof Content>;
type ViewCtx = { role: Role; revealed: boolean; now: number };

function view(s: StockingState, _c: unknown, { role }: ViewCtx) {
  return {
    opening: s.opening,
    startsAt: s.startsAt,
    closesAt: s.closesAt,
    revealUntil: s.revealUntil,
    pots: s.pots,
    status: s.status,
    history: s.history,
    // Choices are made at the same time: nobody sees another's until the opening.
    mine: role.kind !== "tv" ? (s.choices[role.teamId] ?? null) : null,
    lockedIn: Object.keys(s.choices),
    done: stillIn(s).length === 0,
  };
}

const game: ShowdownGame<C, StockingState> = {
  content: Content.refine((c) => c.min <= c.max, "min must not be above max"),
  demo: "Open another stocking for more points, or bank what you've got. Coal loses the lot!",
  rounds: (c) => c.rounds,
  deal: (c, { seed, startsAt, teams }) => ({
    seed,
    teams: [...teams],
    opening: 1,
    startsAt,
    closesAt: startsAt + c.chooseMs,
    revealUntil: null,
    choices: {},
    pots: Object.fromEntries(teams.map((t) => [t, 0])),
    status: Object.fromEntries(teams.map((t) => [t, "in" as const])),
    history: [],
    chooseMs: c.chooseMs,
    min: c.min,
    max: c.max,
    coalOneIn: c.coalOneIn,
  }),
  move(s, _c, { teamId, move, now }) {
    const parsed = z.object({ choice: z.enum(["open", "bank"]) }).safeParse(move);
    if (!parsed.success) return { ok: false, message: "Open or Bank?" };
    if (s.status[teamId] !== "in") return { ok: false, message: "You're done this round." };
    if (s.revealUntil !== null || now < s.startsAt) return { ok: false, message: "Not yet!" };
    if (now > s.closesAt) return { ok: false, message: "Time's up." };
    if (s.choices[teamId]) return { ok: false, message: "You've chosen." };
    const next = { ...s, choices: { ...s.choices, [teamId]: parsed.data.choice } };
    // Everyone still in has chosen: open at once.
    return {
      ok: true,
      state: stillIn(next).every((t) => next.choices[t]) ? resolve(next, now) : next,
    };
  },
  tick(s, _c, now) {
    if (stillIn(s).length === 0) return s;
    if (s.revealUntil !== null) {
      if (now < s.revealUntil) return s;
      const opening = s.opening + 1;
      // A round can't run forever: past the limit, everyone still in banks.
      if (opening > MAX_OPENINGS) return resolve({ ...s, opening }, now, true);
      return { ...s, opening, revealUntil: null, startsAt: now, closesAt: now + s.chooseMs };
    }
    return now > s.closesAt ? resolve(s, now) : s;
  },
  // Closing early: an open choice is settled, then everyone still in banks.
  close(s, _c, now) {
    let out = s.revealUntil === null && Object.keys(s.choices).length > 0 ? resolve(s, now) : s;
    if (stillIn(out).length > 0) out = resolve(out, now, true);
    return out;
  },
  over: (s, _c, now) => stillIn(s).length === 0 && (s.revealUntil === null || now >= s.revealUntil),
  score: (s, _c, teams) =>
    Object.fromEntries(teams.map((t) => [t, s.status[t] === "banked" ? (s.pots[t] ?? 0) : 0])),
  view,
};

export const stockings = defineShowdown(game);
export type StockingView = ReturnType<typeof view>;
