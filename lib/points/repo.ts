import type {
  Board,
  BoardRow,
  EntryTarget,
  LedgerEntry,
  NewAward,
  NewDonation,
  RecentAward,
  TeamRow,
} from "./model";

export type Applied = { applied: boolean; total: number };

/**
 * The ledger and running totals of players and teams (spec 04, spec 03).
 * Each write is one transaction: the entry and the total change together.
 */
export interface PointsRepo {
  /** Adds an award unless its id exists; returns the recipient's points after. */
  award(slug: string, award: NewAward): Promise<Applied>;
  /**
   * A donation: the player's deduction and the team's award in one transaction,
   * refused (BAD_REQUEST) beyond the player's points (S03-AC6).
   */
  donate(
    slug: string,
    donation: NewDonation,
  ): Promise<{ applied: boolean; player: number; team: number }>;
  /** Reverses an entry once, with a `void` entry. Null when the entry doesn't exist. */
  voidEntry(
    slug: string,
    entryId: string,
    reason: string,
    createdBy: LedgerEntry["createdBy"],
  ): Promise<(Applied & { to: EntryTarget }) | null>;
  total(slug: string, playerId: string): Promise<number>;
  teamTotal(slug: string, teamId: string): Promise<number>;
  entries(slug: string): Promise<LedgerEntry[]>;
  /** Donation entries only, for Controls (S03-AC6). */
  donations(slug: string): Promise<LedgerEntry[]>;
  /** For rebuild: sets a player's or team's running total. */
  setTotal(slug: string, to: EntryTarget, total: number): Promise<void>;
  /** Deletes the event's ledger (S07-AC9); totals go with the players and teams. */
  clear(slug: string): Promise<void>;
}

/** A team row's change: its points, its name and color, or both. */
export type TeamRowPatch = Pick<TeamRow, "id"> & Partial<Omit<TeamRow, "id">>;

/** The leaderboard summary in the Realtime Database, updated one row at a time. */
export interface BoardRepo {
  upsert(slug: string, row: BoardRow): Promise<void>;
  remove(slug: string, playerId: string): Promise<void>;
  /** Merges into a team's row; a row without a name yet isn't shown. */
  upsertTeam(slug: string, row: TeamRowPatch): Promise<void>;
  addRecent(slug: string, award: RecentAward): Promise<void>;
  /** Players and named teams highest first, and the newest awards first (at most RECENT_LIMIT). */
  read(slug: string): Promise<Board>;
  /** For rebuild: replaces every player row and every team's points. */
  replace(slug: string, rows: BoardRow[], teams?: TeamRowPatch[]): Promise<void>;
  /** Deletes the event's whole summary (S07-AC9). */
  clear(slug: string): Promise<void>;
}
