import { defineGame, type AnyGameLogic } from "./model";
import { cache } from "./cache/logic";
import { color } from "./color/logic";
import { draw } from "./draw/logic";
import { jar } from "./jar/logic";
import { recall } from "./recall/logic";
import { stacker } from "./stacker/logic";
import { taps } from "./taps/logic";
import { timer } from "./timer/logic";
import { trail } from "./trail/logic";
import { trivia } from "./trivia/logic";
import { word } from "./word/logic";

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
};

export const gameLogic = (type: string): AnyGameLogic | undefined => LOGIC[type];

/** Problems with a game's content, as "path: message", or [] when it is valid (S08-AC1). */
export function contentErrors(type: string, content: unknown): string[] {
  const logic = gameLogic(type);
  if (!logic) return [];
  const parsed = logic.content.safeParse(content);
  return parsed.success
    ? []
    : parsed.error.issues.map((i) => `${i.path.join(".") || "(content)"}: ${i.message}`);
}
