import "server-only";
import { pointsRuntime } from "./runtime";
import type { PointsDeps } from "./service";

/** Server-only entry for points: what other features' services use (spec 04). */
export const pointsDeps = (): PointsDeps => ({ ...pointsRuntime(), now: () => Date.now() });

export { awardGame, awardPoints, pointsOf, rebuild, removeFromBoard, voidPoints } from "./service";
export type { PointsDeps, Recipient } from "./service";
