import type { z } from "zod";

/**
 * Live sessions (spec 11) and showdowns (spec 24): the host runs one game for
 * the whole room on the TV, and captains' phones are the controllers.
 */

/** The host's steps through a showdown (S24-AC1). */
export type Step = "intro" | "play" | "results" | "final";

/** What the TV shows: the leaderboard, the showdown (S24-AC9, ADR-038), or the raffle (spec 32). */
export type Screen = "leaderboard" | "showdown" | "raffle";

/** Most teams a showdown is built for: the event's team cap (S24-AC11). */
export { MAX_TEAMS } from "@/lib/teams";

/** A team taking part, as it was when the session started. */
export type LiveTeam = {
  id: string;
  name: string;
  color: number;
  captainId: string | null;
  /** Members in join order, captain first: who can be this team's captain view or member view. */
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
  /** The game's own state for the current round, or null between rounds. */
  state: unknown;
  /** Points each team has won in this session so far. */
  scores: Record<string, number>;
  /** The last round's points, shown on the results step. */
  roundPoints: Record<string, number> | null;
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
  /** What happens to a team that runs out of time, said on the intro (blind review). */
  timeout?: string;
  /** How many rounds, for this many teams (fair leads: often one per team, S24-AC6). */
  rounds: (c: C, teams: number) => number;
  /** Fewest teams it can be played with (S24-AC11); 1 when left out. */
  minTeams?: number;
  /**
   * A round's starting state; `startsAt` is the shared server time it begins
   * (S24-AC7). `prev` is the last round's final state (null in round 1), for
   * games that carry something from round to round, like Auction's numbers.
   */
  deal: (
    c: C,
    ctx: { seed: number; round: number; teams: string[]; startsAt: number; prev: S | null },
  ) => S;
  /** A captain's move for their team, checked against the server clock. */
  move: (s: S, c: C, ctx: { teamId: string; move: unknown; now: number }) => MoveResult<S>;
  /** Time passing: windows closing, turns timing out. Returns the same object when nothing changed. */
  tick: (s: S, c: C, now: number) => S;
  /**
   * Settles anything still open when the round closes, even early: a team
   * that didn't answer gets its default (Bank, Share, its lowest number).
   */
  close?: (s: S, c: C, now: number) => S;
  /** Whether the round has nothing left to wait for (Next is allowed any time regardless). */
  over: (s: S, c: C, now: number) => boolean;
  /** Points per team for the round; teams that didn't play score 0. */
  score: (s: S, c: C, teams: string[]) => Record<string, number>;
  /** Whose turn it is, in a turn game. */
  turn?: (s: S, c: C, now: number) => TurnInfo;
  /**
   * The host's own steps inside a round, from Controls (spec 12's buzzer:
   * open, right, wrong, undo). Games without them only have Next.
   */
  host?: (s: S, c: C, ctx: { action: unknown; now: number }) => MoveResult<S>;
  /** What Controls sees of a round, which may include its answer (spec 12). The TV's view when left out. */
  hostView?: (s: S, c: C, ctx: { now: number; teams: string[] }) => unknown;
  /**
   * Next from a round pays its points and goes straight on to the next round
   * (or the final standings), with no results step between (spec 12: the
   * round shows its own result as it's judged).
   */
  skipResults?: boolean;
  /** Controls' words for Next: starting a round ("Show question 1") and moving on ("Next question"). */
  labels?: { start: (round: number) => string; next: string };
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
export const START_LEAD_MS = 3000;

/**
 * How long after a round's time is up an answer sent just before it can
 * still arrive: the server takes it, and the round closes only after (Khai,
 * 2026-11-24: phones send what's on them as time runs out).
 */
export const LATE_MS = 1000;
