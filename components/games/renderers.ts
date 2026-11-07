import { RecallGame, recallSummary } from "./recall/recall";
import { StackerGame, stackerSummary } from "./stacker/stacker";
import { TapsGame, tapsSummary } from "./taps/taps";
import { TimerGame, timerSummary } from "./timer/timer";
import { TrailGame, trailSummary } from "./trail/trail";
import { TriviaGame, triviaSummary } from "./trivia/trivia";
import type { GameRenderer } from "./types";

/** Each game type's phone renderer (spec 08). */
const RENDERERS: Readonly<Record<string, GameRenderer>> = {
  trivia: { Play: TriviaGame, summary: triviaSummary },
  timer: { Play: TimerGame, summary: timerSummary },
  taps: { Play: TapsGame, summary: tapsSummary },
  trail: { Play: TrailGame, summary: trailSummary },
  stacker: { Play: StackerGame, summary: stackerSummary },
  recall: { Play: RecallGame, summary: recallSummary },
};

export const rendererFor = (type: string): GameRenderer | undefined => RENDERERS[type];
