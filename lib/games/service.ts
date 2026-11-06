import { z } from "zod";
import { AppError } from "@/lib/errors";
import {
  gameOpen,
  pointsFor,
  type EventConfig,
  type EventStatus,
  type GameConfig,
} from "@/lib/events";
import type { PlayerRepo } from "@/lib/players";
import type { AnyGameLogic, HubPlays, Instructions, PlayResponse } from "./model";
import { gameLogic } from "./registry";
import type { PlayRecord, PlayRepo } from "./repo";

export type GameDeps = {
  plays: PlayRepo;
  players: PlayerRepo;
  status: (slug: string) => Promise<EventStatus>;
  now: () => number;
  seed: () => number;
};

export const StartBody = z.object({
  playerId: z.string().min(1).max(64),
  /** Start a new run of a finished, replayable game (S08-AC12). */
  again: z.boolean().optional(),
});
export const MoveBody = z.object({
  playerId: z.string().min(1).max(64),
  step: z.number().int().nonnegative(),
  move: z.unknown(),
});

export const GAME_CLOSED: Record<Exclude<EventStatus, "live">, string> = {
  upcoming: "This game opens when the host starts the party.",
  ended: "This game has closed.",
};

type Ready = { game: GameConfig; logic: AnyGameLogic; content: unknown; points: number };

/** The solo games with logic that a page can play (spec 08). */
export function playable(event: EventConfig, gameId: string): Omit<Ready, "points"> | null {
  const game = event.games.find((g) => g.id === gameId && g.mode === "solo");
  const logic = game ? gameLogic(game.type) : undefined;
  if (!game || !logic) return null;
  return { game, logic, content: logic.content.parse(game.content) };
}

/** The box shown before a game starts: the event's own, or the game type's (S08-AC9). */
export function instructionsFor(event: EventConfig, gameId: string): Instructions | null {
  const ready = playable(event, gameId);
  if (!ready) return null;
  return ready.game.instructions ?? ready.logic.instructions(ready.content);
}

async function ownsPlayer(deps: GameDeps, event: EventConfig, uid: string, playerId: string) {
  const device = await deps.players.device(event.slug, uid);
  if (device.banned || device.player?.id !== playerId)
    throw new AppError("FORBIDDEN", "That player isn't on this phone.");
}

/** Game playable and open now, player on this phone (S08-AC6, AC13). */
async function guard(
  deps: GameDeps,
  event: EventConfig,
  uid: string,
  gameId: string,
  playerId: string,
) {
  const ready = playable(event, gameId);
  if (!ready) throw new AppError("NOT_FOUND", "We couldn't find that game.");
  const status = await deps.status(event.slug);
  if (!gameOpen(status, ready.game))
    throw new AppError("FORBIDDEN", GAME_CLOSED[status === "ended" ? "ended" : "upcoming"]);
  await ownsPlayer(deps, event, uid, playerId);
  return { ...ready, points: pointsFor(event, ready.game) };
}

/** Fixes a run's points when it ends; the best run is the player's score (S08-AC4, AC12). */
function settle(play: PlayRecord, state: unknown, r: Ready): PlayRecord {
  if (play.status === "finished" || !r.logic.isOver(state)) return { ...play, state };
  const points = r.logic.score(state, r.points);
  return {
    ...play,
    state,
    status: "finished",
    points,
    best: Math.max(play.best, points),
    scored: true,
  };
}

function respond(play: PlayRecord, r: Ready, now: number): PlayResponse {
  return {
    view: r.logic.view(play.state, r.content, { now }),
    status: play.status,
    points: play.points,
    best: play.best,
    step: r.logic.step(play.state),
  };
}

/**
 * Starts the player's play of a game, or resumes it (S08-AC3). A finished
 * replayable game starts a new run when asked (`again`, S08-AC12).
 */
export async function startPlay(
  deps: GameDeps,
  event: EventConfig,
  uid: string,
  gameId: string,
  body: z.infer<typeof StartBody>,
): Promise<PlayResponse> {
  const r = await guard(deps, event, uid, gameId, body.playerId);
  const now = deps.now();
  const run = () => {
    const seed = deps.seed();
    return {
      seed,
      state: r.logic.create(r.content, seed, { now }),
      status: "playing" as const,
      points: 0,
    };
  };
  const play = await deps.plays.update(event.slug, gameId, body.playerId, (cur) => {
    if (!cur)
      return {
        gameId,
        playerId: body.playerId,
        deviceUid: uid,
        best: 0,
        runs: 1,
        scored: false,
        ...run(),
      };
    if (cur.status === "finished")
      return body.again && event.replayable === true
        ? { ...cur, ...run(), runs: cur.runs + 1 }
        : null;
    const ticked = r.logic.tick(cur.state, r.content, { now });
    return ticked === cur.state ? null : settle(cur, ticked, r);
  });
  if (!play) throw new AppError("INTERNAL", "The game didn't start. Try again.");
  return respond(play, r, now);
}

/** Applies one move on the server (S08-AC2). A move for an old step changes nothing (S08-AC5). */
export async function makeMove(
  deps: GameDeps,
  event: EventConfig,
  uid: string,
  gameId: string,
  body: z.infer<typeof MoveBody>,
): Promise<PlayResponse> {
  const r = await guard(deps, event, uid, gameId, body.playerId);
  const now = deps.now();
  const play = await deps.plays.update(event.slug, gameId, body.playerId, (cur) => {
    if (!cur) throw new AppError("NOT_FOUND", "Start the game first.");
    if (cur.status === "finished") return null;
    const ticked = r.logic.tick(cur.state, r.content, { now });
    if (r.logic.step(ticked) !== body.step)
      return ticked === cur.state ? null : settle(cur, ticked, r);
    const result = r.logic.move(ticked, r.content, body.move, { now });
    if (!result.ok) throw new AppError("BAD_REQUEST", result.message);
    return settle(cur, result.state, r);
  });
  if (!play) throw new AppError("NOT_FOUND", "Start the game first.");
  return respond(play, r, now);
}

/** The active player's plays, for the hub's game list (S08-AC7). */
export async function hubPlays(
  deps: GameDeps,
  event: EventConfig,
  uid: string,
  playerId: string,
): Promise<{ plays: HubPlays }> {
  await ownsPlayer(deps, event, uid, playerId);
  const plays: HubPlays = {};
  for (const p of await deps.plays.forPlayer(event.slug, playerId))
    plays[p.gameId] = { status: p.status, best: p.best, runs: p.runs };
  return { plays };
}
