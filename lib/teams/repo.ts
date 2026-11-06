import type { Team, TeamsSummary } from "./model";

/**
 * Teams for one event (spec 03). Every write is atomic and throws AppError
 * CONFLICT (on a team already, full, name taken), NOT_FOUND or BAD_REQUEST.
 */
export interface TeamRepo {
  list(slug: string): Promise<Team[]>;
  /** A new team led by `captainId`, who becomes its first member (S03-AC2). */
  create(slug: string, captainId: string, color: number): Promise<Team>;
  /** Names a team; names are unique per event (S03-AC2). */
  rename(slug: string, teamId: string, name: string, key: string): Promise<void>;
  /** A player joins a team with room; players can't switch (S03-AC3). */
  join(slug: string, teamId: string, playerId: string, maxSize: number): Promise<void>;
  /** The host moves a player, even onto a full team (S03-AC4). */
  move(slug: string, playerId: string, teamId: string): Promise<void>;
  /** The host makes another member the captain (S03-AC4). */
  setCaptain(slug: string, teamId: string, playerId: string): Promise<void>;
  /** A removed or forfeited player leaves their team; a captain leaves it captainless. */
  drop(slug: string, playerId: string): Promise<void>;
  clear(slug: string): Promise<void>;
}

/** The teams summary phones poll (spec 03): one value per event, replaced on every change. */
export interface TeamSummaryRepo {
  read(slug: string): Promise<TeamsSummary | null>;
  write(slug: string, summary: TeamsSummary): Promise<void>;
}
