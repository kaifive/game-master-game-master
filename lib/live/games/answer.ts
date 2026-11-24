import { z } from "zod";
import { LATE_MS, type MoveResult } from "../model";

/**
 * The answer window shared by the counting showdowns (spec 25): the TV shows
 * something from `startsAt` to `showEndsAt`, then every team locks in one
 * number before `closesAt`. Answers stay secret until the reveal (S24-AC7).
 */
export type AnswerWindow = {
  startsAt: number;
  showEndsAt: number;
  closesAt: number;
  /** The teams playing, so the round knows when everyone has answered. */
  teams: string[];
  answers: Record<string, number>;
};

/** How long teams have to lock in once the show ends (spec 25: 10 s). */
export const ANSWER_MS = 10_000;

export const answerWindow = (
  startsAt: number,
  showMs: number,
  teams: readonly string[],
): AnswerWindow => ({
  startsAt,
  showEndsAt: startsAt + showMs,
  closesAt: startsAt + showMs + ANSWER_MS,
  teams: [...teams],
  answers: {},
});

export const NumberMove = z.object({ answer: z.number().int() });

/** One locked-in number per team, after the show and inside the window. */
export function lockIn<S extends AnswerWindow>(
  s: S,
  teamId: string,
  move: unknown,
  now: number,
  range: { min: number; max: number },
): MoveResult<S> {
  const parsed = NumberMove.safeParse(move);
  if (!parsed.success) return { ok: false, message: "Type a whole number." };
  const { answer } = parsed.data;
  if (now < s.showEndsAt) return { ok: false, message: "Watch the TV first!" };
  // Sent as the time ran out, it may land a moment after (LATE_MS).
  if (now > s.closesAt + LATE_MS) return { ok: false, message: "Time's up." };
  if (s.answers[teamId] !== undefined) return { ok: false, message: "You've locked in." };
  if (answer < range.min || answer > range.max)
    return {
      ok: false,
      message: `Pick a number from ${String(range.min)} to ${String(range.max)}.`,
    };
  return { ok: true, state: { ...s, answers: { ...s.answers, [teamId]: answer } } };
}

/** Nothing left to wait for: the window has closed, or every team has locked in. */
export const answered = (s: AnswerWindow, now: number) =>
  now > s.closesAt || (s.teams.length > 0 && s.teams.every((t) => s.answers[t] !== undefined));

/** What a phone sees of the window: its own answer only, until the reveal. */
export function windowView(
  s: AnswerWindow,
  role: { kind: string; teamId?: string },
  revealed: boolean,
) {
  const mine = role.teamId !== undefined ? s.answers[role.teamId] : undefined;
  return {
    startsAt: s.startsAt,
    showEndsAt: s.showEndsAt,
    closesAt: s.closesAt,
    mine: mine ?? null,
    /** Which teams have locked in, so the TV can tick them off without giving answers away. */
    lockedIn: Object.keys(s.answers),
    answers: revealed ? s.answers : null,
  };
}

export type WindowView = ReturnType<typeof windowView>;
