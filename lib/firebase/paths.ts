import { EntityId, Slug } from "@/lib/ids";

/**
 * Every Firebase path, built in one place (docs/reference/data-model.md).
 * Each segment is validated so a bad slug or id can never reach another
 * event's data or a parent path.
 */
function slug(value: string): string {
  if (!Slug.safeParse(value).success)
    throw new Error(`Invalid event slug: ${JSON.stringify(value)}`);
  return value;
}

function id(value: string): string {
  if (!EntityId.safeParse(value).success) throw new Error(`Invalid id: ${JSON.stringify(value)}`);
  return value;
}

const event = (s: string) => `events/${slug(s)}`;

/** Firestore: durable records. */
export const fs = {
  event,
  devices: (s: string) => `${event(s)}/devices`,
  device: (s: string, uid: string) => `${event(s)}/devices/${id(uid)}`,
  nicknames: (s: string) => `${event(s)}/nicknames`,
  plays: (s: string) => `${event(s)}/plays`,
  players: (s: string) => `${event(s)}/players`,
  player: (s: string, playerId: string) => `${event(s)}/players/${id(playerId)}`,
  nickname: (s: string, key: string) => `${event(s)}/nicknames/${id(key)}`,
  teams: (s: string) => `${event(s)}/teams`,
  team: (s: string, teamId: string) => `${event(s)}/teams/${id(teamId)}`,
  ledger: (s: string) => `${event(s)}/ledger`,
  ledgerEntry: (s: string, entryId: string) => `${event(s)}/ledger/${id(entryId)}`,
  play: (s: string, gameId: string, playerId: string) =>
    `${event(s)}/plays/${id(gameId)}_${id(playerId)}`,
  photos: (s: string) => `${event(s)}/photos`,
  photo: (s: string, photoId: string) => `${event(s)}/photos/${id(photoId)}`,
  vote: (s: string, gameId: string, promptId: string, playerId: string) =>
    `${event(s)}/votes/${id(gameId)}_${id(promptId)}_${id(playerId)}`,
};

/** Realtime Database: live, fast-changing state. */
export const rtdb = {
  presence: (s: string, uid: string) => `presence/${slug(s)}/${id(uid)}`,
  presenceAll: (s: string) => `presence/${slug(s)}`,
  leaderboard: (s: string) => `leaderboard/${slug(s)}`,
  leaderboardPlayers: (s: string) => `leaderboard/${slug(s)}/players`,
  leaderboardPlayer: (s: string, playerId: string) =>
    `leaderboard/${slug(s)}/players/${id(playerId)}`,
  leaderboardRecent: (s: string) => `leaderboard/${slug(s)}/recent`,
  leaderboardRecentEntry: (s: string, entryId: string) =>
    `leaderboard/${slug(s)}/recent/${id(entryId)}`,
  liveSession: (s: string) => `live/${slug(s)}/session`,
  captain: (s: string, teamId: string) => `live/${slug(s)}/captains/${id(teamId)}`,
  buzzes: (s: string, roundId: string) => `live/${slug(s)}/buzzes/${id(roundId)}`,
  buzz: (s: string, roundId: string, teamId: string) =>
    `live/${slug(s)}/buzzes/${id(roundId)}/${id(teamId)}`,
  moments: (s: string) => `moments/${slug(s)}`,
};
