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

/** Network slack after a deadline before an answer counts as late (S10-AC5). */
export const GRACE_MS = 2000;
const SHORT_ANSWER = 16;

export type TriviaState = {
  picks: { id: string; order: number[] }[];
  index: number;
  phase: "question" | "answered" | "done";
  deadline: number;
  /** One per question asked: the original choice index, or null when time ran out. */
  answers: { choice: number | null; right: boolean }[];
  step: number;
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
};
export type TriviaView =
  | ({ kind: "question" } & Asked)
  | ({ kind: "answered"; chosen: number | null; correct: number; right: boolean } & Asked)
  | { kind: "done"; right: number; total: number };

const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("answer"), choice: z.number().int().nonnegative() }),
  z.object({ type: z.literal("next") }),
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

/** Trivia (spec 10): a few questions drawn from a pool, one at a time, against the clock. */
export const trivia: GameLogic<TriviaContent, TriviaState, TriviaView> = {
  content: TriviaContent,

  instructions: (c) => ({
    title: "How to play",
    lines: [
      `${String(perPlay(c))} quick questions. You have ${String(seconds(c))} seconds for each.`,
      "Tap an answer to lock it in. You can't change it.",
      "Points for every right answer.",
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
    };
  },

  tick(s, _c, { now }: GameContext) {
    if (s.phase !== "question" || now <= s.deadline + GRACE_MS) return s;
    return {
      ...s,
      phase: "answered",
      answers: [...s.answers, { choice: null, right: false }],
      step: s.step + 1,
    };
  },

  view(s, c, { now }) {
    if (s.phase === "done")
      return {
        kind: "done",
        right: s.answers.filter((a) => a.right).length,
        total: s.picks.length,
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
    };
    if (s.phase === "question") return { kind: "question", ...asked };
    const answer = s.answers[s.index];
    const chosen = answer?.choice ?? null;
    return {
      kind: "answered",
      ...asked,
      chosen: chosen === null ? null : order.indexOf(chosen),
      correct: order.indexOf(question.answer),
      right: answer?.right ?? false,
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
          answers: [...s.answers, { choice, right: choice === question.answer }],
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
            deadline: now + seconds(c) * 1000,
            step: s.step + 1,
          },
    };
  },

  isOver: (s) => s.phase === "done",
  score: (s, points) =>
    s.picks.length === 0
      ? 0
      : Math.round((points * s.answers.filter((a) => a.right).length) / s.picks.length),
  step: (s) => s.step,
};
