import { TriviaGame, triviaSummary } from "./trivia/trivia";
import type { GameRenderer } from "./types";

/** Each game type's phone renderer (spec 08). */
const RENDERERS: Readonly<Record<string, GameRenderer>> = {
  trivia: { Play: TriviaGame, summary: triviaSummary },
};

export const rendererFor = (type: string): GameRenderer | undefined => RENDERERS[type];
