import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { eventRuntime, requireEvent } from "@/lib/events/server";
import { playerRepo } from "@/lib/players/server";
import { awardGame, pointsDeps, pointsOf } from "@/lib/points/server";
import { teamOfPlayer } from "@/lib/teams/server";
import { keepDrawing } from "@/lib/drawings";
import { drawingDeps, drawingFiles } from "@/lib/drawings/server";
import { playRepo } from "./runtime";
import { isWord } from "./word/dictionary";
import { AppError } from "@/lib/errors";
import {
  addPhoto,
  hubPlays,
  makeMove,
  startPlay,
  type GameDeps,
  type MoveBody,
  type StartBody,
} from "./service";
import type { z } from "zod";

/** Server-only entry for games: what the game routes and pages call (spec 08). */

function deps(): GameDeps {
  const runtime = eventRuntime();
  return {
    plays: playRepo(),
    players: playerRepo(),
    status: (slug) => runtime.status(slug),
    now: () => Date.now(),
    seed: () => randomInt(2 ** 31),
    onBest: (slug, to, run) => awardGame(pointsDeps(), slug, to, run),
    seat: async (slug, playerId) => {
      const { phase, team, isCaptain } = await teamOfPlayer(slug, playerId);
      return {
        phase,
        team: team ? { id: team.id, name: team.name, color: team.color } : null,
        isCaptain,
      };
    },
    pointsOf: (slug, playerId) => pointsOf(pointsDeps(), slug, playerId),
    keepDrawing: (slug, drawing) => keepDrawing(drawingDeps(), slug, drawing),
    isWord,
    files: drawingFiles(),
    id: () => randomUUID(),
  };
}

type Slug = string | string[] | undefined;
const gameIdOf = (id: Slug) => (typeof id === "string" ? id : "");

export const startGame = (slug: Slug, gameId: Slug, uid: string, body: z.infer<typeof StartBody>) =>
  startPlay(deps(), requireEvent(slug), uid, gameIdOf(gameId), body);

export const moveGame = (slug: Slug, gameId: Slug, uid: string, body: z.infer<typeof MoveBody>) =>
  makeMove(deps(), requireEvent(slug), uid, gameIdOf(gameId), body);

/** POST photo: form data `playerId` and `photo` (S20-AC2). */
export async function sendPhoto(slug: Slug, gameId: Slug, uid: string, request: Request) {
  const form = await request.formData().catch(() => null);
  const playerId = form?.get("playerId");
  const file = form?.get("photo");
  if (typeof playerId !== "string" || !playerId || playerId.length > 64 || !(file instanceof Blob))
    throw new AppError("BAD_REQUEST", "Send a photo.");
  return addPhoto(deps(), requireEvent(slug), uid, gameIdOf(gameId), { playerId, file });
}

export const playsFor = (slug: Slug, uid: string, playerId: string | null) =>
  hubPlays(deps(), requireEvent(slug), uid, playerId ?? "");

export { instructionsFor, playable, StartBody, MoveBody } from "./service";
export { playRepo } from "./runtime";
