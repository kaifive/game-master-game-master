import type { GuestList } from "./model";

/**
 * Where an event's guest list lives: one value, changed atomically, written
 * only by the server (ADR-047).
 */
export interface GuestRepo {
  read(slug: string): Promise<GuestList>;
  /** `change` sees the current list and returns the next, or null to leave it. Resolves with what's stored after. */
  update(slug: string, change: (current: GuestList) => GuestList | null): Promise<GuestList>;
  clear(slug: string): Promise<void>;
}
