/** The ledger (spec 04, ADR-006). Points move only through entries the server writes. */

export type EntrySource = { kind: "game" | "manual"; id: string };

export type LedgerEntry = {
  id: string;
  kind: "award" | "void";
  /** Signed: a deduction is a negative award, and a void is the opposite of what it voids. */
  points: number;
  to: { kind: "player"; id: string };
  reason: string;
  source: EntrySource;
  voids?: string;
  createdBy: "server" | "admin";
};

/** An award to write. Its id comes from its source, so a retry can't pay twice. */
export type NewAward = Omit<LedgerEntry, "kind" | "voids">;

/** A player's row in the leaderboard summary. */
export type BoardRow = { id: string; nickname: string; teamId: string | null; points: number };

/** A recent award, for the TV's toasts (S04-AC4). */
export type RecentAward = {
  id: string;
  playerId: string;
  nickname: string;
  points: number;
  reason: string;
  at: number;
};

/** The leaderboard summary: every active player's points and the latest awards. */
export type Board = { players: BoardRow[]; recent: RecentAward[] };

export const RECENT_LIMIT = 20;

/** Where a game award's id comes from: one per player, game and run (S04-AC1). */
export const gameAwardId = (gameId: string, playerId: string, run: number) =>
  `game_${gameId}_${playerId}_${String(run)}`;
