import { AppError } from "@/lib/errors";
import type { EventConfig, EventRuntimeRepo, EventStatus } from "@/lib/events";
import type { PlayRepo } from "@/lib/games";
import type { AdminPlayer, PlayerRepo } from "@/lib/players";
import { awardPoints, rebuild, removeFromBoard, voidPoints, type PointsDeps } from "@/lib/points";

export type AdminDeps = {
  events: EventRuntimeRepo;
  players: PlayerRepo;
  plays: PlayRepo;
  points: PointsDeps;
  /** A fresh id for a manual award. */
  id: () => string;
};

export type ControlsPlayer = AdminPlayer & { points: number };
export type ControlsView = { status: EventStatus; players: ControlsPlayer[] };

export const ACTIONS = ["start", "end", "reopen"] as const;
export type StatusAction = (typeof ACTIONS)[number];

const NEXT: Record<StatusAction, { from: EventStatus; to: EventStatus }> = {
  start: { from: "upcoming", to: "live" },
  end: { from: "live", to: "ended" },
  reopen: { from: "ended", to: "live" },
};

/** What Controls shows: the status, and every active player with their points (S07-AC3). */
export async function controlsView(deps: AdminDeps, event: EventConfig): Promise<ControlsView> {
  const [status, players] = await Promise.all([
    deps.events.status(event.slug),
    deps.players.list(event.slug),
  ]);
  const points = await Promise.all(players.map((p) => deps.points.points.total(event.slug, p.id)));
  return { status, players: players.map((p, i) => ({ ...p, points: points[i] ?? 0 })) };
}

/** Start, End and Reopen, each only from the status it belongs to (S07-AC2). */
export async function changeStatus(deps: AdminDeps, event: EventConfig, action: StatusAction) {
  const { from, to } = NEXT[action];
  const now = await deps.events.status(event.slug);
  if (now !== from)
    throw new AppError(
      "CONFLICT",
      `The event is ${now}, so it can't ${action === "reopen" ? "reopen" : action}.`,
    );
  await deps.events.setStatus(event.slug, to);
}

async function findPlayer(
  deps: AdminDeps,
  event: EventConfig,
  playerId: string,
): Promise<AdminPlayer> {
  const player = (await deps.players.list(event.slug)).find((p) => p.id === playerId);
  if (!player) throw new AppError("NOT_FOUND", "That player isn't in this event.");
  return player;
}

/** Adds or takes away points with a reason (S07-AC4). */
export async function adjustPoints(
  deps: AdminDeps,
  event: EventConfig,
  playerId: string,
  points: number,
  reason: string,
) {
  if (!Number.isInteger(points) || points === 0)
    throw new AppError("BAD_REQUEST", "Enter a whole number of points, more or less than 0.");
  const player = await findPlayer(deps, event, playerId);
  await awardPoints(deps.points, event.slug, player, {
    id: `manual_${deps.id()}`,
    points,
    reason: reason.trim() || (points > 0 ? "Bonus from the host" : "Taken away by the host"),
    source: { kind: "manual", id: "controls" },
    createdBy: "admin",
  });
}

/** Lets the player's phone start over once more (S07-AC5). */
export async function giveRestart(deps: AdminDeps, event: EventConfig, playerId: string) {
  const player = await findPlayer(deps, event, playerId);
  await deps.players.grantRestart(event.slug, player.deviceUid);
}

/** Deletes their play of a game and voids the points it gave, so a fresh run can't double up (S07-AC6). */
export async function resetGame(
  deps: AdminDeps,
  event: EventConfig,
  playerId: string,
  gameId: string,
) {
  const player = await findPlayer(deps, event, playerId);
  if (!event.games.some((g) => g.id === gameId))
    throw new AppError("NOT_FOUND", "We couldn't find that game.");
  await deps.plays.remove(event.slug, gameId, playerId);
  const entries = await deps.points.points.entries(event.slug);
  const voided = new Set(entries.flatMap((e) => (e.voids ? [e.voids] : [])));
  for (const e of entries)
    if (
      e.kind === "award" &&
      e.to.id === playerId &&
      e.source.kind === "game" &&
      e.source.id === gameId &&
      !voided.has(e.id)
    )
      await voidPoints(deps.points, event.slug, e.id, "Game reset by the host", () => player);
}

/** Takes the player off the event and the leaderboard (S07-AC7). */
export async function removePlayer(deps: AdminDeps, event: EventConfig, playerId: string) {
  await findPlayer(deps, event, playerId);
  await deps.players.remove(event.slug, playerId);
  await removeFromBoard(deps.points, event.slug, playerId);
}

/** Bans the player's phone and removes them (S07-AC7). */
export async function banPlayer(deps: AdminDeps, event: EventConfig, playerId: string) {
  const player = await findPlayer(deps, event, playerId);
  await deps.players.ban(event.slug, player.deviceUid);
  await removeFromBoard(deps.points, event.slug, playerId);
}

/** Spec 04's rebuild, over the event's active players and plays (S07-AC8). */
export async function rebuildPoints(deps: AdminDeps, event: EventConfig) {
  const [players, plays] = await Promise.all([
    deps.players.list(event.slug),
    deps.plays.all(event.slug),
  ]);
  const ids = new Set(players.map((p) => p.id));
  const title = (gameId: string) => event.games.find((g) => g.id === gameId)?.title ?? gameId;
  await rebuild(
    deps.points,
    event.slug,
    players,
    plays.filter((p) => ids.has(p.playerId)).map((p) => ({ ...p, title: title(p.gameId) })),
  );
}

export const CLEAR_CONFIRM = "CLEAR";

/** Deletes everything players made, only before the start and after typing CLEAR (S07-AC9). */
export async function clearTestData(deps: AdminDeps, event: EventConfig, confirm: string) {
  if ((await deps.events.status(event.slug)) !== "upcoming")
    throw new AppError("CONFLICT", "Test data can only be cleared before the event starts.");
  if (confirm.trim() !== CLEAR_CONFIRM)
    throw new AppError("BAD_REQUEST", `Type ${CLEAR_CONFIRM} to confirm.`);
  await Promise.all([
    deps.players.clear(event.slug),
    deps.plays.clear(event.slug),
    deps.points.points.clear(event.slug),
    deps.points.board.clear(event.slug),
  ]);
}
