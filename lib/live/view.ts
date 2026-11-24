import { nextLabel, type Machine } from "./machine";
import type { Role, Screen, Session } from "./model";

/** What a phone, the TV or Controls sees of the live session (S11-AC3). */
export type LiveTeamView = {
  id: string;
  name: string;
  color: number;
  /** Points won in this showdown so far. */
  score: number;
  /** Points from the round just shown; null while a round is on. */
  roundPoints: number | null;
};

export type LiveView =
  | { active: false; serverNow: number; screen: Screen }
  | {
      active: true;
      serverNow: number;
      screen: Screen;
      session: {
        id: string;
        gameId: string;
        type: string;
        title: string;
        step: Session["step"];
        round: number;
        rounds: number;
        revision: number;
      };
      demo: string;
      /** What happens if a team runs out of time. */
      timeout?: string;
      teams: LiveTeamView[];
      /** The game's own view for this role (specs 25 to 27). */
      game: unknown;
      /** On a phone: your team, and whether you're its proven captain (S24-AC3). */
      you: { teamId: string; captain: boolean } | null;
    };

export type ActiveView = Extract<LiveView, { active: true }>;

/** Builds one role's view; the game decides what of its state that role may see. */
export function liveView(
  m: Machine | null,
  s: Session | null,
  role: Role,
  now: number,
  screen: Screen = "showdown",
): LiveView {
  if (!m || !s) return { active: false, serverNow: now, screen };
  const revealed = s.step === "results" || s.step === "final";
  const teamIds = s.teams.map((t) => t.id);
  const game =
    s.step === "play" || s.step === "results"
      ? m.game.view(s.state, m.content, { role, revealed, now, teams: teamIds })
      : null;
  const you =
    role.kind !== "tv" && s.teams.some((t) => t.id === role.teamId)
      ? { teamId: role.teamId, captain: role.kind === "captain" }
      : null;
  return {
    active: true,
    serverNow: now,
    screen,
    session: {
      id: s.id,
      gameId: s.gameId,
      type: s.type,
      title: s.title,
      step: s.step,
      round: s.round,
      rounds: s.rounds,
      revision: s.revision,
    },
    demo: m.game.demo,
    ...(m.game.timeout ? { timeout: m.game.timeout } : {}),
    teams: s.teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      score: s.scores[t.id] ?? 0,
      roundPoints: s.step === "results" ? (s.roundPoints?.[t.id] ?? 0) : null,
    })),
    game,
    you,
  };
}

/** Controls' view of the session: the TV's, plus what Next will do. */
export type ControlsSessionView = LiveView & {
  next: string | null;
  /** The game's view for the host, with what only Controls sees (spec 12: the answer). */
  host: unknown;
};

export const controlsView = (
  m: Machine | null,
  s: Session | null,
  now: number,
  screen: Screen,
): ControlsSessionView =>
  m && s
    ? {
        ...liveView(m, s, { kind: "tv" }, now, screen),
        next: nextLabel(m, s),
        host:
          s.step === "play" && m.game.hostView
            ? m.game.hostView(s.state, m.content, { now, teams: s.teams.map((t) => t.id) })
            : null,
      }
    : { active: false, serverNow: now, screen, next: null, host: null };

/** The moments in a round's timeline where its view changes by itself. */
const BOUNDARIES = ["startsAt", "showEndsAt", "closesAt"] as const;

/**
 * When a screen should fetch again without waiting for its next poll: the
 * next start, end of the show or close in the game's view, so the TV and
 * phones move on the moment the scene or question becomes theirs to show
 * (Khai, 2026-11-24: the TV crashed showing the question from a view fetched
 * before the start). Null when nothing is due.
 */
export function wakeAt(view: LiveView): number | null {
  if (!view.active || view.session.step !== "play") return null;
  const g = view.game as Record<string, unknown> | null;
  if (!g || typeof g !== "object") return null;
  let next: number | null = null;
  for (const key of BOUNDARIES) {
    const at = g[key];
    if (typeof at === "number" && at > view.serverNow && (next === null || at < next)) next = at;
  }
  return next;
}
