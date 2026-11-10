import { AppError } from "@/lib/errors";
import { clearDrawings, type DrawingDeps } from "@/lib/drawings";
import { pointsFor, type EventConfig, type EventStatus } from "@/lib/events";
import { jarShare, type JarState, type PlayRepo } from "@/lib/games";
import type { AdminPlayer } from "@/lib/players";
import {
  awardPoints,
  donations,
  rebuild,
  removeFromBoard,
  voidDonation,
  voidPoints,
} from "@/lib/points";
import {
  clearTeams,
  currentTeams,
  dropFromTeam,
  teamsView,
  type TeamDeps,
  type BoardVisibility,
  type TeamsSummary,
} from "@/lib/teams";

/** Everything teams need, plus the plays. `id` gives a fresh id for a manual award. */
export type AdminDeps = TeamDeps & {
  plays: PlayRepo;
  /** Kept drawings (ADR-032); left out where no test needs them. */
  drawings?: DrawingDeps;
};

export type ControlsPlayer = AdminPlayer & { points: number; teamId: string | null };

/** One donation as Controls lists it (S03-AC6). */
export type ControlsDonation = {
  id: string;
  from: string;
  team: string;
  points: number;
  voided: boolean;
};

export type ControlsView = {
  status: EventStatus;
  players: ControlsPlayer[];
  /** Phase, team size and teams, for events with teams (spec 03). */
  teams: TeamsSummary | null;
  /** Whether the standings show on phones and on the TV (S07-AC11). */
  board: BoardVisibility;
  /** Only when asked for: reading them costs a read per donation (S03-AC6). */
  donations?: ControlsDonation[];
  /** Only when asked for: reading them costs a read per play (S17-AC3). */
  jars?: ControlsJar[];
  /** Only when asked for: a read per drawing (S18-AC8). */
  drawings?: ControlsDrawings;
};

/** Kept drawings as Controls shows them, newest first (S18-AC8). */
export type ControlsDrawings = {
  /** False when no Blob store is connected, so nothing is being kept. */
  keeping: boolean;
  list: { id: string; title: string; nickname: string; points: number; run: number; url: string }[];
};

/** A Guessing Jar as Controls shows it: how many guessed, the count if scored, the closest. */
export type ControlsJar = {
  gameId: string;
  title: string;
  guesses: number;
  actual: number | null;
  closest: { nickname: string; guess: number; points: number | null }[];
};

export const ACTIONS = ["start", "end", "reopen"] as const;
export type StatusAction = (typeof ACTIONS)[number];

const NEXT: Record<StatusAction, { from: EventStatus; to: EventStatus }> = {
  start: { from: "upcoming", to: "live" },
  end: { from: "live", to: "ended" },
  reopen: { from: "ended", to: "live" },
};

/** What Controls shows: the status, and every active player with their points (S07-AC3). */
export async function controlsView(
  deps: AdminDeps,
  event: EventConfig,
  /** The lists that cost a read per row, loaded only when asked for. */
  extra: { donations?: boolean; jars?: boolean; drawings?: boolean } = {},
): Promise<ControlsView> {
  // Points and teams come from the summaries: no read per player or team (ADR-031).
  const [status, players, published, board] = await Promise.all([
    deps.events.status(event.slug),
    deps.players.list(event.slug),
    teamsView(deps, event, null),
    deps.points.board.read(event.slug),
  ]);
  const { phase, maxTeamSize, teams: list, board: shown } = published;
  const teams: TeamsSummary | null =
    event.scoring === "individual" ? null : { phase, maxTeamSize, teams: list, board: shown };
  const pointsOf = new Map(board.players.map((r) => [r.id, r.points]));
  const teamOf = new Map(
    teams?.teams.flatMap((t) => t.members.map((m) => [m.id, t.id] as const)) ?? [],
  );
  return {
    status,
    players: players.map((p) => ({
      ...p,
      points: pointsOf.get(p.id) ?? 0,
      teamId: teamOf.get(p.id) ?? null,
    })),
    teams,
    board: shown,
    ...(extra.donations ? { donations: await donationList(deps, event, players, teams) } : {}),
    ...(extra.jars ? { jars: await jarResults(deps, event) } : {}),
    ...(extra.drawings ? { drawings: await drawingList(deps, event, players) } : {}),
  };
}

async function donationList(
  deps: AdminDeps,
  event: EventConfig,
  players: AdminPlayer[],
  teams: TeamsSummary | null,
): Promise<ControlsDonation[]> {
  const nickname = new Map(players.map((p) => [p.id, p.nickname]));
  const teamName = new Map(teams?.teams.map((t) => [t.id, t.name]) ?? []);
  return (await donations(deps.points, event.slug)).map((d) => ({
    id: d.id,
    from: nickname.get(d.playerId) ?? "A player who left",
    team: teamName.get(d.teamId) ?? "A team",
    points: d.points,
    voided: d.voided,
  }));
}

/** The host voids a donation: both entries, so the points go back (S03-AC6). */
export async function voidPlayerDonation(deps: AdminDeps, event: EventConfig, donationId: string) {
  const players = await deps.players.list(event.slug);
  const found = await voidDonation(
    deps.points,
    event.slug,
    donationId,
    "Donation voided by the host",
    (id) => players.find((p) => p.id === id) ?? null,
  );
  if (!found) throw new AppError("NOT_FOUND", "We couldn't find that donation.");
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
  await dropFromTeam(deps, event, playerId);
}

/** Bans the player's phone and removes them (S07-AC7). */
export async function banPlayer(deps: AdminDeps, event: EventConfig, playerId: string) {
  const player = await findPlayer(deps, event, playerId);
  await deps.players.ban(event.slug, player.deviceUid);
  await removeFromBoard(deps.points, event.slug, playerId);
  await dropFromTeam(deps, event, playerId);
}

/** Spec 04's rebuild, over the event's active players, teams and plays (S07-AC8, S03-AC5). */
export async function rebuildPoints(deps: AdminDeps, event: EventConfig) {
  const [players, plays, teams] = await Promise.all([
    deps.players.list(event.slug),
    deps.plays.all(event.slug),
    event.scoring === "individual" ? Promise.resolve(null) : currentTeams(deps, event),
  ]);
  const ids = new Set(players.map((p) => p.id));
  const teamIds = new Set(teams?.teams.map((t) => t.id) ?? []);
  const game = (gameId: string) => event.games.find((g) => g.id === gameId);
  await rebuild(
    deps.points,
    event.slug,
    players,
    plays.flatMap((p) => {
      const g = game(p.gameId);
      const team = g?.phase === "team";
      if (!(team ? teamIds : ids).has(p.playerId)) return [];
      return [{ ...p, title: g?.title ?? p.gameId, team }];
    }),
    teams?.teams.map((t) => ({ id: t.id, name: t.name, color: t.color })) ?? [],
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
  await clearTeams(deps, event);
  if (deps.drawings) await clearDrawings(deps.drawings, event.slug);
}

/** The kept drawings, with each player's name and game title (S18-AC8). */
async function drawingList(
  deps: AdminDeps,
  event: EventConfig,
  players: AdminPlayer[],
): Promise<ControlsDrawings> {
  if (!deps.drawings) return { keeping: false, list: [] };
  const nickname = new Map(players.map((p) => [p.id, p.nickname]));
  const title = new Map(event.games.map((g) => [g.id, g.title]));
  const all = await deps.drawings.drawings.list(event.slug);
  return {
    keeping: deps.drawings.files !== null,
    list: all.map((d) => ({
      id: d.id,
      title: title.get(d.gameId) ?? d.gameId,
      nickname: nickname.get(d.playerId) ?? "Someone who left",
      points: d.points,
      run: d.run,
      url: d.url,
    })),
  };
}

const isJar = (event: EventConfig, gameId: string) =>
  event.games.find((g) => g.id === gameId && g.type === "jar");

/** Every jar's guesses, closest first once it's scored (S17-AC3). */
export async function jarResults(deps: AdminDeps, event: EventConfig): Promise<ControlsJar[]> {
  const jars = event.games.filter((g) => g.type === "jar");
  if (jars.length === 0) return [];
  const [plays, players] = await Promise.all([
    deps.plays.all(event.slug),
    deps.players.list(event.slug),
  ]);
  const nickname = new Map(players.map((p) => [p.id, p.nickname]));
  return jars.map((g) => {
    const guesses = plays.flatMap((p) => {
      const s = p.state as JarState;
      const name = nickname.get(p.playerId);
      return p.gameId === g.id && s.guess !== null && name
        ? [{ nickname: name, guess: s.guess, points: s.points, actual: s.actual }]
        : [];
    });
    const actual = guesses.find((x) => x.actual !== null)?.actual ?? null;
    const closest = [...guesses]
      .sort((a, b) =>
        actual === null ? 0 : Math.abs(a.guess - actual) - Math.abs(b.guess - actual),
      )
      .slice(0, 5)
      .map(({ nickname: n, guess, points }) => ({ nickname: n, guess, points }));
    return { gameId: g.id, title: g.title, guesses: guesses.length, actual, closest };
  });
}

/**
 * The host enters the jar's real count: each guess earns points by how close
 * it is, through the ledger, and the phones see their result. Scoring again
 * voids the earlier jar points first (S17-AC3).
 */
export async function scoreJar(
  deps: AdminDeps,
  event: EventConfig,
  gameId: string,
  actual: number,
) {
  const game = isJar(event, gameId);
  if (!game) throw new AppError("NOT_FOUND", "We couldn't find that jar.");
  if (!Number.isInteger(actual) || actual < 0 || actual > 1_000_000)
    throw new AppError("BAD_REQUEST", "Enter the real count as a whole number.");
  const points = pointsFor(event, game);
  const [plays, players, entries] = await Promise.all([
    deps.plays.all(event.slug),
    deps.players.list(event.slug),
    deps.points.points.entries(event.slug),
  ]);
  const voided = new Set(entries.flatMap((e) => (e.voids ? [e.voids] : [])));
  for (const play of plays) {
    const state = play.state as JarState;
    const player = players.find((p) => p.id === play.playerId);
    if (play.gameId !== gameId || state.guess === null || !player) continue;
    for (const e of entries)
      if (
        e.kind === "award" &&
        e.to.id === player.id &&
        e.source.kind === "game" &&
        e.source.id === gameId &&
        !voided.has(e.id)
      )
        await voidPoints(deps.points, event.slug, e.id, "Jar scored again", () => player);
    const earned = Math.round(points * jarShare(state.guess, actual));
    await deps.plays.update(event.slug, gameId, player.id, (cur) =>
      cur
        ? { ...cur, state: { ...state, actual, points: earned }, points: earned, best: earned }
        : null,
    );
    if (earned > 0)
      await awardPoints(deps.points, event.slug, player, {
        id: `jar_${deps.id()}`,
        points: earned,
        reason: game.title,
        source: { kind: "game", id: gameId },
        createdBy: "admin",
      });
  }
}
