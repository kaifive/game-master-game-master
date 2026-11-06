import "server-only";
import { AppError } from "@/lib/errors";
import { backend } from "@/lib/backend";
import type { EventConfig } from "@/lib/events";
import { eventRuntime, getEvent } from "@/lib/events/server";
import { deviceUid } from "./identity";
import type { Identity, JoinBody } from "./model";
import { playersRuntime } from "./runtime";
import { deviceView, joinEvent, type PlayerDeps } from "./service";

/** Server-only entry for players: what the player routes call (spec 02). */

function deps(): PlayerDeps {
  const runtime = eventRuntime();
  return { players: playersRuntime().repo, status: (slug) => runtime.status(slug) };
}

function requireEvent(slug: string | string[] | undefined): EventConfig {
  const event = typeof slug === "string" ? getEvent(slug) : undefined;
  if (!event) throw new AppError("NOT_FOUND", "We couldn't find that event.");
  return event;
}

/** Route `auth`: the calling phone's device uid. */
export const requireDevice = (request: Request) => deviceUid(request, playersRuntime().verify);

export const getDevice = (slug: string | string[] | undefined, uid: string) =>
  deviceView(deps(), requireEvent(slug), uid);

export const joinPlayer = (slug: string | string[] | undefined, uid: string, body: JoinBody) =>
  joinEvent(deps(), requireEvent(slug), uid, body).then((player) => ({ player }));

/** How the phone proves which device it is: Firebase Auth, or self-made dev tokens. */
export const deviceIdentity = (): Identity => (backend() === "firebase" ? "firebase" : "dev");
