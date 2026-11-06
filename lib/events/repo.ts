import type { EventStatus } from "./model";

export type Standing = { id: string; name: string; points: number; team?: number };
export type FinalStandings = { teams: Standing[]; players: Standing[] };

/** Runtime facts about an event that live in Firebase, not in its file. */
export interface EventRuntimeRepo {
  status(slug: string): Promise<EventStatus>;
  /** Set only by the admin: Start, End and Reopen (ADR-024, S07-AC2). */
  setStatus(slug: string, status: EventStatus): Promise<void>;
  finalStandings(slug: string): Promise<FinalStandings | null>;
}
