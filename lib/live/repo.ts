import type { Screen, Session } from "./model";
import type { Played } from "./played";

/**
 * One event's live state: the session, Who's played, the TV screen (S11-AC8,
 * ADR-038), and the showdowns already played tonight, by game id, for the
 * TV's menu (Khai, 2026-11-24).
 */
export type LiveState = {
  session: Session | null;
  played: Played;
  screen: Screen;
  finished: string[];
};

export const EMPTY_LIVE: LiveState = {
  session: null,
  played: {},
  screen: "leaderboard",
  finished: [],
};

/** Marks the session's game as played, once it has shown a round's results. */
export function withFinished(state: LiveState, s: Session | null): LiveState {
  const shown = s !== null && (s.step === "results" || s.step === "final" || s.round > 1);
  return !s || !shown || state.finished.includes(s.gameId)
    ? state
    : { ...state, finished: [...state.finished, s.gameId] };
}

/** Reads stored live state, filling in anything an older value lacks. */
export function normalizeLive(raw: unknown): LiveState {
  if (!raw || typeof raw !== "object") return EMPTY_LIVE;
  const v = raw as Partial<LiveState>;
  return {
    session: v.session ?? null,
    played: v.played ?? {},
    screen: v.screen === "showdown" ? "showdown" : "leaderboard",
    finished: Array.isArray(v.finished) ? v.finished.filter((f) => typeof f === "string") : [],
  };
}

/** Where live state lives: written only by the server (ADR-037). */
export interface LiveRepo {
  read(slug: string): Promise<LiveState>;
  /**
   * Changes the state atomically: `change` sees the current state and returns
   * the next, or null to leave it. Resolves with whatever is stored after.
   */
  update(slug: string, change: (current: LiveState) => LiveState | null): Promise<LiveState>;
  clear(slug: string): Promise<void>;
}
