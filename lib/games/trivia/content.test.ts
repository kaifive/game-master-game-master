import { describe, expect, it } from "vitest";
import { TriviaContent } from "./content";

const q = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  prompt: "Which?",
  choices: ["A", "B"],
  answer: 0,
  ...extra,
});
const errors = (value: unknown) => {
  const r = TriviaContent.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("TriviaContent", () => {
  it("S10-AC1: accepts a pool with text and picture answers", () => {
    expect(
      errors({
        questions: [
          q("q1", { image: { src: "/events/holiday-2026/bell.svg", alt: "A bell" } }),
          q("q2", {
            choices: [{ image: { src: "https://example.com/a.png", alt: "A" } }, { text: "B" }],
          }),
        ],
        questionsPerPlay: 2,
        secondsPerQuestion: 15,
      }),
    ).toEqual([]);
  });

  it("S10-AC1: rejects bad pools, choices and answers", () => {
    expect(errors({ questions: [] })).toEqual(["questions"]);
    expect(errors({ questions: [q("q1"), q("q1")], questionsPerPlay: 1 })).toEqual([
      "questions.1.id",
    ]);
    expect(errors({ questions: [q("q1", { choices: ["A"] })], questionsPerPlay: 1 })).toEqual([
      "questions.0.choices",
    ]);
    expect(errors({ questions: [q("q1", { answer: 2 })], questionsPerPlay: 1 })).toEqual([
      "questions.0.answer",
    ]);
    expect(errors({ questions: [q("q1", { choices: [{}, "B"] })], questionsPerPlay: 1 })).toEqual([
      "questions.0.choices.0",
    ]);
    expect(errors({ questions: [q("q1")], questionsPerPlay: 2 })).toEqual(["questionsPerPlay"]);
    // The default is 5 per play.
    expect(errors({ questions: [q("q1")] })).toEqual(["questionsPerPlay"]);
    expect(errors({ questions: [q("q1")], questionsPerPlay: 1, secondsPerQuestion: 3 })).toEqual([
      "secondsPerQuestion",
    ]);
  });

  it("S10-AC9: images need alt text and a public/ or https source", () => {
    expect(
      errors({ questions: [q("q1", { image: { src: "/a.png", alt: "" } })], questionsPerPlay: 1 }),
    ).toEqual(["questions.0.image.alt"]);
    expect(
      errors({
        questions: [q("q1", { image: { src: "http://x.com/a.png", alt: "A" } })],
        questionsPerPlay: 1,
      }),
    ).toEqual(["questions.0.image.src"]);
  });
});
