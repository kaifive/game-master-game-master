import "server-only";
import { requireEvent } from "@/lib/events/server";
import { pointsRuntime } from "./runtime";
import { displayStandings, phoneStandings, type PointsDeps } from "./service";

/** Server-only entry for points: what other features and the routes use (spec 04, 05). */
export const pointsDeps = (): PointsDeps => ({ ...pointsRuntime(), now: () => Date.now() });

type Slug = string | string[] | undefined;

/** GET /leaderboard: public, nicknames and points only. */
export const leaderboardFor = (slug: Slug, playerId: string | null) =>
  phoneStandings(pointsDeps(), requireEvent(slug).slug, playerId);

/** GET /display: public, nicknames and points only. */
export const displayFor = (slug: Slug) => displayStandings(pointsDeps(), requireEvent(slug).slug);

export { awardGame, awardPoints, pointsOf, rebuild, removeFromBoard, voidPoints } from "./service";
export type { PointsDeps, Recipient } from "./service";
