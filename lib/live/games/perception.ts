import { z } from "zod";
import { LEVELS, type Level, type Phase, type PerceptionCore } from "@/lib/games";
import { defineShowdown, type AnyShowdown, type Role, type ShowdownGame } from "../model";
import { closePoints } from "./scoring";

/**
 * A perception game as a showdown (spec 28, S28-AC3): three rounds, levels 1
 * to 3; every team gets the same task on the TV and answers on the captain's
 * phone; ranked by closeness, 100, 70, 50, 30, then 10.
 */

/** How much later than the server's clock a phone-timed answer may claim. */
export const CLAIM_SLACK_MS = 1000;

export type PerceptionState<T, A> = {
  task: T;
  level: Level;
  teams: string[];
  startsAt: number;
  showEndsAt: number;
  closesAt: number;
  answers: Record<string, A>;
};

export function perceptionShowdown<T, A>(core: PerceptionCore<T, A>): AnyShowdown {
  type S = PerceptionState<T, A>;
  type ViewCtx = { role: Role; revealed: boolean; now: number };

  function view(s: S, _c: unknown, { role, revealed, now }: ViewCtx): PerceptionView {
    const phase: Phase = revealed ? "reveal" : now < s.showEndsAt ? "show" : "answer";
    const mine = role.kind !== "tv" ? role.teamId : null;
    return {
      level: s.level,
      startsAt: s.startsAt,
      showEndsAt: s.showEndsAt,
      closesAt: s.closesAt,
      phase,
      // Before the start, nothing; after, only what this phase may show (S28-AC4).
      scene: now < s.startsAt && !revealed ? null : core.scene(s.task, phase),
      answered: mine !== null && s.answers[mine] !== undefined,
      /** This team's own answer so far, so a reloaded phone shows it. */
      mine: mine !== null ? (s.answers[mine] ?? null) : null,
      lockedIn: Object.keys(s.answers),
      truth: revealed ? core.truth(s.task) : null,
      answers: revealed ? { ...s.answers } : null,
      said: revealed
        ? Object.fromEntries(Object.entries(s.answers).map(([t, a]) => [t, core.said(s.task, a)]))
        : null,
      closeness: revealed
        ? Object.fromEntries(
            Object.entries(s.answers).map(([t, a]) => [t, core.closeness(s.task, a)]),
          )
        : null,
    };
  }

  const game: ShowdownGame<Record<string, never>, S> = {
    // Nothing to set per event yet: the levels are the game's own (spec 28).
    content: z.object({}).strict(),
    demo: core.demo,
    timeout: core.timeout,
    rounds: () => LEVELS.length,
    deal(_c, { seed, round, teams, startsAt }) {
      const level = LEVELS[round - 1] ?? 3;
      const task = core.deal(seed, level);
      const showEndsAt = startsAt + core.showMs(task);
      return {
        task,
        level,
        teams: [...teams],
        startsAt,
        showEndsAt,
        closesAt: showEndsAt + core.answerMs(task),
        answers: {},
      };
    },
    move(s, _c, { teamId, move, now }) {
      const parsed = core.answer.safeParse((move as { answer?: unknown } | null)?.answer);
      if (!parsed.success) return { ok: false, message: "That answer doesn't fit." };
      const answer = parsed.data;
      if (now < s.startsAt) return { ok: false, message: "Not yet!" };
      if (now < s.showEndsAt && !core.claims) return { ok: false, message: "Watch first!" };
      if (now > s.closesAt + CLAIM_SLACK_MS) return { ok: false, message: "Time's up." };
      // The last answer sent before time's up counts (QA, 2026-11-25).
      if (!core.valid(s.task, answer)) return { ok: false, message: "That answer doesn't fit." };
      // Phone-timed answers can't claim a moment that hasn't happened yet (S28-AC5).
      if (core.claims && core.claims(answer) > now - s.startsAt + CLAIM_SLACK_MS)
        return { ok: false, message: "Those taps aren't possible." };
      return { ok: true, state: { ...s, answers: { ...s.answers, [teamId]: answer } } };
    },
    tick: (s) => s,
    over: (s, _c, now) => now > s.closesAt || s.teams.every((t) => s.answers[t] !== undefined),
    // How close each team got, whatever the others did (ADR-045).
    score: (s, _c, teams) =>
      Object.fromEntries(
        teams.map((t) => {
          const a = s.answers[t];
          return [
            t,
            closePoints(a === undefined ? null : core.closeness(s.task, a), LEVELS.length),
          ];
        }),
      ),
    view,
  };
  return defineShowdown(game);
}

/** What a showdown's TV and phones see of a perception round. */
export type PerceptionView = {
  level: Level;
  startsAt: number;
  showEndsAt: number;
  closesAt: number;
  phase: Phase;
  scene: unknown;
  answered: boolean;
  mine: unknown;
  lockedIn: string[];
  truth: string | null;
  /** Every team's answer, at the reveal only, to draw on the scene. */
  answers: Record<string, unknown> | null;
  said: Record<string, string> | null;
  closeness: Record<string, number> | null;
};
