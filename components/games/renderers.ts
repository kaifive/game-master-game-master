import { PERCEPTION_CORES, SOLO_ONLY_CORES } from "@/lib/games";
import { BlocksGame, blocksSummary, BLOCKS_HOLD_MS } from "./blocks/blocks";
import { CacheGame, cacheSummary } from "./cache/cache";
import { ColorGame, colorSummary } from "./color/color";
import { DrawGame, drawSummary } from "./draw/draw";
import { JarGame, jarSummary } from "./jar/jar";
import { perceptionRenderer } from "./perception/solo";
import { PhotoGame, photoSummary } from "./photo/photo";
import { RecallGame, recallSummary } from "./recall/recall";
import { SLIDE_HOLD_MS, SlideGame, slideSummary } from "./slide/slide";
import { StackerGame, stackerSummary } from "./stacker/stacker";
import { TAPS_HOLD_MS, TapsGame, tapsSummary } from "./taps/taps";
import { TimerGame, timerSummary } from "./timer/timer";
import { TrailGame, trailSummary } from "./trail/trail";
import { TriviaGame, triviaSummary } from "./trivia/trivia";
import { WORD_HOLD_MS, WordGame, wordSummary } from "./word/word";
import type { GameRenderer } from "./types";

/** Each game type's phone renderer (spec 08). */
const RENDERERS: Readonly<Record<string, GameRenderer>> = {
  trivia: { Play: TriviaGame, summary: triviaSummary, warnOnLeave: true, countdown: true },
  timer: { Play: TimerGame, summary: timerSummary, countdown: true },
  taps: { Play: TapsGame, summary: tapsSummary, holdResultMs: TAPS_HOLD_MS },
  trail: { Play: TrailGame, summary: trailSummary, countdown: true },
  stacker: { Play: StackerGame, summary: stackerSummary, countdown: true },
  recall: { Play: RecallGame, summary: recallSummary, countdown: true },
  jar: { Play: JarGame, summary: jarSummary },
  cache: { Play: CacheGame, summary: cacheSummary },
  color: { Play: ColorGame, summary: colorSummary },
  draw: { Play: DrawGame, summary: drawSummary },
  word: { Play: WordGame, summary: wordSummary, holdResultMs: WORD_HOLD_MS },
  "photo-challenge": { Play: PhotoGame, summary: photoSummary },
  slide: { Play: SlideGame, summary: slideSummary, holdResultMs: SLIDE_HOLD_MS, countdown: true },
  blocks: {
    Play: BlocksGame,
    summary: blocksSummary,
    holdResultMs: BLOCKS_HOLD_MS,
    countdown: true,
  },
  // Perception games (spec 28) and the solo counting games (spec 30), all built the same way.
  ...Object.fromEntries(
    [...PERCEPTION_CORES, ...SOLO_ONLY_CORES].map((core) => [
      core.type,
      perceptionRenderer(core.type),
    ]),
  ),
};

export const rendererFor = (type: string): GameRenderer | undefined => RENDERERS[type];
