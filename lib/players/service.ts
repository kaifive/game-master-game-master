import { AppError } from "@/lib/errors";
import type { EventConfig, EventStatus } from "@/lib/events";
import type { DeviceView, JoinBody, PlayerSummary } from "./model";
import type { PlayerRepo } from "./repo";
import { canJoin, checkNickname, codeMatches, MESSAGES } from "./rules";

export type PlayerDeps = {
  players: PlayerRepo;
  status: (slug: string) => Promise<EventStatus>;
};

const forbidden = (message: string, reason: string) =>
  new AppError("FORBIDDEN", message, { details: { reason } });

/** The device's players in this event (S02-AC1). */
export const deviceView = (
  deps: PlayerDeps,
  event: EventConfig,
  uid: string,
): Promise<DeviceView> => deps.players.device(event.slug, uid);

/**
 * Joins a player to an event (spec 02): event open, name allowed, device not
 * banned, and the join code needed only for a device's first player.
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
  if (device.players.length === 0 && !codeMatches(body.code, event.joinCode))
    throw forbidden(MESSAGES.wrongCode, "code");
  return deps.players.join(event.slug, uid, {
    nickname: name.nickname,
    key: name.key,
    maxPerDevice: event.maxPlayersPerDevice,
  });
}
