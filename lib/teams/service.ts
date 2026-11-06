import { AppError } from "@/lib/errors";
import {
  phaseOf,
  suggestedTeamSize,
  type EventConfig,
  type EventRuntimeRepo,
  type Phase,
} from "@/lib/events";
import type { PlayerRepo, PlayerSummary } from "@/lib/players";
import { donate, type PointsDeps } from "@/lib/points";
import type { TeamsSummary, TeamView } from "./model";
import type { TeamRepo, TeamSummaryRepo } from "./repo";
import { checkTeamName, nextColor, viewTeam } from "./rules";

export type TeamDeps = {
  teams: TeamRepo;
  players: PlayerRepo;
  events: EventRuntimeRepo;
  summary: TeamSummaryRepo;
  points: PointsDeps;
  /** A fresh id, for donations. */
  id: () => string;
};

export type TeamsView = TeamsSummary & {
  /** The asking player's team, if they're on one. */
  mine: { teamId: string; isCaptain: boolean; named: boolean } | null;
};

const noTeams = () => new AppError("BAD_REQUEST", "This event has no teams.");

/** The phase, the maximum team size (the host's, or players ÷ teams), and every team, from Firestore. */
export async function currentTeams(deps: TeamDeps, event: EventConfig): Promise<TeamsSummary> {
  const [settings, teams, players] = await Promise.all([
    deps.events.settings(event.slug),
    deps.teams.list(event.slug),
    deps.players.list(event.slug),
  ]);
  const nicknames = new Map(players.map((p) => [p.id, p.nickname]));
  const maxTeamSize = settings.maxTeamSize ?? suggestedTeamSize(players.length, teams.length);
  return {
    phase: phaseOf(event.scoring, settings.phase),
    maxTeamSize,
    teams: teams.map((t) => viewTeam(t, (id) => nicknames.get(id), maxTeamSize)),
  };
}

/**
 * Writes the summary phones poll, and each team's name and color on the
 * leaderboard. Runs after every team change (spec 03).
 */
export async function publishTeams(deps: TeamDeps, event: EventConfig): Promise<TeamsSummary> {
  const summary = await currentTeams(deps, event);
  await deps.summary.write(event.slug, summary);
  await Promise.all(
    summary.teams.map((t) =>
      deps.points.board.upsertTeam(event.slug, { id: t.id, name: t.name, color: t.color }),
    ),
  );
  return summary;
}

const mineIn = (summary: TeamsSummary, playerId: string | null): TeamsView["mine"] => {
  const team = playerId
    ? summary.teams.find((t) => t.members.some((m) => m.id === playerId))
    : null;
  return team
    ? { teamId: team.id, isCaptain: team.captain?.id === playerId, named: team.named }
    : null;
};

/** What phones see (S03-AC1, AC3): the published summary, so a poll is one cheap read. */
export async function teamsView(
  deps: Pick<TeamDeps, "summary">,
  event: EventConfig,
  playerId: string | null,
): Promise<TeamsView> {
  const summary = (await deps.summary.read(event.slug)) ?? {
    phase: phaseOf(event.scoring, undefined),
    maxTeamSize: 1,
    teams: [],
  };
  return { ...summary, mine: mineIn(summary, playerId) };
}

/** A player's team and whether they captain it, for team games (S03-AC5). */
export async function teamOf(
  deps: Pick<TeamDeps, "summary">,
  event: EventConfig,
  playerId: string,
): Promise<{ phase: Phase; team: TeamView | null; isCaptain: boolean }> {
  const view = await teamsView(deps, event, playerId);
  const team = view.mine ? (view.teams.find((t) => t.id === view.mine?.teamId) ?? null) : null;
  return { phase: view.phase, team, isCaptain: view.mine?.isCaptain === true };
}

async function ownPlayer(
  deps: TeamDeps,
  event: EventConfig,
  uid: string,
  playerId: string,
): Promise<PlayerSummary> {
  const device = await deps.players.device(event.slug, uid);
  if (device.banned || !device.player || device.player.id !== playerId)
    throw new AppError("FORBIDDEN", "That player isn't on this phone.");
  return device.player;
}

/** The host makes a player a captain: a new team in the next color (S03-AC2). */
export async function makeCaptain(deps: TeamDeps, event: EventConfig, playerId: string) {
  if (event.scoring === "individual") throw noTeams();
  if (!(await deps.players.list(event.slug)).some((p) => p.id === playerId))
    throw new AppError("NOT_FOUND", "That player isn't in this event.");
  await deps.teams.create(event.slug, playerId, nextColor(await deps.teams.list(event.slug)));
  await publishTeams(deps, event);
}

/** The captain names their team: filtered, unique, 2–20 characters (S03-AC2). */
export async function nameTeam(
  deps: TeamDeps,
  event: EventConfig,
  uid: string,
  playerId: string,
  raw: string,
) {
  await ownPlayer(deps, event, uid, playerId);
  const team = (await deps.teams.list(event.slug)).find((t) => t.captainId === playerId);
  if (!team) throw new AppError("FORBIDDEN", "Only a captain can name their team.");
  const name = checkTeamName(raw, event.blockedNames);
  if (!name.ok) throw new AppError("BAD_REQUEST", name.message);
  await deps.teams.rename(event.slug, team.id, name.nickname, name.key);
  await publishTeams(deps, event);
}

/** A player joins a team in the team phase; full teams refuse and nobody switches (S03-AC3). */
export async function joinTeam(
  deps: TeamDeps,
  event: EventConfig,
  uid: string,
  playerId: string,
  teamId: string,
) {
  await ownPlayer(deps, event, uid, playerId);
  const now = await currentTeams(deps, event);
  if (now.phase !== "team")
    throw new AppError("FORBIDDEN", "Teams open when the host starts the team phase.");
  await deps.teams.join(event.slug, teamId, playerId, now.maxTeamSize);
  await publishTeams(deps, event);
}

/** The host moves a player to a team (S03-AC4). */
export async function moveToTeam(
  deps: TeamDeps,
  event: EventConfig,
  playerId: string,
  teamId: string,
) {
  await deps.teams.move(event.slug, playerId, teamId);
  await publishTeams(deps, event);
}

/** The host makes another member a team's captain (S03-AC4). */
export async function changeCaptain(
  deps: TeamDeps,
  event: EventConfig,
  teamId: string,
  playerId: string,
) {
  await deps.teams.setCaptain(event.slug, teamId, playerId);
  await publishTeams(deps, event);
}

/** A removed, banned or forfeited player leaves their team. */
export async function dropFromTeam(deps: TeamDeps, event: EventConfig, playerId: string) {
  if (event.scoring === "individual") return;
  await deps.teams.drop(event.slug, playerId);
  await publishTeams(deps, event);
}

/** Deletes every team (S07-AC9). */
export async function clearTeams(deps: TeamDeps, event: EventConfig) {
  await deps.teams.clear(event.slug);
  await publishTeams(deps, event);
}

/** The host switches phases, either way (S03-AC1). */
export async function setPhase(deps: TeamDeps, event: EventConfig, phase: Phase) {
  if (event.scoring !== "both")
    throw new AppError("BAD_REQUEST", "Only events with both competitions switch phases.");
  await deps.events.setSettings(event.slug, { phase });
  await publishTeams(deps, event);
}

/** The host sets the maximum team size (S03-AC4). */
export async function setTeamSize(deps: TeamDeps, event: EventConfig, size: number) {
  if (!Number.isInteger(size) || size < 1 || size > 100)
    throw new AppError("BAD_REQUEST", "Pick a team size from 1 to 100.");
  await deps.events.setSettings(event.slug, { maxTeamSize: size });
  await publishTeams(deps, event);
}

/**
 * A player gives whole points of their own to any team (S03-AC6). Their
 * individual score goes down by the same amount; there's no undo.
 */
export async function donateToTeam(
  deps: TeamDeps,
  event: EventConfig,
  uid: string,
  playerId: string,
  teamId: string,
  points: number,
) {
  if (event.scoring === "individual") throw noTeams();
  const [player, status, view] = await Promise.all([
    ownPlayer(deps, event, uid, playerId),
    deps.events.status(event.slug),
    teamsView(deps, event, playerId),
  ]);
  if (status === "ended") throw new AppError("FORBIDDEN", "The party has ended.");
  const team = view.teams.find((t) => t.id === teamId);
  if (!team) throw new AppError("NOT_FOUND", "We couldn't find that team.");
  return donate(
    deps.points,
    event.slug,
    player,
    { id: team.id, name: team.name, color: team.color },
    points,
    deps.id(),
  );
}

/** Whether a player leads a team; captains can't start over (ADR-027). */
export async function isCaptain(deps: Pick<TeamDeps, "teams">, slug: string, playerId: string) {
  return (await deps.teams.list(slug)).some((t) => t.captainId === playerId);
}
