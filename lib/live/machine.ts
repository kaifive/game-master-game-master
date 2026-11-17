import { START_LEAD_MS, type AnyShowdown, type LiveTeam, type Session, type Step } from "./model";
import { afterTurn, available, nextUp, type Rotation } from "./rotation";

/**
 * The live session state machine (S11-AC2, S24-AC1): pure, so the server,
 * the tests and the bot play tests all run the same rules.
 */

export type Machine = { game: AnyShowdown; content: unknown };

/** A transition's outcome: the new session (null once ended), the rotation, and points to pay. */
export type Outcome =
  | {
      ok: true;
      session: Session | null;
      rotation: Rotation;
      /** Points to pay for a round that just closed, by team (S11-AC7). */
      award: { round: number; points: Record<string, number> } | null;
    }
  | { ok: false; message: string };

const fail = (message: string): Outcome => ({ ok: false, message });
const done = (session: Session | null, rotation: Rotation): Outcome => ({
  ok: true,
  session,
  rotation,
  award: null,
});
const bump = (s: Session, patch: Partial<Session>): Session => ({
  ...s,
  ...patch,
  revision: s.revision + 1,
});
const ids = (s: Session) => s.teams.map((t) => t.id);
const teamOf = (s: Session, teamId: string): LiveTeam | undefined =>
  s.teams.find((t) => t.id === teamId);

/** A new session on its intro step (S11-AC1). */
export function startSession(
  m: Machine,
  init: {
    id: string;
    gameId: string;
    type: string;
    title: string;
    teams: LiveTeam[];
    seed: number;
    now: number;
  },
): Session {
  return {
    id: init.id,
    gameId: init.gameId,
    type: init.type,
    title: init.title,
    step: "intro",
    round: 0,
    rounds: Math.max(1, m.game.rounds(m.content, init.teams.length)),
    seed: init.seed,
    teams: init.teams,
    up: {},
    upTurn: null,
    state: null,
    scores: Object.fromEntries(init.teams.map((t) => [t.id, 0])),
    roundPoints: null,
    captainDevices: {},
    revision: 1,
    startedAt: init.now,
  };
}

/** The seed for one round: different each round, the same on every replay of a session. */
export const roundSeed = (s: Session, round: number) =>
  Math.abs(Math.imul(s.seed ^ (round * 0x9e3779b1), 0x85ebca6b)) >>> 0;

/** Starts round `round`'s play: everyone without a pick gets the next teammate in rotation. */
function startPlay(m: Machine, s: Session, rotation: Rotation, round: number, now: number) {
  const startsAt = now + START_LEAD_MS;
  const state = m.game.deal(m.content, {
    seed: roundSeed(s, round),
    round,
    teams: ids(s),
    startsAt,
  });
  let rot = rotation;
  const up: Record<string, string | null> = {};
  if (m.game.turns) {
    // Turn games pick a teammate when each turn comes round (assignTurn).
  } else {
    for (const team of s.teams) {
      const used = rot[team.id] ?? [];
      const picked = s.up[team.id];
      const who = picked && available(team, used).includes(picked) ? picked : nextUp(team, used);
      up[team.id] = who;
      if (who) rot = { ...rot, [team.id]: afterTurn(team, used, who) };
    }
  }
  const next = bump(s, { step: "play", round, state, up, upTurn: null, roundPoints: null });
  return assignTurn(m, next, rot, now);
}

/**
 * In a turn game, whoever's turn it is gets the next teammate in rotation
 * when their turn comes round, unless the captain already swapped someone in.
 */
function assignTurn(m: Machine, s: Session, rotation: Rotation, now: number) {
  if (!m.game.turns || s.step !== "play") return { session: s, rotation };
  const turn = m.game.turn?.(s.state, m.content, now) ?? null;
  if (!turn) return { session: s, rotation };
  const team = teamOf(s, turn.teamId);
  if (!team || s.upTurn === turn.turnNo) return { session: s, rotation };
  const used = rotation[team.id] ?? [];
  const who = nextUp(team, used);
  if (!who) return { session: s, rotation };
  // Other teams' up players stand down when the turn moves on.
  const up = Object.fromEntries(s.teams.map((t) => [t.id, t.id === team.id ? who : null]));
  return {
    session: bump(s, { up, upTurn: turn.turnNo }),
    rotation: { ...rotation, [team.id]: afterTurn(team, used, who) },
  };
}

/** Closes the round: final tick, score, and the points to pay (S11-AC7). */
function closeRound(m: Machine, s: Session, rotation: Rotation, now: number): Outcome {
  const state = m.game.tick(s.state, m.content, now);
  const points = m.game.score(state, m.content, ids(s));
  const scores = { ...s.scores };
  for (const [teamId, p] of Object.entries(points)) scores[teamId] = (scores[teamId] ?? 0) + p;
  return {
    ok: true,
    session: bump(s, { step: "results", state, scores, roundPoints: points }),
    rotation,
    award: { round: s.round, points },
  };
}

/** What the host's Next does from each step, for Controls' button (S11-AC1). */
export function nextLabel(m: Machine, s: Session): string {
  const labels: Record<Step, string> = {
    intro: m.game.turns ? "Start round 1" : "Pick players",
    pick: `Start round ${String(s.round)}`,
    play: "Show results",
    results: s.round >= s.rounds ? "Final standings" : m.game.turns ? "Next round" : "Pick players",
    final: "End the game",
  };
  return labels[s.step];
}

/** The host's Next (S24-AC1). */
export function next(m: Machine, s: Session, rotation: Rotation, now: number): Outcome {
  switch (s.step) {
    case "intro":
      if (m.game.turns) {
        const r = startPlay(m, s, rotation, 1, now);
        return done(r.session, r.rotation);
      }
      return done(bump(s, { step: "pick", round: 1, up: {} }), rotation);
    case "pick": {
      const r = startPlay(m, s, rotation, s.round, now);
      return done(r.session, r.rotation);
    }
    case "play":
      return closeRound(m, s, rotation, now);
    case "results": {
      if (s.round >= s.rounds) return done(bump(s, { step: "final", state: null }), rotation);
      const round = s.round + 1;
      if (m.game.turns) {
        const r = startPlay(m, s, rotation, round, now);
        return done(r.session, r.rotation);
      }
      return done(bump(s, { step: "pick", round, up: {}, state: null }), rotation);
    }
    case "final":
      return done(null, rotation);
  }
}

/**
 * A captain picks who's up (S24-AC2): on the pick step, or in a turn game
 * while it's their team's turn and before they've moved.
 */
export function pick(
  m: Machine,
  s: Session,
  rotation: Rotation,
  teamId: string,
  who: string,
  now: number,
): Outcome {
  const team = teamOf(s, teamId);
  if (!team) return fail("Your team isn't in this game.");
  const used = rotation[teamId] ?? [];
  if (m.game.turns) {
    const turn = m.game.turn?.(s.state, m.content, now) ?? null;
    if (s.step !== "play" || turn?.teamId !== teamId) return fail("It isn't your turn.");
    const current = s.up[teamId];
    // The swapped-out teammate gets their turn back.
    const restored = current ? used.filter((id) => id !== current) : used;
    if (!available(team, restored).includes(who)) return fail("They've already had a turn.");
    return done(bump(s, { up: { ...s.up, [teamId]: who } }), {
      ...rotation,
      [teamId]: afterTurn(team, restored, who),
    });
  }
  if (s.step !== "pick") return fail("Picks are closed for this round.");
  if (!available(team, used).includes(who)) return fail("They've already had a turn.");
  return done(bump(s, { up: { ...s.up, [teamId]: who } }), rotation);
}

/** A captain's move for their team (S11-AC6). */
export function move(
  m: Machine,
  s: Session,
  rotation: Rotation,
  teamId: string,
  input: unknown,
  now: number,
): Outcome {
  if (s.step !== "play") return fail("There's nothing to play right now.");
  if (!teamOf(s, teamId)) return fail("Your team isn't in this game.");
  const ticked = m.game.tick(s.state, m.content, now);
  const result = m.game.move(ticked, m.content, { teamId, move: input, now });
  if (!result.ok) return fail(result.message);
  const r = assignTurn(m, bump(s, { state: result.state }), rotation, now);
  return done(r.session, r.rotation);
}

/** Time passing (S11-AC2): windows close and turns move on; the same session when nothing changed. */
export function tick(m: Machine, s: Session, rotation: Rotation, now: number): Outcome {
  if (s.step !== "play") return done(s, rotation);
  const state = m.game.tick(s.state, m.content, now);
  const base = state === s.state ? s : bump(s, { state });
  const r = assignTurn(m, base, rotation, now);
  return done(r.session, r.rotation);
}
