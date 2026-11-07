import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eventRuntime, requireEvent } from "@/lib/events/server";
import { playerRepo } from "@/lib/players/server";
import { displayStandings, phoneStandings, pointsDeps } from "@/lib/points/server";
import { teamRepo, teamSummary } from "./runtime";
import {
  donateToTeam,
  dropFromTeam,
  isCaptain,
  joinTeam,
  nameTeam,
  teamOf,
  teamsView,
  type TeamDeps,
} from "./service";

/** Server-only entry for teams (spec 03). */
export const teamDeps = (): TeamDeps => ({
  teams: teamRepo(),
  players: playerRepo(),
  events: eventRuntime(),
  summary: teamSummary(),
  points: pointsDeps(),
  id: () => randomUUID(),
});

type Slug = string | string[] | undefined;

/** GET /teams: public; names, colors, members and room left, from the summary. */
export const teamsFor = (slug: Slug, playerId: string | null) =>
  teamsView({ summary: teamSummary() }, requireEvent(slug), playerId);

const Id = z.string().min(1).max(64);

export const TeamAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("join"), playerId: Id, teamId: Id }),
  z.object({ action: z.literal("name"), playerId: Id, name: z.string().max(64) }),
  z.object({
    action: z.literal("donate"),
    playerId: Id,
    teamId: Id,
    points: z.number().int().min(1).max(1_000_000),
  }),
]);

/** POST /teams from a phone: join a team, name yours as captain, or donate (S03-AC2, AC3, AC6). */
export async function teamAction(slug: Slug, uid: string, body: z.infer<typeof TeamAction>) {
  const event = requireEvent(slug);
  const deps = teamDeps();
  if (body.action === "join") await joinTeam(deps, event, uid, body.playerId, body.teamId);
  else if (body.action === "name") await nameTeam(deps, event, uid, body.playerId, body.name);
  else await donateToTeam(deps, event, uid, body.playerId, body.teamId, body.points);
  return teamsView(deps, event, body.playerId);
}

/** GET /leaderboard: public; players, and in the team phase the teams (S05-AC2, S03-AC8). */
export async function leaderboardFor(slug: Slug, playerId: string | null) {
  const event = requireEvent(slug);
  const view = await teamsView({ summary: teamSummary() }, event, playerId);
  // Hidden by the host: nothing about the standings leaves the server (S07-AC11).
  if (!view.board.phones)
    return { hidden: true, top: [], me: null, phase: view.phase, teams: [], myTeam: null };
  return {
    hidden: false,
    ...(await phoneStandings(pointsDeps(), event.slug, playerId, {
      phase: view.phase,
      teamId: view.mine?.teamId ?? null,
    })),
  };
}

/** GET /display: public; team bars and the top players in the team phase (S05-AC4, S03-AC8). */
export async function displayFor(slug: Slug) {
  const event = requireEvent(slug);
  const view = await teamsView({ summary: teamSummary() }, event, null);
  if (!view.board.tv)
    return { hidden: true, phase: view.phase, players: [], teams: [], recent: [] };
  return { hidden: false, ...(await displayStandings(pointsDeps(), event.slug, view.phase)) };
}

/** The player's team, from the summary, for team games (S03-AC5). */
export const teamOfPlayer = (slug: string, playerId: string) =>
  teamOf({ summary: teamSummary() }, requireEvent(slug), playerId);

/** A forfeited player leaves their team (ADR-027). */
export const dropPlayer = (slug: string, playerId: string) =>
  dropFromTeam(teamDeps(), requireEvent(slug), playerId);

export const captainCheck = (slug: string, playerId: string) =>
  isCaptain({ teams: teamRepo() }, slug, playerId);
export { teamRepo, teamSummary } from "./runtime";
