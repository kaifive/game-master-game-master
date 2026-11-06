import type { PlayerSummary } from "./model";

export type NewPlayer = { nickname: string; key: string };

/** A phone as stored: its current player and how many times it has started over. */
export type StoredDevice = { banned: boolean; player: PlayerSummary | null; restarts: number };

/**
 * Players, devices and nicknames for one event (spec 02). One player per
 * phone (ADR-027). Both writes are atomic and throw AppError FORBIDDEN
 * (banned) or CONFLICT (name taken, phone has a player, no restarts left).
 */
export interface PlayerRepo {
  device(slug: string, uid: string): Promise<StoredDevice>;
  /** The phone's first player; the same name again returns the same player. */
  join(slug: string, uid: string, player: NewPlayer): Promise<PlayerSummary>;
  /**
   * Replaces the phone's player: the old one is forfeited (off the
   * leaderboard, name freed) and the phone uses one of its restarts.
   */
  restart(
    slug: string,
    uid: string,
    player: NewPlayer,
    maxRestarts: number,
  ): Promise<PlayerSummary>;
}
