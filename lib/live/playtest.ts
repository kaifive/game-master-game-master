import { seededRandom } from "@/lib/games";
import { move, next, pick, startSession, tick, type Machine } from "./machine";
import type { AnyShowdown, LiveTeam, Role, Session } from "./model";
import type { Rotation } from "./rotation";
import { liveView, type LiveView } from "./view";

/**
 * Mock play tests (S24-AC8): whole showdowns played by bot teams on the real
 * state machine, against a simulated clock. Each game's playtest.test.ts
 * runs many scenarios through this and checks what must always hold.
 */

/** What a bot sees: its captain view, the time, a random source, and (for "perfect" bots) the true state. */
export type BotContext = {
  teamId: string;
  view: Extract<LiveView, { active: true }>;
  now: number;
  random: () => number;
  /** The game's real state: only "perfect" bots may look. */
  peek: unknown;
};

/** A bot's choice at one moment: a move to send, or nothing (yet). */
export type Bot = (ctx: BotContext) => unknown;

export type PlaytestOptions = {
  teams: number;
  /** One bot per team, by index; a team without one never answers. */
  bots: (index: number) => Bot | null;
  seed: number;
  /** How often bots get a look and time passes, in ms. */
  stepMs?: number;
  /** How long a round may run before the host taps Next anyway. */
  roundCapMs?: number;
  /** Teams that drop out (stop answering) from this round on, by index. */
  dropOutFrom?: Record<number, number>;
  /** How many teammates each team has. */
  teamSize?: number;
  /** Checks an unrevealed view for leaked secrets; returns a problem, or null. */
  leakCheck?: (view: unknown, state: unknown, role: Role) => string | null;
};

export type PlaytestResult = {
  /** Points per team per round. */
  rounds: Record<string, number>[];
  scores: Record<string, number>;
  /** In turn games, the order teams took their turns in, per round. */
  turnOrders: string[][];
  /** Moves the game turned down: fine for random bots, a bug for perfect ones. */
  rejected: { teamId: string; message: string }[];
  leaks: string[];
  /** Who played each round for each team. */
  players: Record<string, string | null>[];
  ended: boolean;
};

export const playtestTeams = (n: number, size = 3): LiveTeam[] =>
  Array.from({ length: n }, (_, i) => {
    const id = `t${String(i + 1)}`;
    const members = Array.from({ length: size }, (_, j) => ({
      id: `${id}p${String(j + 1)}`,
      nickname: `${id} player ${String(j + 1)}`,
    }));
    return {
      id,
      name: `Team ${String(i + 1)}`,
      color: (i % 8) + 1,
      captainId: members[0]?.id ?? null,
      members,
    };
  });

/** Plays one whole showdown. Throws if the machine refuses the host's Next, which never should happen. */
export function playtest(
  game: AnyShowdown,
  content: unknown,
  opts: PlaytestOptions,
): PlaytestResult {
  const m: Machine = { game, content: game.content.parse(content) };
  const random = seededRandom(opts.seed);
  const stepMs = opts.stepMs ?? 100;
  const cap = opts.roundCapMs ?? 120_000;
  const teams = playtestTeams(opts.teams, opts.teamSize ?? 3);
  let now = 1_000_000;
  let rotation: Rotation = {};
  let s: Session | null = startSession(m, {
    id: "play",
    gameId: "g",
    type: "test",
    title: "Test",
    teams,
    seed: opts.seed,
    now,
  });
  const result: PlaytestResult = {
    rounds: [],
    scores: {},
    turnOrders: [],
    rejected: [],
    leaks: [],
    players: [],
    ended: false,
  };

  const checkLeaks = (session: Session) => {
    if (!opts.leakCheck || session.step !== "play") return;
    const roles: Role[] = [
      { kind: "tv" },
      ...teams.flatMap((t): Role[] => [
        { kind: "captain", teamId: t.id },
        { kind: "member", teamId: t.id },
      ]),
    ];
    for (const role of roles) {
      const view = liveView(m, session, rotation, role, now);
      if (!view.active) continue;
      const problem = opts.leakCheck(view.game, session.state, role);
      if (problem)
        result.leaks.push(`${role.kind}${"teamId" in role ? ` ${role.teamId}` : ""}: ${problem}`);
    }
  };

  const hostNext = (session: Session): Session | null => {
    const out = next(m, session, rotation, now);
    if (!out.ok) throw new Error(`Next refused on ${session.step}: ${out.message}`);
    if (out.award) {
      result.rounds.push(out.award.points);
      result.players.push({ ...session.up });
    }
    rotation = out.rotation;
    return out.session;
  };

  for (let guard = 0; s && guard < 1000; guard++) {
    if (s.step === "pick") {
      // Captains pick at random among who's available, or leave it to the app.
      for (const team of teams) {
        if (random() < 0.3) continue;
        const view = liveView(m, s, rotation, { kind: "captain", teamId: team.id }, now);
        const free = view.active ? (view.you?.pickable.filter((p) => p.available) ?? []) : [];
        const who = free[Math.floor(random() * free.length)];
        if (!who) continue;
        const out = pick(m, s, rotation, team.id, who.id, now);
        if (out.ok && out.session) {
          s = out.session;
          rotation = out.rotation;
        }
      }
      s = hostNext(s);
      continue;
    }
    if (s.step !== "play") {
      s = hostNext(s);
      continue;
    }
    // Play the round: time passes in steps, and each bot gets a look every step.
    const round = s.round;
    const order: string[] = [];
    const roundEnds = now + cap;
    let playing: Session = s;
    while (playing.step === "play" && now < roundEnds) {
      const ticked = tick(m, playing, rotation, now);
      if (ticked.ok && ticked.session) {
        playing = ticked.session;
        rotation = ticked.rotation;
      }
      checkLeaks(playing);
      const turn = m.game.turn?.(playing.state, m.content, now) ?? null;
      if (turn && order[order.length - 1] !== turn.teamId) order.push(turn.teamId);
      if (m.game.over(playing.state, m.content, now)) break;
      for (const [i, team] of teams.entries()) {
        const dropped = opts.dropOutFrom?.[i];
        if (dropped !== undefined && round >= dropped) continue;
        const bot = opts.bots(i);
        if (!bot) continue;
        const view = liveView(m, playing, rotation, { kind: "captain", teamId: team.id }, now);
        if (!view.active) continue;
        const choice = bot({ teamId: team.id, view, now, random, peek: playing.state });
        if (choice === undefined || choice === null) continue;
        const out = move(m, playing, rotation, team.id, choice, now);
        if (out.ok && out.session) {
          playing = out.session;
          rotation = out.rotation;
        } else if (!out.ok) result.rejected.push({ teamId: team.id, message: out.message });
      }
      now += stepMs;
    }
    if (order.length > 0) result.turnOrders.push(order);
    s = hostNext(playing); // play → results
  }
  result.ended = s === null;
  for (const r of result.rounds)
    for (const [t, p] of Object.entries(r)) result.scores[t] = (result.scores[t] ?? 0) + p;
  return result;
}
