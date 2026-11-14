import { BlocksGame, blocksSummary } from "./blocks/blocks";
import { CacheGame, cacheSummary } from "./cache/cache";
import { ColorGame, colorSummary } from "./color/color";
import { DrawGame, drawSummary } from "./draw/draw";
import { JarGame, jarSummary } from "./jar/jar";
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
  trivia: { Play: TriviaGame, summary: triviaSummary, warnOnLeave: true },
  timer: { Play: TimerGame, summary: timerSummary },
  taps: { Play: TapsGame, summary: tapsSummary, holdResultMs: TAPS_HOLD_MS },
  trail: { Play: TrailGame, summary: trailSummary },
  stacker: { Play: StackerGame, summary: stackerSummary },
  recall: { Play: RecallGame, summary: recallSummary },
  jar: { Play: JarGame, summary: jarSummary },
  cache: { Play: CacheGame, summary: cacheSummary },
  color: { Play: ColorGame, summary: colorSummary },
  draw: { Play: DrawGame, summary: drawSummary },
  word: { Play: WordGame, summary: wordSummary, holdResultMs: WORD_HOLD_MS },
  "photo-challenge": { Play: PhotoGame, summary: photoSummary },
  slide: { Play: SlideGame, summary: slideSummary, holdResultMs: SLIDE_HOLD_MS },
  blocks: { Play: BlocksGame, summary: blocksSummary, holdResultMs: 300 },
};

export const rendererFor = (type: string): GameRenderer | undefined => RENDERERS[type];
