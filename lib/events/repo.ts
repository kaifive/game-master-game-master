import type { EventSettings, EventStatus } from "./model";

export type Standing = { id: string; name: string; points: number; team?: number };
export type FinalStandings = { teams: Standing[]; players: Standing[] };

/** Runtime facts about an event that live in Firebase, not in its file. */
export interface EventRuntimeRepo {
  status(slug: string): Promise<EventStatus>;
  /** Set only by the admin: Start, End and Reopen (ADR-024, S07-AC2). */
  setStatus(slug: string, status: EventStatus): Promise<void>;
  /** The phase and maximum team size the host set (spec 03). */
  settings(slug: string): Promise<EventSettings>;
  setSettings(slug: string, settings: EventSettings): Promise<void>;
  finalStandings(slug: string): Promise<FinalStandings | null>;
}
