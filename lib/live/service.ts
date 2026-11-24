import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { EventConfig, GameConfig } from "@/lib/events";
import type { PointsDeps } from "@/lib/points";
import { awardTeam } from "@/lib/points";
import type { TeamsSummary } from "@/lib/teams";
import {
  move as machineMove,
  minTeams,
  hostAct,
  next as machineNext,
  startSession,
  tick as machineTick,
  type Machine,
  type Outcome,
} from "./machine";
import { MAX_TEAMS, type AnyShowdown, type LiveTeam, type Role, type Session } from "./model";
import {
  addPerson,
  checkName,
  markPlayed,
  MAX_ADDED,
  removePerson,
  resetTeam,
  roster,
} from "./played";
import { withFinished, type LiveRepo, type LiveState } from "./repo";
import { controlsView, liveView } from "./view";

/** Everything the live service needs (spec 11). */
export type LiveDeps = {
  live: LiveRepo;
  /** The teams summary (RTDB), read once when a session starts. */
  teams: (slug: string) => Promise<TeamsSummary | null>;
  /** Whether a player is on this phone: a Firestore read, so done once per captain (ADR-037). */
  owns: (slug: string, uid: string, playerId: string) => Promise<boolean>;
  points: PointsDeps;
  showdown: (type: string) => AnyShowdown | undefined;
  now: () => number;
  id: () => string;
  seed: () => number;
};

/** The event's live games the host can start (S11-AC1). */
export const liveGames = (deps: Pick<LiveDeps, "showdown">, event: EventConfig): GameConfig[] =>
  event.games.filter(
    (g) => g.mode === "live" && g.visibility !== "off" && deps.showdown(g.type) !== undefined,
  );

function machineFor(deps: LiveDeps, event: EventConfig, s: Session | null): Machine | null {
  if (!s) return null;
  const game = event.games.find((g) => g.id === s.gameId);
  const showdown = game ? deps.showdown(game.type) : undefined;
  if (!game || !showdown) return null;
  return { game: showdown, content: showdown.content.parse(game.content) };
}

/** Pays a closed round's points to teams, once each (S11-AC7, S24-AC5). */
async function pay(deps: LiveDeps, slug: string, s: Session, outcome: Outcome) {
  if (!outcome.ok || !outcome.award) return;
  const { round, points } = outcome.award;
  for (const team of s.teams) {
    const p = points[team.id] ?? 0;
    if (p <= 0) continue;
    await awardTeam(
      deps.points,
      slug,
      { id: team.id, name: team.name, color: team.color },
      {
        id: `live_${s.id}_${String(round)}_${team.id}`,
        points: p,
        reason: `${s.title} · round ${String(round)}`,
        source: { kind: "game", id: s.gameId },
        createdBy: "server",
      },
    );
  }
}

/**
 * Applies a transition atomically. The machine runs inside the store's
 * update, so two requests at once can't both act on the same state.
 */
async function transition(
  deps: LiveDeps,
  event: EventConfig,
  run: (m: Machine, session: Session, now: number) => Outcome,
): Promise<{ state: LiveState; outcome: Outcome }> {
  // Set inside the store's update callback, which TypeScript can't follow.
  const box: { outcome: Outcome; before: Session | null } = {
    outcome: { ok: false, message: "No live game is running." },
    before: null,
  };
  const state = await deps.live.update(event.slug, (current) => {
    const m = machineFor(deps, event, current.session);
    if (!m || !current.session) {
      box.outcome = { ok: false, message: "No live game is running." };
      return null;
    }
    box.before = current.session;
    box.outcome = run(m, current.session, deps.now());
    if (!box.outcome.ok) return null;
    return withFinished({ ...current, session: box.outcome.session }, box.outcome.session);
  });
  const outcome = box.outcome;
  if (!outcome.ok) throw new AppError("CONFLICT", outcome.message);
  if (box.before) await pay(deps, event.slug, box.before, outcome);
  return { state, outcome };
}

/** Lets time pass for a read (S11-AC2): closes windows and moves turns, writing only on change. */
async function current(deps: LiveDeps, event: EventConfig): Promise<LiveState> {
  const state = await deps.live.read(event.slug);
  const m = machineFor(deps, event, state.session);
  if (!m || !state.session || state.session.step !== "play") return state;
  const ticked = machineTick(m, state.session, deps.now());
  if (!ticked.ok || ticked.session === state.session) return state;
  // What this read wrote, if it won: a round it closed pays its points, once.
  const box: { before: Session | null; outcome: Outcome | null } = { before: null, outcome: null };
  const after = await deps.live.update(event.slug, (latest) => {
    box.before = null;
    box.outcome = null;
    if (!latest.session || latest.session.revision !== state.session?.revision) return null;
    const again = machineTick(m, latest.session, deps.now());
    if (!again.ok) return null;
    box.before = latest.session;
    box.outcome = again;
    return withFinished({ ...latest, session: again.session }, again.session);
  });
  const { before, outcome } = box;
  if (before && outcome?.ok && after.session?.revision === outcome.session?.revision)
    await pay(deps, event.slug, before, outcome);
  return after;
}

type SummaryTeam = TeamsSummary["teams"][number];

/** A team's members, captain first. */
const membersOf = (t: SummaryTeam) =>
  (t.captain ? [t.captain, ...t.members.filter((m) => m.id !== t.captain?.id)] : t.members).map(
    (m) => ({ id: m.id, nickname: m.nickname }),
  );

/**
 * Teams as they are now, for a new session. Only teams with a captain can
 * play: someone has to hold the controller (S24, behavior 5).
 */
function teamsFrom(summary: TeamsSummary | null): LiveTeam[] {
  return (summary?.teams ?? [])
    .filter((t) => t.captain)
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      captainId: t.captain?.id ?? null,
      members: membersOf(t),
    }));
}

const Id = z.string().min(1).max(64);

export const AdminLiveAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), gameId: Id }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("end") }),
  /** The game's own host step, such as opening the buzzers (spec 12). */
  z.object({ action: z.literal("host"), act: z.unknown() }),
  z.object({ action: z.literal("screen"), screen: z.enum(["leaderboard", "showdown"]) }),
  z.object({ action: z.literal("played"), teamId: Id, personId: Id, played: z.boolean() }),
  z.object({ action: z.literal("add"), teamId: Id, name: z.string().max(80) }),
  z.object({ action: z.literal("remove"), teamId: Id, personId: Id }),
  z.object({ action: z.literal("reset"), teamId: Id }),
]);

/** Why a game can't start with this many teams, or null when it can (S24-AC11). */
function teamsProblem(m: Pick<Machine, "game">, teams: number): string | null {
  if (teams === 0) return "Make some teams with captains first.";
  if (teams > MAX_TEAMS) return `Showdowns are built for up to ${String(MAX_TEAMS)} teams.`;
  const need = minTeams(m);
  if (teams < need) return `This game needs at least ${String(need)} teams.`;
  return null;
}

/** Controls' view: the session, the TV screen, the games to start, and Who's played. */
export async function adminLiveView(deps: LiveDeps, event: EventConfig) {
  const state = await current(deps, event);
  const m = machineFor(deps, event, state.session);
  const summary = await deps.teams(event.slug);
  const playing = teamsFrom(summary).length;
  return {
    ...controlsView(m, state.session, deps.now(), state.screen, state.finished),
    games: liveGames(deps, event).map((g) => {
      const showdown = deps.showdown(g.type);
      return {
        id: g.id,
        title: g.title,
        type: g.type,
        blocked: showdown ? teamsProblem({ game: showdown }, playing) : null,
      };
    }),
    played: (summary?.teams ?? []).map((t) =>
      roster({ id: t.id, name: t.name, color: t.color, members: membersOf(t) }, state.played),
    ),
  };
}

/** Checks a Who's played change against the event's teams as they are now. */
async function changePlayed(
  deps: LiveDeps,
  event: EventConfig,
  body: Extract<z.infer<typeof AdminLiveAction>, { teamId: string }>,
) {
  const summary = await deps.teams(event.slug);
  const t = summary?.teams.find((x) => x.id === body.teamId);
  if (!t) throw new AppError("NOT_FOUND", "That team isn't in this event.");
  const box: { error: string | null } = { error: null };
  const newId = body.action === "add" ? `x${deps.id()}` : "";
  await deps.live.update(event.slug, (cur) => {
    const list = roster(
      { id: t.id, name: t.name, color: t.color, members: membersOf(t) },
      cur.played,
    );
    if (body.action === "reset") return { ...cur, played: resetTeam(cur.played, t.id) };
    if (body.action === "add") {
      const name = checkName(body.name);
      if (!name.ok) {
        box.error = name.message;
        return null;
      }
      if (list.people.filter((p) => p.added).length >= MAX_ADDED) {
        box.error = "That team has enough added names.";
        return null;
      }
      return { ...cur, played: addPerson(cur.played, t.id, newId, name.name) };
    }
    const person = list.people.find((p) => p.id === body.personId);
    if (!person) {
      box.error = "They aren't on that team.";
      return null;
    }
    if (body.action === "remove") {
      if (!person.added) {
        box.error = "Only names you added can be removed.";
        return null;
      }
      return { ...cur, played: removePerson(cur.played, t.id, person.id) };
    }
    return { ...cur, played: markPlayed(cur.played, t.id, person.id, body.played) };
  });
  if (box.error) throw new AppError("CONFLICT", box.error);
}

/** The host starts, steps or ends a live game, switches the TV, or updates Who's played. */
export async function adminLiveAction(
  deps: LiveDeps,
  event: EventConfig,
  body: z.infer<typeof AdminLiveAction>,
) {
  if (body.action === "start") {
    const game = liveGames(deps, event).find((g) => g.id === body.gameId);
    const showdown = game ? deps.showdown(game.type) : undefined;
    if (!game || !showdown) throw new AppError("NOT_FOUND", "That live game isn't in this event.");
    const teams = teamsFrom(await deps.teams(event.slug));
    const m: Machine = { game: showdown, content: showdown.content.parse(game.content) };
    const problem = teamsProblem(m, teams.length);
    if (problem) throw new AppError("CONFLICT", problem);
    const box = { refused: false };
    await deps.live.update(event.slug, (cur) => {
      if (cur.session) {
        box.refused = true;
        return null;
      }
      // Starting a showdown puts it on the TV (S24-AC9).
      return {
        ...cur,
        screen: "showdown",
        session: startSession(m, {
          id: deps.id(),
          gameId: game.id,
          type: game.type,
          title: game.title,
          teams,
          seed: deps.seed(),
          now: deps.now(),
        }),
      };
    });
    if (box.refused)
      throw new AppError("CONFLICT", "A live game is already running. End it first.");
  } else if (body.action === "next") {
    await transition(deps, event, (m, s, now) => machineNext(m, s, now));
  } else if (body.action === "host") {
    const act = body.act;
    await transition(deps, event, (m, s, now) => hostAct(m, s, act, now));
  } else if (body.action === "end") {
    // Ending keeps Who's played and the screen: turns are tracked all night (ADR-038).
    // A showdown that got as far as a round's results counts as played on the menu.
    await deps.live.update(event.slug, (cur) => ({
      ...withFinished(cur, cur.session),
      session: null,
    }));
  } else if (body.action === "screen") {
    const screen = body.screen;
    await deps.live.update(event.slug, (cur) => ({ ...cur, screen }));
  } else {
    await changePlayed(deps, event, body);
  }
  return adminLiveView(deps, event);
}

/** Who's asking: a team's proven captain, a team member, or the TV (S11-AC3, S24-AC3). */
async function roleOf(
  deps: LiveDeps,
  event: EventConfig,
  s: Session,
  playerId: string | null,
  uid: string | null,
): Promise<Role> {
  if (!playerId) return { kind: "tv" };
  const team = s.teams.find((t) => t.members.some((m) => m.id === playerId));
  if (!team) return { kind: "tv" };
  if (team.captainId !== playerId || !uid) return { kind: "member", teamId: team.id };
  if (s.captainDevices[team.id] === uid) return { kind: "captain", teamId: team.id };
  // A captain's phone proves itself once; then polls skip the Firestore read (ADR-037).
  if (!(await deps.owns(event.slug, uid, playerId))) return { kind: "member", teamId: team.id };
  await deps.live.update(event.slug, (cur) =>
    cur.session && cur.session.id === s.id
      ? {
          ...cur,
          session: {
            ...cur.session,
            captainDevices: { ...cur.session.captainDevices, [team.id]: uid },
          },
        }
      : null,
  );
  return { kind: "captain", teamId: team.id };
}

/** A phone's or the TV's view (S11-AC3). */
export async function phoneLiveView(
  deps: LiveDeps,
  event: EventConfig,
  playerId: string | null,
  uid: string | null,
) {
  const state = await current(deps, event);
  const m = machineFor(deps, event, state.session);
  if (!m || !state.session)
    return liveView(null, null, { kind: "tv" }, deps.now(), state.screen, state.finished);
  const role = await roleOf(deps, event, state.session, playerId, uid);
  return liveView(m, state.session, role, deps.now(), state.screen, state.finished);
}

export const PlayerLiveAction = z.object({
  action: z.literal("move"),
  playerId: Id,
  round: z.number().int(),
  move: z.unknown(),
});

/** A captain makes a move for their team (S11-AC6). */
export async function playerLiveAction(
  deps: LiveDeps,
  event: EventConfig,
  uid: string,
  body: z.infer<typeof PlayerLiveAction>,
) {
  const before = await deps.live.read(event.slug);
  const s = before.session;
  if (!s) throw new AppError("CONFLICT", "No live game is running.");
  const role = await roleOf(deps, event, s, body.playerId, uid);
  if (role.kind !== "captain")
    throw new AppError("FORBIDDEN", "Only your team's captain can do that.");
  // A move for an old round changes nothing (S11-AC6).
  if (body.round !== s.round) return phoneLiveView(deps, event, body.playerId, uid);
  await transition(deps, event, (m, session, now) =>
    session.round !== body.round
      ? { ok: false, message: "That round is over." }
      : machineMove(m, session, role.teamId, body.move, now),
  );
  return phoneLiveView(deps, event, body.playerId, uid);
}

/** Clears live state with test data (spec 07). */
export const clearLive = (deps: Pick<LiveDeps, "live">, slug: string) => deps.live.clear(slug);
