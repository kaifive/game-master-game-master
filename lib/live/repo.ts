import type { Screen, Session } from "./model";
import type { Played } from "./played";

/** One event's live state: the session, Who's played and the TV screen (S11-AC8, ADR-038). */
export type LiveState = { session: Session | null; played: Played; screen: Screen };

export const EMPTY_LIVE: LiveState = { session: null, played: {}, screen: "leaderboard" };

/** Reads stored live state, filling in anything an older value lacks. */
export function normalizeLive(raw: unknown): LiveState {
  if (!raw || typeof raw !== "object") return EMPTY_LIVE;
  const v = raw as Partial<LiveState>;
  return {
    session: v.session ?? null,
    played: v.played ?? {},
    screen: v.screen === "showdown" ? "showdown" : "leaderboard",
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
