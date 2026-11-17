import { nextLabel, type Machine } from "./machine";
import type { Role, Session } from "./model";
import { available, type Rotation } from "./rotation";

/** What a phone, the TV or Controls sees of the live session (S11-AC3). */
export type LiveTeamView = {
  id: string;
  name: string;
  color: number;
  score: number;
  /** Points from the round just shown; null while a round is on. */
  roundPoints: number | null;
  up: { id: string; nickname: string } | null;
};

export type LiveView =
  | { active: false; serverNow: number }
  | {
      active: true;
      serverNow: number;
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
      teams: LiveTeamView[];
      /** The game's own view for this role (specs 25 to 27). */
      game: unknown;
      /** On a phone: your team, and as captain, who you can pick (S24-AC2, AC3). */
      you: {
        teamId: string;
        captain: boolean;
        canPick: boolean;
        pickable: { id: string; nickname: string; available: boolean }[];
      } | null;
    };

export type ControlsLiveView = LiveView & { next: string | null };

const nickname = (s: Session, teamId: string, playerId: string | null | undefined) => {
  if (!playerId) return null;
  const m = s.teams.find((t) => t.id === teamId)?.members.find((p) => p.id === playerId);
  return m ? { id: m.id, nickname: m.nickname } : null;
};

/** Builds one role's view; the game decides what of its state that role may see. */
export function liveView(
  m: Machine | null,
  s: Session | null,
  rotation: Rotation,
  role: Role,
  now: number,
): LiveView {
  if (!m || !s) return { active: false, serverNow: now };
  const revealed = s.step === "results" || s.step === "final";
  const teamIds = s.teams.map((t) => t.id);
  const game =
    s.step === "play" || s.step === "results"
      ? m.game.view(s.state, m.content, { role, revealed, now, teams: teamIds })
      : null;
  let you: Extract<LiveView, { active: true }>["you"] = null;
  if (role.kind !== "tv") {
    const team = s.teams.find((t) => t.id === role.teamId);
    if (team) {
      const used = rotation[team.id] ?? [];
      const free = available(team, used);
      const turn = m.game.turn?.(s.state, m.content, now) ?? null;
      const canPick =
        role.kind === "captain" &&
        (m.game.turns ? s.step === "play" && turn?.teamId === team.id : s.step === "pick");
      you = {
        teamId: team.id,
        captain: role.kind === "captain",
        canPick,
        pickable:
          role.kind === "captain"
            ? team.members.map((p) => ({
                id: p.id,
                nickname: p.nickname,
                available: free.includes(p.id) || s.up[team.id] === p.id,
              }))
            : [],
      };
    }
  }
  return {
    active: true,
    serverNow: now,
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
    teams: s.teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      score: s.scores[t.id] ?? 0,
      roundPoints: s.step === "results" ? (s.roundPoints?.[t.id] ?? 0) : null,
      up: nickname(s, t.id, s.up[t.id]),
    })),
    game,
    you,
  };
}

/** Controls' view: the TV's, plus what Next will do. */
export const controlsView = (
  m: Machine | null,
  s: Session | null,
  rotation: Rotation,
  now: number,
): ControlsLiveView =>
  m && s
    ? { ...liveView(m, s, rotation, { kind: "tv" }, now), next: nextLabel(m, s) }
    : { active: false, serverNow: now, next: null };
