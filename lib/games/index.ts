export * from "./model";
export { contentErrors, gameLogic } from "./registry";
export { answerKey, readAnswerKey, type ChoiceView, type TriviaView } from "./trivia/logic";
export type { Media, TriviaContent } from "./trivia/content";
export { gamesApi } from "./client";
export type { PlayStatus } from "./repo";
export type { PlayChange, PlayRecord, PlayRepo } from "./repo";
export { MemoryPlayRepo } from "./repo.memory";
export { offWindow, type TimerView } from "./timer/logic";
export type { Film as TapsFilm, TapsView } from "./taps/logic";
export type { StackerView } from "./stacker/logic";
export { barStart, START_LENGTH, trim, type Bar } from "./stacker/engine";
export type { RecallView } from "./recall/logic";
export type { TrailView } from "./trail/logic";
export { jarShare, type JarState, type JarView } from "./jar/logic";
export type { CacheView } from "./cache/logic";
export { colorDistance, colorShare, hsvToRgb, toHex, type ColorView } from "./color/logic";
export type { DrawView } from "./draw/logic";
export type { Mark, WordView } from "./word/logic";
export { isSolved, slide, type SlideView } from "./slide/logic";
export type { BlocksView } from "./blocks/logic";
export { rotate, turnCells, type Cell, type Piece, type Placement } from "./blocks/puzzle";
export {
  photoShare,
  withRating,
  type PhotoContent,
  type PhotoState,
  type PhotoView,
} from "./photo/logic";
export { adjacent, checkPath, dotMarks, facing, turnToward, type DotMark } from "./trail/puzzle";
export { CATALOG, catalogByName, gamesDoc, type CatalogEntry } from "./catalog";
export { seededRandom, shuffled } from "./random";
export {
  clamp01,
  LEVELS,
  percent,
  type Level,
  type PerceptionCore,
  type Phase,
} from "./perception/core";
export {
  PERCEPTION_CORES,
  ribbonCore,
  staffangleCore,
  type AngleTask,
  type RibbonTask,
} from "./perception/games";
export {
  flybyCore,
  nearCloseness,
  snowsumCore,
  SOLO_ONLY_CORES,
  type FlybyTask,
  type SnowSumTask,
} from "./perception/counts";
export { FEEDBACK_MS, type SoloView as PerceptionSoloView } from "./perception/solo";
export {
  apply,
  dealFlakes,
  dealFormation,
  FLYBY_ROUNDS,
  PRESENT_KINDS,
  runningTotals,
  SNOW_MAX,
  SNOW_MIN,
  SNOW_OPS,
  SNOW_ROUNDS,
  sum,
  type Flake,
  type FlybyRound,
  type PresentKind,
  type Formation,
  type SnowOp,
} from "./counts";
