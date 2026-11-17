import type { Session } from "./model";
import type { Rotation } from "./rotation";

/** The live session and the who's-up rotation for one event (S11-AC8). */
export type LiveState = { session: Session | null; rotation: Rotation };

export const EMPTY_LIVE: LiveState = { session: null, rotation: {} };

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
