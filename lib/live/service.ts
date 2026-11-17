import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { EventConfig, GameConfig } from "@/lib/events";
import type { PointsDeps } from "@/lib/points";
import { awardTeam } from "@/lib/points";
import type { TeamsSummary } from "@/lib/teams";
import {
  move as machineMove,
  next as machineNext,
  pick as machinePick,
  startSession,
  tick as machineTick,
  type Machine,
  type Outcome,
} from "./machine";
import type { AnyShowdown, LiveTeam, Role, Session } from "./model";
import type { LiveRepo, LiveState } from "./repo";
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
  run: (m: Machine, state: LiveState, now: number) => Outcome,
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
    box.outcome = run(m, current, deps.now());
    if (!box.outcome.ok) return null;
    return { session: box.outcome.session, rotation: box.outcome.rotation };
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
  const ticked = machineTick(m, state.session, state.rotation, deps.now());
  if (!ticked.ok || ticked.session === state.session) return state;
  return deps.live.update(event.slug, (latest) => {
    if (!latest.session || latest.session.revision !== state.session?.revision) return null;
    const again = machineTick(m, latest.session, latest.rotation, deps.now());
    return again.ok ? { session: again.session, rotation: again.rotation } : null;
  });
}

/** Teams as they are now, for a new session: named, coloured, with members captain first. */
function teamsFrom(summary: TeamsSummary | null): LiveTeam[] {
  return (summary?.teams ?? []).map((t) => {
    const members = t.captain
      ? [t.captain, ...t.members.filter((m) => m.id !== t.captain?.id)]
      : t.members;
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      captainId: t.captain?.id ?? null,
      members: members.map((m) => ({ id: m.id, nickname: m.nickname })),
    };
  });
}

export const AdminLiveAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), gameId: z.string().min(1).max(64) }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("end") }),
]);

/** Controls' view of the live session. */
export async function adminLiveView(deps: LiveDeps, event: EventConfig) {
  const state = await current(deps, event);
  const m = machineFor(deps, event, state.session);
  return {
    ...controlsView(m, state.session, state.rotation, deps.now()),
    games: liveGames(deps, event).map((g) => ({ id: g.id, title: g.title, type: g.type })),
  };
}

/** The host starts, steps or ends a live game (S11-AC1, S24-AC1). */
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
    if (teams.length === 0) throw new AppError("CONFLICT", "Make some teams first.");
    const m: Machine = { game: showdown, content: showdown.content.parse(game.content) };
    const box = { refused: false };
    await deps.live.update(event.slug, (cur) => {
      if (cur.session) {
        box.refused = true;
        return null;
      }
      return {
        session: startSession(m, {
          id: deps.id(),
          gameId: game.id,
          type: game.type,
          title: game.title,
          teams,
          seed: deps.seed(),
          now: deps.now(),
        }),
        rotation: cur.rotation,
      };
    });
    if (box.refused)
      throw new AppError("CONFLICT", "A live game is already running. End it first.");
  } else if (body.action === "next") {
    await transition(deps, event, (m, st, now) =>
      st.session ? machineNext(m, st.session, st.rotation, now) : { ok: false, message: "" },
    );
  } else {
    // Ending keeps the rotation, so turns stay spread across the night (S24-AC2).
    await deps.live.update(event.slug, (cur) => ({ session: null, rotation: cur.rotation }));
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
  if (!m || !state.session) return liveView(null, null, state.rotation, { kind: "tv" }, deps.now());
  const role = await roleOf(deps, event, state.session, playerId, uid);
  return liveView(m, state.session, state.rotation, role, deps.now());
}

const Id = z.string().min(1).max(64);
export const PlayerLiveAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pick"), playerId: Id, round: z.number().int(), who: Id }),
  z.object({ action: z.literal("move"), playerId: Id, round: z.number().int(), move: z.unknown() }),
]);

/** A captain picks who's up or makes a move (S11-AC6, S24-AC2). */
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
  await transition(deps, event, (m, st, now) => {
    if (!st.session || st.session.round !== body.round)
      return { ok: false, message: "That round is over." };
    return body.action === "pick"
      ? machinePick(m, st.session, st.rotation, role.teamId, body.who, now)
      : machineMove(m, st.session, st.rotation, role.teamId, body.move, now);
  });
  return phoneLiveView(deps, event, body.playerId, uid);
}

/** Clears live state with test data (spec 07). */
export const clearLive = (deps: Pick<LiveDeps, "live">, slug: string) => deps.live.clear(slug);
