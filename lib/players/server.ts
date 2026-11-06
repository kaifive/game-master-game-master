import "server-only";
import { backend } from "@/lib/backend";
import { eventRuntime, requireEvent } from "@/lib/events/server";
import { pointsDeps, removeFromBoard, voidDonationsFrom } from "@/lib/points/server";
import { captainCheck, dropPlayer } from "@/lib/teams/server";
import { deviceUid } from "./identity";
import type { Identity, JoinBody } from "./model";
import { playersRuntime } from "./runtime";
import { deviceView, joinEvent, type PlayerDeps } from "./service";

/** Server-only entry for players: what the player routes call (spec 02). */

function deps(): PlayerDeps {
  const runtime = eventRuntime();
  return {
    players: playersRuntime().repo,
    status: (slug) => runtime.status(slug),
    isCaptain: (slug, playerId) => captainCheck(slug, playerId),
    // The old player takes back their donations, then leaves the leaderboard and their team (S04-AC5, S03-AC7).
    onForfeit: async (slug, playerId) => {
      await voidDonationsFrom(pointsDeps(), slug, playerId);
      await removeFromBoard(pointsDeps(), slug, playerId);
      await dropPlayer(slug, playerId);
    },
  };
}

/** The player store, for other features' services. */
export const playerRepo = () => playersRuntime().repo;

/** Route `auth`: the calling phone's device uid. */
export const requireDevice = (request: Request) => deviceUid(request, playersRuntime().verify);

export const getDevice = (slug: string | string[] | undefined, uid: string) =>
  deviceView(deps(), requireEvent(slug), uid);

export const joinPlayer = (slug: string | string[] | undefined, uid: string, body: JoinBody) =>
  joinEvent(deps(), requireEvent(slug), uid, body).then((player) => ({ player }));

/** How the phone proves which device it is: Firebase Auth, or self-made dev tokens. */
export const deviceIdentity = (): Identity => (backend() === "firebase" ? "firebase" : "dev");
