import { z } from "zod";
import { EntityId } from "@/lib/ids";

/** An image in a question or answer: from public/ ("/...") or https, always with alt text. */
export const Media = z.object({
  src: z
    .string()
    .regex(/^(\/[^/]|https:\/\/)/, 'Use a path from public/ ("/...") or an https URL.'),
  alt: z.string().min(1, "Images need alt text."),
});
export type Media = z.infer<typeof Media>;

export const Choice = z.union([
  z.string().min(1),
  z
    .object({ text: z.string().min(1).optional(), image: Media.optional() })
    .refine(
      (c) => c.text !== undefined || c.image !== undefined,
      "A choice needs text or an image.",
    ),
]);
export type Choice = z.infer<typeof Choice>;

export const Question = z
  .object({
    id: EntityId,
    prompt: z.string().min(1),
    image: Media.optional(),
    choices: z.array(Choice).min(2).max(6),
    answer: z.number().int().nonnegative(),
  })
  .refine((q) => q.answer < q.choices.length, {
    message: "answer must point at one of the choices (0 is the first).",
    path: ["answer"],
  });
export type Question = z.infer<typeof Question>;

export const DEFAULT_QUESTIONS_PER_PLAY = 5;
export const DEFAULT_SECONDS = 15;

/** A trivia game's content in the event file (spec 10). */
export const TriviaContent = z
  .object({
    questions: z.array(Question).min(1).max(200),
    questionsPerPlay: z.number().int().min(1).max(20).optional(),
    secondsPerQuestion: z.number().int().min(5).max(60).optional(),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    c.questions.forEach((q, i) => {
      if (seen.has(q.id))
        ctx.addIssue({
          code: "custom",
          path: ["questions", i, "id"],
          message: `"${q.id}" is used twice.`,
        });
      seen.add(q.id);
    });
    const perPlay = c.questionsPerPlay ?? DEFAULT_QUESTIONS_PER_PLAY;
    if (c.questions.length > 0 && perPlay > c.questions.length)
      ctx.addIssue({
        code: "custom",
        path: ["questionsPerPlay"],
        message: `${perPlay} per play needs at least ${perPlay} questions in the pool.`,
      });
  });
export type TriviaContent = z.infer<typeof TriviaContent>;
