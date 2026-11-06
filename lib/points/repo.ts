import type { Board, BoardRow, LedgerEntry, NewAward, RecentAward } from "./model";

export type Applied = { applied: boolean; total: number };

/**
 * The ledger and players' running totals (spec 04). Each write is one
 * transaction: the entry and the player's points change together.
 */
export interface PointsRepo {
  /** Adds an award unless its id exists; returns the player's points after. */
  award(slug: string, award: NewAward): Promise<Applied>;
  /** Reverses an entry once, with a `void` entry. Null when the entry doesn't exist. */
  voidEntry(
    slug: string,
    entryId: string,
    reason: string,
    createdBy: LedgerEntry["createdBy"],
  ): Promise<(Applied & { playerId: string }) | null>;
  total(slug: string, playerId: string): Promise<number>;
  entries(slug: string): Promise<LedgerEntry[]>;
  /** For rebuild: sets a player's running total. */
  setTotal(slug: string, playerId: string, total: number): Promise<void>;
  /** Deletes the event's ledger (S07-AC9); totals go with the players. */
  clear(slug: string): Promise<void>;
}

/** The leaderboard summary in the Realtime Database, updated one row at a time. */
export interface BoardRepo {
  upsert(slug: string, row: BoardRow): Promise<void>;
  remove(slug: string, playerId: string): Promise<void>;
  addRecent(slug: string, award: RecentAward): Promise<void>;
  /** Players highest first, and the newest awards first (at most RECENT_LIMIT). */
  read(slug: string): Promise<Board>;
  /** For rebuild: replaces every row. */
  replace(slug: string, rows: BoardRow[]): Promise<void>;
  /** Deletes the event's whole summary (S07-AC9). */
  clear(slug: string): Promise<void>;
}
