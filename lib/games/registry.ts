import { defineGame, type AnyGameLogic } from "./model";
import { trivia } from "./trivia/logic";

/**
 * Game types with server-run logic (spec 08). Types without an entry (photo
 * challenge, Jeopardy) arrive with their own specs.
 */
const LOGIC: Readonly<Record<string, AnyGameLogic>> = {
  trivia: defineGame(trivia),
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
