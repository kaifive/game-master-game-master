/** The ledger (spec 04, ADR-006). Points move only through entries the server writes. */

/** Who an entry pays: a player, or a team (spec 03). */
export type EntryTarget = { kind: "player" | "team"; id: string };

export type EntrySource = { kind: "game" | "manual" | "donation"; id: string };

export type LedgerEntry = {
  id: string;
  kind: "award" | "void";
  /** Signed: a deduction is a negative award, and a void is the opposite of what it voids. */
  points: number;
  to: EntryTarget;
  /** A donation's team award names the player who gave it (S03-AC6). */
  from?: { kind: "player"; id: string };
  reason: string;
  source: EntrySource;
  voids?: string;
  createdBy: "server" | "admin";
};

/** An award to write. Its id comes from its source, so a retry can't pay twice. */
export type NewAward = Omit<LedgerEntry, "kind" | "voids">;

/** A donation to write: whole points from a player to a team (S03-AC6). */
export type NewDonation = { id: string; playerId: string; teamId: string; points: number };

/** A player's row in the leaderboard summary. */
export type BoardRow = { id: string; nickname: string; teamId: string | null; points: number };

/** A team's row in the leaderboard summary (spec 03). */
export type TeamRow = { id: string; name: string; color: number; points: number };

/** A recent award, for the TV's toasts (S04-AC4). */
export type RecentAward = {
  id: string;
  /** Who got it: a player's id, or a team's. */
  playerId: string;
  nickname: string;
  points: number;
  reason: string;
  at: number;
  /** For a donation: who gave it (S03-AC8). */
  from?: string;
};

/** The leaderboard summary: every active player's and team's points, and the latest awards. */
export type Board = { players: BoardRow[]; teams: TeamRow[]; recent: RecentAward[] };

export const RECENT_LIMIT = 20;

/** Where a game award's id comes from: one per player (or team), game and run (S04-AC1). */
export const gameAwardId = (gameId: string, playerId: string, run: number) =>
  `game_${gameId}_${playerId}_${String(run)}`;

/** A donation's two entries: the player's deduction and the team's award (S03-AC6). */
export const donationIds = (id: string) => ({ from: `donation_${id}`, to: `donation_${id}_team` });
