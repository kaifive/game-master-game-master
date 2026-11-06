export * from "./model";
export type { Applied, BoardRepo, PointsRepo } from "./repo";
export { MemoryBoardRepo, MemoryPointsRepo } from "./repo.memory";
export { leadChange, newAwards, rank, standingsFor, TOP, type Ranked } from "./rules";
export {
  standingsApi,
  type DisplayAward,
  type DisplayStandings,
  type PhoneStandings,
} from "./client";
export {
  awardGame,
  awardPoints,
  displayStandings,
  phoneStandings,
  pointsOf,
  rebuild,
  removeFromBoard,
  voidPoints,
  type PointsDeps,
  type Recipient,
} from "./service";
