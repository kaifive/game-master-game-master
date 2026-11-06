import "server-only";
import { randomInt } from "node:crypto";
import { eventRuntime, requireEvent } from "@/lib/events/server";
import { playerRepo } from "@/lib/players/server";
import { playRepo } from "./runtime";
import {
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
  };
}

type Slug = string | string[] | undefined;
const gameIdOf = (id: Slug) => (typeof id === "string" ? id : "");

export const startGame = (slug: Slug, gameId: Slug, uid: string, body: z.infer<typeof StartBody>) =>
  startPlay(deps(), requireEvent(slug), uid, gameIdOf(gameId), body);

export const moveGame = (slug: Slug, gameId: Slug, uid: string, body: z.infer<typeof MoveBody>) =>
  makeMove(deps(), requireEvent(slug), uid, gameIdOf(gameId), body);

export const playsFor = (slug: Slug, uid: string, playerId: string | null) =>
  hubPlays(deps(), requireEvent(slug), uid, playerId ?? "");

export { instructionsFor, playable, StartBody, MoveBody } from "./service";
