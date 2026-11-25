import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import type { z } from "zod";
import { requireEvent } from "@/lib/events/server";
import { playerRepo } from "@/lib/players/server";
import { pointsDeps } from "@/lib/points/server";
import { teamSummary } from "@/lib/teams/server";
import { showdownFor } from "./registry";
import { liveRepo } from "./runtime";
import {
  AdminLiveAction,
  adminLiveAction,
  adminLiveView,
  clearLive,
  phoneLiveView,
  PlayerLiveAction,
  playerLiveAction,
  type LiveDeps,
} from "./service";

/** Server-only entry for live sessions (spec 11). */
export const liveDeps = (): LiveDeps => ({
  live: liveRepo(),
  teams: (slug) => teamSummary().read(slug),
  owns: async (slug, uid, playerId) => {
    const device = await playerRepo().device(slug, uid);
    return !device.banned && device.player?.id === playerId;
  },
  points: pointsDeps(),
  showdown: showdownFor,
  now: () => Date.now(),
  id: () => randomUUID().replaceAll("-", "").slice(0, 16),
  seed: () => randomInt(1, 2 ** 31 - 1),
});

type Slug = string | string[] | undefined;

export { AdminLiveAction, PlayerLiveAction };

export const liveForAdmin = (slug: Slug) => adminLiveView(liveDeps(), requireEvent(slug));
export const runLiveAction = (slug: Slug, body: z.infer<typeof AdminLiveAction>) =>
  adminLiveAction(liveDeps(), requireEvent(slug), body);
export const liveForPhone = (slug: Slug, playerId: string | null, uid: string | null) =>
  phoneLiveView(liveDeps(), requireEvent(slug), playerId, uid);
export const runPlayerLiveAction = (
  slug: Slug,
  uid: string,
  body: z.infer<typeof PlayerLiveAction>,
) => playerLiveAction(liveDeps(), requireEvent(slug), uid, body);
export const clearLiveState = (slug: string) => clearLive(liveDeps(), slug);
export { liveRepo };
export { finishLive, followCaptain, phaseChangeProblem } from "./service";
