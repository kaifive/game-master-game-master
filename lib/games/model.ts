import type { z } from "zod";
import type { PlayStatus } from "./repo";

/** What every game's logic gets besides its state: the server's clock. Keeps logic pure. */
export type GameContext = { now: number };

/** The box shown before a game starts (S08-AC9). */
export type Instructions = { title: string; lines: string[] };

export type MoveResult<S> = { ok: true; state: S } | { ok: false; message: string };

/**
 * The contract every solo game type follows (spec 08). Pure: no I/O, no
 * clock or randomness except what the server passes in. State must be plain JSON.
 */
export type GameLogic<C, S, V> = {
  content: z.ZodType<C>;
  instructions: (content: C) => Instructions;
  create: (content: C, seed: number, ctx: GameContext) => S;
  /** Applies time passing, such as deadlines. Returns the same state when nothing changed. */
  tick: (state: S, content: C, ctx: GameContext) => S;
  /** What the phone may see. Never an answer it hasn't played (S08-AC2). */
  view: (state: S, content: C, ctx: GameContext) => V;
  move: (state: S, content: C, move: unknown, ctx: GameContext) => MoveResult<S>;
  isOver: (state: S) => boolean;
  score: (state: S, points: number) => number;
  /** Counts every change, so a move for an old step can be ignored (S08-AC5). */
  step: (state: S) => number;
  /** One run only, even in a replayable event (S17-AC2). */
  once?: boolean;
  /** Points land as the score grows, while the run is still open (S17-AC4). */
  progressive?: boolean;
  /** Finished, but scored later by the host (S17-AC2). */
  waiting?: (state: S) => boolean;
};

/** A game's logic with its types erased, for the registry. */
export type AnyGameLogic = GameLogic<unknown, unknown, unknown>;

export const defineGame = <C, S, V>(logic: GameLogic<C, S, V>) => logic as unknown as AnyGameLogic;

/** What the phone gets back from starting a game or making a move. */
export type PlayResponse = {
  view: unknown;
  status: PlayStatus;
  /** This run's points. */
  points: number;
  /** The best finished run, which is what counts (S08-AC12). */
  best: number;
  step: number;
  /** One run only: the result offers no Play again (S17-AC2, S18-AC3). */
  once?: true;
};

/** A player's plays by game id, for the hub (S08-AC7). */
export type HubPlays = Record<
  string,
  {
    status: PlayStatus;
    best: number;
    runs: number;
    /** One run only: no Again (S17-AC5). */
    once?: true;
    /** Finished, but its points come later (a jar before the reveal). */
    waiting?: true;
  }
>;

/** Where a player sits for team games: only a captain plays them, for the team (S03-AC5). */
export type Seat = {
  phase: "individual" | "team";
  team: { id: string; name: string; color: number } | null;
  isCaptain: boolean;
};
