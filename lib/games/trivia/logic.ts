import { z } from "zod";
import type { GameContext, GameLogic, MoveResult } from "../model";
import { seededRandom, shuffled } from "../random";
import {
  DEFAULT_QUESTIONS_PER_PLAY,
  DEFAULT_SECONDS,
  TriviaContent,
  type Choice,
  type Media,
  type Question,
} from "./content";

/** The longest a phone may hold the next question back while the last answer shows. */
export const MAX_START_IN = 2000;

/** Network slack after a deadline before an answer counts as late (S10-AC5). */
export const GRACE_MS = 2000;
const SHORT_ANSWER = 16;

export type TriviaState = {
  picks: { id: string; order: number[] }[];
  index: number;
  phase: "question" | "answered" | "done";
  deadline: number;
  /** One per question asked: the original choice index, or null when time ran out. */
  /** msLeft is the time left when it was answered: faster earns more (S10-AC6). */
  answers: { choice: number | null; right: boolean; msLeft: number }[];
  step: number;
  /** Copied from the content at the start, so scoring needs only the state. */
  secondsPerQuestion: number;
};

export type ChoiceView = { text?: string | undefined; image?: Media | undefined };
type Asked = {
  number: number;
  total: number;
  prompt: string;
  image?: Media;
  choices: ChoiceView[];
  layout: "grid" | "list";
  seconds: number;
  msLeft: number;
  /** False when the event is replayable: a wrong answer doesn't show the right one. */
  reveal?: boolean;
};
/**
 * The question's answer, lightly scrambled, so the phone can say right or
 * wrong the moment it's tapped (ADR-029). Not a secret: the server still
 * checks every answer and keeps the score.
 */
export const answerKey = (displayIndex: number, number: number) =>
  (displayIndex * 7 + number * 13 + 11).toString(36);

/** The answer a key stands for, or null if the key isn't one. */
export function readAnswerKey(key: string, number: number, choices: number): number | null {
  const n = parseInt(key, 36) - number * 13 - 11;
  return Number.isInteger(n / 7) && n / 7 >= 0 && n / 7 < choices ? n / 7 : null;
}

export type TriviaView =
  | ({ kind: "question"; key: string } & Asked)
  | ({
      kind: "answered";
      chosen: number | null;
      /** The right choice, or null when it's kept back (a replayable event, S10-AC16). */
      correct: number | null;
      right: boolean;
    } & Asked)
  | {
      kind: "done";
      right: number;
      total: number;
      /** Average seconds taken on right answers, or null with none right. */
      avgSeconds: number | null;
    };

const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("answer"), choice: z.number().int().nonnegative() }),
  /** `startIn`: the phone shows the next question this many ms from now, so its clock starts then (S10-AC14). */
  z.object({
    type: z.literal("next"),
    startIn: z.number().int().min(0).max(MAX_START_IN).optional(),
  }),
]);

const seconds = (c: TriviaContent) => c.secondsPerQuestion ?? DEFAULT_SECONDS;
const perPlay = (c: TriviaContent) => c.questionsPerPlay ?? DEFAULT_QUESTIONS_PER_PLAY;
const toView = (c: Choice): ChoiceView => (typeof c === "string" ? { text: c } : c);

function current(s: TriviaState, c: TriviaContent): { question: Question; order: number[] } {
  const pick = s.picks[s.index];
  const question = c.questions.find((q) => q.id === pick?.id);
  if (!pick || !question)
    throw new Error(`Trivia question ${pick?.id ?? "?"} is no longer in the pool.`);
  return { question, order: pick.order };
}

function layoutOf(choices: ChoiceView[]): "grid" | "list" {
  const short = choices.every(
    (c) => c.image !== undefined || (c.text?.length ?? 0) <= SHORT_ANSWER,
  );
  return choices.length <= 4 && short ? "grid" : "list";
}

const fail = (message: string): MoveResult<TriviaState> => ({ ok: false, message });

/**
 * Each question is worth an equal share. A right answer earns half its share
 * for being right and up to half again for speed: instant earns it all, at
 * the buzzer earns half (S10-AC6).
 */
function scoreOf(s: TriviaState, points: number, questions: number): number {
  if (questions === 0) return 0;
  const total = s.secondsPerQuestion * 1000;
  const earned = s.answers.reduce(
    (sum, a) => sum + (a.right ? 0.5 + 0.5 * Math.min(1, a.msLeft / total) : 0),
    0,
  );
  return Math.round((points * earned) / questions);
}

function averageSeconds(s: TriviaState, c: TriviaContent): number | null {
  const right = s.answers.filter((a) => a.right);
  if (right.length === 0) return null;
  const taken = right.reduce((sum, a) => sum + (seconds(c) * 1000 - a.msLeft), 0) / right.length;
  return Math.round(taken / 100) / 10;
}

/** Trivia (spec 10): a few questions drawn from a pool, one at a time, against the clock. */
export const trivia: GameLogic<TriviaContent, TriviaState, TriviaView> = {
  content: TriviaContent,

  instructions: (c) => ({
    title: "How to play",
    lines: [
      `${String(perPlay(c))} quick questions. You have ${String(seconds(c))} seconds for each.`,
      "Tap an answer to lock it in. You can't change it.",
      "The next question starts by itself, a second after each answer.",
      "Right answers score points. Faster answers score more.",
    ],
  }),

  create(c, seed, { now }) {
    const random = seededRandom(seed);
    const picks = shuffled(c.questions, random)
      .slice(0, perPlay(c))
      .map((q) => ({
        id: q.id,
        order: shuffled(
          q.choices.map((_, i) => i),
          random,
        ),
      }));
    return {
      picks,
      index: 0,
      phase: "question",
      deadline: now + seconds(c) * 1000,
      answers: [],
      step: 0,
      secondsPerQuestion: seconds(c),
    };
  },

  tick(s, _c, { now }: GameContext) {
    if (s.phase !== "question" || now <= s.deadline + GRACE_MS) return s;
    return {
      ...s,
      phase: "answered",
      answers: [...s.answers, { choice: null, right: false, msLeft: 0 }],
      step: s.step + 1,
    };
  },

  view(s, c, { now, replayable }) {
    if (s.phase === "done")
      return {
        kind: "done",
        right: s.answers.filter((a) => a.right).length,
        total: s.picks.length,
        avgSeconds: averageSeconds(s, c),
      };
    const { question, order } = current(s, c);
    const choices = order.map((i) => toView(question.choices[i] as Choice));
    const asked: Asked = {
      number: s.index + 1,
      total: s.picks.length,
      prompt: question.prompt,
      ...(question.image ? { image: question.image } : {}),
      choices,
      layout: layoutOf(choices),
      seconds: seconds(c),
      msLeft: Math.max(0, s.deadline - now),
      reveal: replayable !== true,
    };
    if (s.phase === "question")
      return {
        kind: "question",
        ...asked,
        key: answerKey(order.indexOf(question.answer), asked.number),
      };
    const answer = s.answers[s.index];
    const chosen = answer?.choice ?? null;
    const right = answer?.right ?? false;
    const correct = order.indexOf(question.answer);
    return {
      kind: "answered",
      ...asked,
      chosen: chosen === null ? null : order.indexOf(chosen),
      // A replayable game shows a right answer as right, but never gives away the answer.
      correct: asked.reveal === true || right ? correct : null,
      right,
    };
  },

  move(s, c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    const move = parsed.data;
    if (move.type === "answer") {
      if (s.phase !== "question") return fail("This question is already answered.");
      const { question, order } = current(s, c);
      const choice = order[move.choice];
      if (choice === undefined) return fail("Pick one of the answers.");
      return {
        ok: true,
        state: {
          ...s,
          phase: "answered",
          answers: [
            ...s.answers,
            { choice, right: choice === question.answer, msLeft: Math.max(0, s.deadline - now) },
          ],
          step: s.step + 1,
        },
      };
    }
    if (s.phase !== "answered") return fail("Answer the question first.");
    const last = s.index + 1 >= s.picks.length;
    return {
      ok: true,
      state: last
        ? { ...s, phase: "done", step: s.step + 1 }
        : {
            ...s,
            index: s.index + 1,
            phase: "question",
            deadline: now + (move.startIn ?? 0) + seconds(c) * 1000,
            step: s.step + 1,
          },
    };
  },

  isOver: (s) => s.phase === "done",
  score: (s, points) => scoreOf(s, points, s.picks.length),
  step: (s) => s.step,
};
