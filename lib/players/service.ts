import { AppError } from "@/lib/errors";
import type { EventConfig, EventStatus } from "@/lib/events";
import type { DeviceView, JoinBody, PlayerSummary } from "./model";
import type { PlayerRepo } from "./repo";
import { canJoin, checkNickname, codeMatches, MESSAGES } from "./rules";

export type PlayerDeps = {
  players: PlayerRepo;
  status: (slug: string) => Promise<EventStatus>;
  /** Whether a player leads a team (spec 03); captains can't start over. */
  isCaptain: (slug: string, playerId: string) => Promise<boolean>;
  /** A player was replaced by starting over: take them off the leaderboard (S04-AC5). */
  onForfeit: (slug: string, playerId: string) => Promise<void>;
};

const forbidden = (message: string, reason: string) =>
  new AppError("FORBIDDEN", message, { details: { reason } });

/** The phone's player in this event, and the restarts it has left (S02-AC1, AC7). */
export async function deviceView(
  deps: PlayerDeps,
  event: EventConfig,
  uid: string,
): Promise<DeviceView> {
  const d = await deps.players.device(event.slug, uid);
  return {
    banned: d.banned,
    player: d.player,
    restartsLeft: Math.max(0, event.restartsPerDevice - d.restarts),
  };
}

/**
 * Joins a player to an event (spec 02): event open, name allowed, phone not
 * banned, and the join code for a phone's first player. With `restart`, the
 * phone's player is replaced and forfeited, within the event's limit (S02-AC7).
 */
export async function joinEvent(
  deps: PlayerDeps,
  event: EventConfig,
  uid: string,
  body: JoinBody,
): Promise<PlayerSummary> {
  if (!canJoin(await deps.status(event.slug))) throw forbidden(MESSAGES.ended, "ended");
  const name = checkNickname(body.nickname, event.blockedNames);
  if (!name.ok) throw new AppError("BAD_REQUEST", name.message, { details: { reason: "name" } });
  const device = await deps.players.device(event.slug, uid);
  if (device.banned) throw forbidden(MESSAGES.banned, "banned");
  const player = { nickname: name.nickname, key: name.key };
  if (body.restart) {
    if (!device.player) throw new AppError("BAD_REQUEST", MESSAGES.nothingToRestart);
    if (await deps.isCaptain(event.slug, device.player.id))
      throw forbidden(MESSAGES.captain, "captain");
    const next = await deps.players.restart(event.slug, uid, player, event.restartsPerDevice);
    await deps.onForfeit(event.slug, device.player.id);
    return next;
  }
  if (!device.player && device.restarts === 0 && !codeMatches(body.code, event.joinCode))
    throw forbidden(MESSAGES.wrongCode, "code");
  return deps.players.join(event.slug, uid, player);
}
