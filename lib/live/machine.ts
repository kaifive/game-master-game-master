import {
  LATE_MS,
  START_LEAD_MS,
  type AnyShowdown,
  type LiveTeam,
  type Session,
  type Step,
} from "./model";

/**
 * The live session state machine (S11-AC2, S24-AC1): pure, so the server,
 * the tests and the bot play tests all run the same rules. Who plays for a
 * team is the room's call, tracked by the host (ADR-038), so the machine only
 * knows teams.
 */

export type Machine = { game: AnyShowdown; content: unknown };

/** A transition's outcome: the new session (null once ended) and points to pay. */
export type Outcome =
  | {
      ok: true;
      session: Session | null;
      /** Points to pay for a round that just closed, by team (S11-AC7). */
      award: { round: number; points: Record<string, number> } | null;
    }
  | { ok: false; message: string };

const fail = (message: string): Outcome => ({ ok: false, message });
const done = (session: Session | null): Outcome => ({ ok: true, session, award: null });
const bump = (s: Session, patch: Partial<Session>): Session => ({
  ...s,
  ...patch,
  revision: s.revision + 1,
});
const ids = (s: Session) => s.teams.map((t) => t.id);

/** Fewest teams a game can be played with (S24-AC11). */
export const minTeams = (m: Pick<Machine, "game">) => Math.max(1, m.game.minTeams ?? 1);

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

/** Starts a round on a shared start a little ahead (S11-AC5). */
function startPlay(m: Machine, s: Session, round: number, now: number): Session {
  const state = m.game.deal(m.content, {
    seed: roundSeed(s, round),
    round,
    teams: ids(s),
    startsAt: now + START_LEAD_MS,
    // The last round's final state, for games that carry something forward.
    prev: round > 1 ? s.state : null,
  });
  return bump(s, { step: "play", round, state, roundPoints: null });
}

/** Closes the round: final tick, score, and the points to pay (S11-AC7). */
function closeRound(m: Machine, s: Session, now: number): Outcome {
  const ticked = m.game.tick(s.state, m.content, now);
  const state = m.game.close ? m.game.close(ticked, m.content, now) : ticked;
  const points = m.game.score(state, m.content, ids(s));
  const scores = { ...s.scores };
  for (const [teamId, p] of Object.entries(points)) scores[teamId] = (scores[teamId] ?? 0) + p;
  return {
    ok: true,
    session: bump(s, { step: "results", state, scores, roundPoints: points }),
    award: { round: s.round, points },
  };
}

/** What the host's Next does from each step, for Controls' button (S11-AC1). */
export function nextLabel(m: Machine, s: Session): string {
  const own = m.game.labels;
  const last = s.round >= s.rounds;
  const labels: Record<Step, string> = {
    intro: own ? own.start(1) : "Start round 1",
    play: m.game.skipResults
      ? last
        ? "Final standings"
        : (own?.next ?? "Next round")
      : "Show results",
    results: s.round >= s.rounds ? "Final standings" : `Start round ${String(s.round + 1)}`,
    final: "End the game",
  };
  return labels[s.step];
}

/** The host's Next (S24-AC1). */
export function next(m: Machine, s: Session, now: number): Outcome {
  switch (s.step) {
    case "intro":
      return done(startPlay(m, s, 1, now));
    case "play": {
      const closed = closeRound(m, s, now);
      if (!m.game.skipResults || !closed.ok || !closed.session) return closed;
      // Straight on, with the closed round's points still paid (spec 12).
      const after = closed.session;
      const on =
        after.round >= after.rounds
          ? bump(after, { step: "final", state: null })
          : startPlay(m, after, after.round + 1, now);
      return { ok: true, session: on, award: closed.award };
    }
    case "results":
      if (s.round >= s.rounds) return done(bump(s, { step: "final", state: null }));
      return done(startPlay(m, s, s.round + 1, now));
    case "final":
      return done(null);
  }
}

/** A captain's move for their team (S11-AC6). */
export function move(m: Machine, s: Session, teamId: string, input: unknown, now: number): Outcome {
  if (s.step !== "play") return fail("There's nothing to play right now.");
  if (!s.teams.some((t) => t.id === teamId)) return fail("Your team isn't in this game.");
  const ticked = m.game.tick(s.state, m.content, now);
  const result = m.game.move(ticked, m.content, { teamId, move: input, now });
  if (!result.ok) return fail(result.message);
  return done(bump(s, { state: result.state }));
}

/** The host's own step inside a round, from Controls (spec 12). */
export function hostAct(m: Machine, s: Session, action: unknown, now: number): Outcome {
  if (s.step !== "play" || !m.game.host) return fail("There's nothing to do right now.");
  const result = m.game.host(m.game.tick(s.state, m.content, now), m.content, { action, now });
  if (!result.ok) return fail(result.message);
  return done(bump(s, { state: result.state }));
}

/** Time passing (S11-AC2): windows close and turns move on; the same session when nothing changed. */
/**
 * Time passing. Once a round has nothing left to wait for (everyone has
 * answered, or the time is up and a late answer can't still arrive), it
 * closes and shows its results without waiting for the host's Next (Khai,
 * 2026-11-24), with its points to pay. Host-stepped games wait for the host.
 */
export function tick(m: Machine, s: Session, now: number): Outcome {
  if (s.step !== "play") return done(s);
  const state = m.game.tick(s.state, m.content, now);
  const ticked = state === s.state ? s : bump(s, { state });
  if (!m.game.skipResults && m.game.over(state, m.content, now - LATE_MS))
    return closeRound(m, ticked, now);
  return done(ticked);
}
