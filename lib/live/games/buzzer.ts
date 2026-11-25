import { z } from "zod";
import { defineShowdown, type MoveResult, type Role, type ShowdownGame } from "../model";

/**
 * The buzzer round (spec 12): one question per round. The host shows it,
 * opens the buzzers, and judges each team's spoken answer in buzz order:
 * Right gives the question's points, Wrong passes to the next team in line
 * and costs nothing. The pieces (buzzing, the order, judging) are kept apart
 * from the question list, so Jeopardy can run a picked clue the same way.
 */

const Question = z.object({
  id: z.string().min(1).max(64),
  prompt: z.string().min(1).max(400),
  answer: z.string().min(1).max(200),
  points: z.number().int().min(0).max(1000).optional(),
  /** A picture shown with the question, such as `/events/holiday-2026/q3.jpg`. */
  picture: z.string().min(1).max(300).optional(),
});

const Content = z.object({
  questions: z.array(Question).min(1).max(50),
  /** Points a question is worth when it doesn't say. */
  points: z.number().int().min(0).max(1000).default(100),
  /** How long a press on a red buzzer locks that team out, as on Jeopardy (S12-AC7). */
  earlyLockoutMs: z.number().int().min(0).max(2000).default(250),
});
type C = z.infer<typeof Content>;

/** How far a phone's press time may be ahead of the server's clock (network and clock error). */
export const PRESS_SLACK_MS = 1000;
/** How far behind it may be: a press is sent at once, so an older claim is refused. */
export const PRESS_MAX_AGE_MS = 3000;
/** How many steps Undo can go back. */
const UNDO_DEPTH = 20;

export type Phase = "shown" | "open" | "done";
export type Result = "right" | "wrong";
export type Buzz = { teamId: string; at: number; after: number };

/** One question's state: the buzzing and judging, apart from the question itself. */
export type Judging = {
  phase: Phase;
  /** When the buzzers last opened (server ms), or null while still shown. */
  openedAt: number | null;
  /** Each team's latest press on a red buzzer, for its lockout. */
  early: Record<string, number>;
  /** In buzz order. */
  buzzes: Buzz[];
  results: Record<string, Result>;
  winner: string | null;
  revealed: boolean;
};

export type BuzzerState = Judging & {
  index: number;
  of: number;
  prompt: string;
  answer: string;
  points: number;
  picture: string | null;
  teams: string[];
  lockoutMs: number;
  /** Earlier states of the judging, newest last, for Undo (S12-AC5). */
  history: Judging[];
};

const fail = <S>(message: string): MoveResult<S> => ({ ok: false, message });

const judging = (s: BuzzerState): Judging => ({
  phase: s.phase,
  openedAt: s.openedAt,
  early: s.early,
  buzzes: s.buzzes,
  results: s.results,
  winner: s.winner,
  revealed: s.revealed,
});

/** The team to call on: the first in buzz order not yet judged. */
export const upNext = (s: Judging): string | null =>
  s.winner === null
    ? (s.buzzes.find((b) => s.results[b.teamId] === undefined)?.teamId ?? null)
    : null;

/** Teams that haven't buzzed on this question, who a reopen lets in. */
const notBuzzed = (s: BuzzerState) => s.teams.filter((t) => !s.buzzes.some((b) => b.teamId === t));

/** Whether Reopen buzzers makes sense: everyone who buzzed was wrong, and someone is left. */
export const canReopen = (s: BuzzerState) =>
  s.phase === "open" &&
  s.buzzes.length > 0 &&
  upNext(s) === null &&
  s.winner === null &&
  notBuzzed(s).length > 0;

/** A host step, with the judging as it was kept for Undo. */
const step = (s: BuzzerState, patch: Partial<Judging>): BuzzerState => ({
  ...s,
  ...patch,
  history: [...s.history, judging(s)].slice(-UNDO_DEPTH),
});

const Press = z.object({ at: z.number() });
const HostStep = z.enum(["open", "right", "wrong", "reopen", "reveal", "undo"]);
/**
 * A step, or Right / Wrong naming the team judged: a second device judging the
 * same buzz a moment later does nothing (QA, 2026-11-25).
 */
const HostAction = z.union([HostStep, z.object({ act: HostStep, team: z.string().max(64) })]);

/** A captain's press, on the shared clock (S12-AC2, S12-AC7). */
export function press(
  s: BuzzerState,
  teamId: string,
  raw: unknown,
  now: number,
): MoveResult<BuzzerState> {
  const parsed = Press.safeParse(raw);
  if (!parsed.success) return fail("That buzz didn't come through.");
  const at = Math.round(parsed.data.at);
  if (at > now + PRESS_SLACK_MS || at < now - PRESS_MAX_AGE_MS)
    return fail("That buzz didn't come through. Try again.");
  if (s.phase === "done") return fail("This question's over.");
  // Pressed while red: a lockout, not a buzz (S12-AC7).
  if (s.phase === "shown" || s.openedAt === null || at < s.openedAt)
    return {
      ok: true,
      state: { ...s, early: { ...s.early, [teamId]: Math.max(at, s.early[teamId] ?? 0) } },
    };
  if (s.buzzes.some((b) => b.teamId === teamId)) return fail("You've buzzed.");
  const early = s.early[teamId];
  if (early !== undefined && at - early < s.lockoutMs) return fail("Too early!");
  // Ordered by the press, so a slow connection doesn't lose a race it won; ties keep arrival order.
  const buzzes = [...s.buzzes, { teamId, at, after: at - s.openedAt }].sort((a, b) => a.at - b.at);
  return { ok: true, state: { ...s, buzzes } };
}

/** The host's steps (S12-AC1, S12-AC3, S12-AC5). */
export function hostStep(s: BuzzerState, raw: unknown, now: number): MoveResult<BuzzerState> {
  const parsed = HostAction.safeParse(raw);
  if (!parsed.success) return fail("That isn't a step here.");
  const current = upNext(s);
  const act = typeof parsed.data === "string" ? parsed.data : parsed.data.act;
  if (typeof parsed.data !== "string" && current !== parsed.data.team)
    return fail("That team's already been judged.");
  switch (act) {
    case "open":
      if (s.phase !== "shown") return fail("The buzzers are already open.");
      return { ok: true, state: step(s, { phase: "open", openedAt: now }) };
    case "right":
      if (!current) return fail("Nobody's up to answer.");
      return {
        ok: true,
        state: step(s, {
          phase: "done",
          winner: current,
          revealed: true,
          results: { ...s.results, [current]: "right" },
        }),
      };
    case "wrong":
      if (!current) return fail("Nobody's up to answer.");
      return { ok: true, state: step(s, { results: { ...s.results, [current]: "wrong" } }) };
    case "reopen":
      if (!canReopen(s)) return fail("There's nobody left to open the buzzers for.");
      return { ok: true, state: step(s, { openedAt: now }) };
    case "reveal":
      if (s.revealed) return fail("The answer's already out.");
      return { ok: true, state: step(s, { phase: "done", revealed: true }) };
    case "undo": {
      const last = s.history.at(-1);
      if (!last) return fail("There's nothing to undo.");
      return { ok: true, state: { ...s, ...last, history: s.history.slice(0, -1) } };
    }
  }
}

/** What everyone but the host sees: never the answer before it's revealed (S12-AC4). */
function view(s: BuzzerState, role: Role | null, now: number) {
  const mine = role && role.kind !== "tv" ? role.teamId : null;
  const place = mine === null ? -1 : s.buzzes.findIndex((b) => b.teamId === mine);
  return {
    index: s.index,
    of: s.of,
    prompt: s.prompt,
    picture: s.picture,
    points: s.points,
    phase: s.phase,
    openedAt: s.openedAt,
    serverNow: now,
    lockoutMs: s.lockoutMs,
    buzzes: s.buzzes.map((b) => ({
      teamId: b.teamId,
      after: b.after,
      result: s.results[b.teamId] ?? null,
    })),
    upNext: upNext(s),
    winner: s.winner,
    answer: s.revealed ? s.answer : null,
    mine:
      mine === null
        ? null
        : {
            place: place === -1 ? null : place + 1,
            result: s.results[mine] ?? null,
            /** Its latest red press, so the phone shows the same lockout the server keeps. */
            early: s.early[mine] ?? null,
          },
  };
}

export type BuzzerView = ReturnType<typeof view>;

const game: ShowdownGame<C, BuzzerState> = {
  content: Content,
  demo: "Wait for green, then buzz and answer out loud!",
  timeout: "Too early? You're locked out for a moment.",
  rounds: (c) => c.questions.length,
  skipResults: true,
  labels: { start: (n) => `Show question ${String(n)}`, next: "Next question" },
  deal(c, { round, teams }) {
    const q = c.questions[round - 1] ?? c.questions[c.questions.length - 1];
    if (!q) throw new Error("no questions");
    return {
      index: round,
      of: c.questions.length,
      prompt: q.prompt,
      answer: q.answer,
      points: q.points ?? c.points,
      picture: q.picture ?? null,
      teams: [...teams],
      lockoutMs: c.earlyLockoutMs,
      phase: "shown",
      openedAt: null,
      early: {},
      buzzes: [],
      results: {},
      winner: null,
      revealed: false,
      history: [],
    };
  },
  move: (s, _c, { teamId, move, now }) => press(s, teamId, move, now),
  host: (s, _c, { action, now }) => hostStep(s, action, now),
  tick: (s) => s,
  over: (s) => s.phase === "done",
  score: (s, _c, teams) => Object.fromEntries(teams.map((t) => [t, t === s.winner ? s.points : 0])),
  view: (s, _c, { role, now }) => view(s, role, now),
  hostView: (s, _c, { now }) => ({
    ...view(s, null, now),
    answer: s.answer,
    canReopen: canReopen(s),
    canUndo: s.history.length > 0,
  }),
};

export const buzzer = defineShowdown(game);
export type BuzzerHostView = BuzzerView & { answer: string; canReopen: boolean; canUndo: boolean };
