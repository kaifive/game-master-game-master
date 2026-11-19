import type { z } from "zod";

/**
 * The perception games (spec 28): each deals a task from a seed at a level
 * from 1 (easy) to 3 (hard) and scores an answer by closeness, 0 to 1. One
 * core per game; the solo version (./solo.ts) and the showdown version
 * (lib/live) are both made from it (ADR-040).
 */
export type Level = 1 | 2 | 3;
export const LEVELS: readonly Level[] = [1, 2, 3];

/** Which part of a task is on: shown, being answered, or revealed. */
export type Phase = "show" | "answer" | "reveal";

export type PerceptionCore<T, A> = {
  type: string;
  name: string;
  /** One line under the TV demo and on the captain's phone (spec 24). */
  demo: string;
  timeout: string;
  /** The solo instructions box. */
  instructions: string[];
  deal: (seed: number, level: Level) => T;
  /** How long the task shows before answers are taken (0: answer straight away). */
  showMs: (task: T) => number;
  /** How long there is to answer once the show is over. */
  answerMs: (task: T) => number;
  answer: z.ZodType<A>;
  /** Whether an answer fits the task (a tap on the ribbon, a whole number...). */
  valid: (task: T, answer: A) => boolean;
  /** 0 (way off) to 1 (exact). */
  closeness: (task: T, answer: A) => number;
  /** What may be drawn in a phase: nothing that gives the answer away outside its show (S28-AC4). */
  scene: (task: T, phase: Phase) => unknown;
  /** The true answer, said for the reveal ("38 snowflakes"). */
  truth: (task: T) => string;
  /** An answer, said for the reveal ("40"). */
  said: (task: T, answer: A) => string;
  /**
   * Phone-timed answers (Lion Drum): the latest moment, in ms from the task's
   * start, the answer claims; the server refuses it if that hasn't happened yet.
   */
  claims?: (answer: A) => number;
};

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Rounds closeness for showing ("92% close"). */
export const percent = (closeness: number) => `${String(Math.round(closeness * 100))}% close`;
