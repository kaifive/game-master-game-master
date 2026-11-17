import type { z } from "zod";

/**
 * Live sessions (spec 11) and showdowns (spec 24): the host runs one game for
 * the whole room on the TV, and captains' phones are the controllers.
 */

/** The host's steps through a showdown (S24-AC1). */
export type Step = "intro" | "pick" | "play" | "results" | "final";

/** A team taking part, as it was when the session started. */
export type LiveTeam = {
  id: string;
  name: string;
  color: number;
  captainId: string | null;
  /** Members in join order, captain first; each with the nickname to show. */
  members: { id: string; nickname: string }[];
};

/** Who's asking for a view (S11-AC3). */
export type Role =
  { kind: "tv" } | { kind: "captain"; teamId: string } | { kind: "member"; teamId: string };

export type Session = {
  id: string;
  gameId: string;
  type: string;
  title: string;
  step: Step;
  /** 1-based; 0 before the first round. */
  round: number;
  rounds: number;
  seed: number;
  teams: LiveTeam[];
  /** Who's up for each team this round (or this turn, in turn games). */
  up: Record<string, string | null>;
  /** The game's own state for the current round, or null between rounds. */
  state: unknown;
  /** Points each team has won in this session so far. */
  scores: Record<string, number>;
  /** The last round's points, shown on the results step. */
  roundPoints: Record<string, number> | null;
  /** In a turn game, the turn the current up player was given for. */
  upTurn: number | null;
  /** Each captain's phone, once it has proved itself (ADR-037: no Firestore read per poll). */
  captainDevices: Record<string, string>;
  revision: number;
  startedAt: number;
};

/** A turn game's current turn: whose it is, and a number that goes up with every turn (S24-AC6). */
export type TurnInfo = { teamId: string; turnNo: number } | null;

/** What a game decides about a move. */
export type MoveResult<S> = { ok: true; state: S } | { ok: false; message: string };

/**
 * One showdown type (specs 25 to 27). Pure functions only: the server runs
 * them, the play tests run them with bots, and nothing here does I/O.
 */
export type ShowdownGame<C = unknown, S = unknown> = {
  content: z.ZodType<C>;
  /** One line under the TV demo, and on phones during the intro (S24-AC4). */
  demo: string;
  /** How many rounds, for this many teams (fair leads: often one per team, S24-AC6). */
  rounds: (c: C, teams: number) => number;
  /** Turn games pick a new teammate each turn, automatically (spec 27). */
  turns?: boolean;
  /** A round's starting state; `startsAt` is the shared server time it begins (S24-AC7). */
  deal: (c: C, ctx: { seed: number; round: number; teams: string[]; startsAt: number }) => S;
  /** A captain's move for their team, checked against the server clock. */
  move: (s: S, c: C, ctx: { teamId: string; move: unknown; now: number }) => MoveResult<S>;
  /** Time passing: windows closing, turns timing out. Returns the same object when nothing changed. */
  tick: (s: S, c: C, now: number) => S;
  /** Whether the round has nothing left to wait for (Next is allowed any time regardless). */
  over: (s: S, c: C, now: number) => boolean;
  /** Points per team for the round; teams that didn't play score 0. */
  score: (s: S, c: C, teams: string[]) => Record<string, number>;
  /** Whose turn it is, in a turn game. */
  turn?: (s: S, c: C, now: number) => TurnInfo;
  /** What a role may see. `revealed` is true on the results step. Never a secret before then (S24-AC7). */
  view: (
    s: S,
    c: C,
    ctx: { role: Role; revealed: boolean; now: number; teams: string[] },
  ) => unknown;
};

/** Any showdown, once its content type is erased. */
export type AnyShowdown = ShowdownGame;

/** Erases a game's types for the registry, keeping it type-checked where it's written. */
export const defineShowdown = <C, S>(g: ShowdownGame<C, S>): AnyShowdown =>
  g as unknown as AnyShowdown;

/** How far ahead a round's shared start is set, so every device has it in hand (S11-AC5). */
export const START_LEAD_MS = 2000;
