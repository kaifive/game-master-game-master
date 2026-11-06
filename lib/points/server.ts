import "server-only";
import { pointsRuntime } from "./runtime";
import type { PointsDeps } from "./service";

/** Server-only entry for points: what other features and the routes use (spec 04, 05). */
export const pointsDeps = (): PointsDeps => ({ ...pointsRuntime(), now: () => Date.now() });

export {
  awardGame,
  awardPoints,
  displayStandings,
  donate,
  donations,
  phoneStandings,
  pointsOf,
  rebuild,
  removeFromBoard,
  voidDonation,
  voidDonationsFrom,
  voidPoints,
} from "./service";
export type { PointsDeps, Recipient, TeamCompetitor, TeamRecipient } from "./service";
