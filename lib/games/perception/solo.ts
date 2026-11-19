import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { LEVELS, type Level, type Phase, type PerceptionCore } from "./core";

/**
 * A perception game as a solo game (spec 28, S28-AC2): three tasks, levels 1
 * to 3, each shown then answered on the phone. Points: the game's points times
 * the average closeness. No answer in time counts 0.
 */

/** How long the phone shows how close an answer was before the next task. */
export const FEEDBACK_MS = 1800;
/** How much later than the server's clock a phone-timed answer may claim (network both ways). */
export const CLAIM_SLACK_MS = 1000;

export type SoloState<T, A> = {
  tasks: T[];
  /** Which task is on, 0 to 2; 3 once done. */
  at: number;
  /** When the current task started (may be ahead, while the last one's result shows). */
  startedAt: number;
  answers: (A | null)[];
  closeness: number[];
  step: number;
};

export type SoloView = {
  task: number;
  of: number;
  level: Level | null;
  /** Ms since the task started (negative while the last result shows), so the phone can anchor its clock. */
  elapsed: number;
  showMs: number;
  answerMs: number;
  phase: Phase | "between" | "done";
  scene: unknown;
  /** The last answer's result, while it shows. */
  last: { closeness: number; said: string | null; truth: string } | null;
  closeness: number[];
  done: boolean;
};

export function perceptionSolo<T, A>(
  core: PerceptionCore<T, A>,
): GameLogic<Record<string, never>, SoloState<T, A>, SoloView> {
  const Move = z.object({ answer: core.answer });

  /** Records the current task's answer (or none) and starts the next after a pause. */
  const finish = (s: SoloState<T, A>, answer: A | null, at: number): SoloState<T, A> => {
    const task = s.tasks[s.at];
    if (!task) return s;
    return {
      ...s,
      answers: [...s.answers, answer],
      closeness: [...s.closeness, answer === null ? 0 : core.closeness(task, answer)],
      at: s.at + 1,
      startedAt: at + FEEDBACK_MS,
      step: s.step + 1,
    };
  };

  const deadline = (s: SoloState<T, A>) => {
    const task = s.tasks[s.at];
    return task ? s.startedAt + core.showMs(task) + core.answerMs(task) : Infinity;
  };

  return {
    content: z.object({}).strict(),
    instructions: () => ({ title: "How to play", lines: core.instructions }),
    create: (_c, seed, { now }) => ({
      tasks: LEVELS.map((level) => core.deal((seed + Math.imul(level, 0x9e3779b1)) >>> 0, level)),
      at: 0,
      startedAt: now,
      answers: [],
      closeness: [],
      step: 0,
    }),
    tick(s, _c, { now }) {
      let out = s;
      while (out.at < out.tasks.length && now > deadline(out))
        out = finish(out, null, deadline(out));
      return out;
    },
    view(s, _c, { now }) {
      const task = s.tasks[s.at];
      const prevTask = s.tasks[s.at - 1];
      const prev = s.answers[s.at - 1];
      const showingLast =
        s.at > 0 && (now < s.startedAt || s.at >= s.tasks.length) && prevTask !== undefined;
      const last = showingLast
        ? {
            closeness: s.closeness[s.at - 1] ?? 0,
            said: prev === null || prev === undefined ? null : core.said(prevTask, prev),
            truth: core.truth(prevTask),
          }
        : null;
      if (!task)
        return {
          task: s.tasks.length,
          of: s.tasks.length,
          level: null,
          elapsed: 0,
          showMs: 0,
          answerMs: 0,
          phase: "done",
          scene: null,
          last,
          closeness: s.closeness,
          done: true,
        };
      const elapsed = now - s.startedAt;
      const phase: SoloView["phase"] =
        elapsed < 0 ? "between" : elapsed < core.showMs(task) ? "show" : "answer";
      return {
        task: s.at + 1,
        of: s.tasks.length,
        level: (s.at + 1) as Level,
        elapsed,
        showMs: core.showMs(task),
        answerMs: core.answerMs(task),
        phase,
        // Only what this moment may show (S28-AC4).
        scene: phase === "between" ? null : core.scene(task, phase === "show" ? "show" : "answer"),
        last,
        closeness: s.closeness,
        done: false,
      };
    },
    move(s, _c, raw, { now }): MoveResult<SoloState<T, A>> {
      const parsed = Move.safeParse(raw);
      const task = s.tasks[s.at];
      if (!parsed.success || !task)
        return { ok: false, message: "That answer isn't part of this game." };
      const answer = parsed.data.answer;
      const elapsed = now - s.startedAt;
      if (elapsed < core.showMs(task) && !core.claims)
        return { ok: false, message: "Watch first!" };
      if (elapsed < 0) return { ok: false, message: "Not yet!" };
      if (!core.valid(task, answer)) return { ok: false, message: "That answer doesn't fit." };
      // Phone-timed answers can't claim a moment that hasn't happened yet (S28-AC5).
      if (core.claims && core.claims(answer) > elapsed + CLAIM_SLACK_MS)
        return { ok: false, message: "Those taps aren't possible." };
      return { ok: true, state: finish(s, answer, now) };
    },
    isOver: (s) => s.at >= s.tasks.length,
    score: (s, points) =>
      Math.round((points * s.closeness.reduce((a, b) => a + b, 0)) / Math.max(1, s.tasks.length)),
    step: (s) => s.step,
  };
}
