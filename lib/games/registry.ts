import { defineGame, type AnyGameLogic } from "./model";
import { cache } from "./cache/logic";
import { color } from "./color/logic";
import { draw } from "./draw/logic";
import { jar } from "./jar/logic";
import { blocks } from "./blocks/logic";
import { photo } from "./photo/logic";
import { recall } from "./recall/logic";
import { slideGame } from "./slide/logic";
import { stacker } from "./stacker/logic";
import { taps } from "./taps/logic";
import { timer } from "./timer/logic";
import { trail } from "./trail/logic";
import { trivia } from "./trivia/logic";
import { word } from "./word/logic";
import { SOLO_ONLY_CORES } from "./perception/counts";
import { PERCEPTION_CORES } from "./perception/games";
import { perceptionSolo } from "./perception/solo";

/**
 * Game types with server-run logic (spec 08). Types without an entry (photo
 * challenge, Jeopardy) arrive with their own specs.
 */
const LOGIC: Readonly<Record<string, AnyGameLogic>> = {
  trivia: defineGame(trivia),
  timer: defineGame(timer),
  taps: defineGame(taps),
  trail: defineGame(trail),
  stacker: defineGame(stacker),
  recall: defineGame(recall),
  jar: defineGame(jar),
  cache: defineGame(cache),
  color: defineGame(color),
  draw: defineGame(draw),
  word: defineGame(word),
  "photo-challenge": defineGame(photo),
  slide: defineGame(slideGame),
  blocks: defineGame(blocks),
  // Perception games (spec 28) and the solo counting games (spec 30), from their cores.
  ...Object.fromEntries(
    [...PERCEPTION_CORES, ...SOLO_ONLY_CORES].map((core) => [
      core.type,
      defineGame(perceptionSolo(core as never)),
    ]),
  ),
};

export const gameLogic = (type: string): AnyGameLogic | undefined => LOGIC[type];

/** Every game type with server logic: the built games (spec 23). */
export const builtGameTypes = (): string[] => Object.keys(LOGIC);

/** Problems with a game's content, as "path: message", or [] when it is valid (S08-AC1). */
export function contentErrors(type: string, content: unknown): string[] {
  const logic = gameLogic(type);
  if (!logic) return [];
  const parsed = logic.content.safeParse(content);
  return parsed.success
    ? []
    : parsed.error.issues.map((i) => `${i.path.join(".") || "(content)"}: ${i.message}`);
}
