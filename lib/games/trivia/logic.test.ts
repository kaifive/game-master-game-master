import { describe, expect, it } from "vitest";
import type { TriviaContent } from "./content";
import { GRACE_MS, trivia, type TriviaState, type TriviaView } from "./logic";

const pool = (n: number): TriviaContent => ({
  questions: Array.from({ length: n }, (_, i) => ({
    id: `q${String(i)}`,
    prompt: `Question ${String(i)}?`,
    choices: ["Right", "Wrong 1", "Wrong 2", "Wrong 3"],
    answer: 0,
  })),
  questionsPerPlay: 3,
  secondsPerQuestion: 15,
});
const content = pool(10);
const at = (now: number) => ({ now });
const start = (seed = 1, c: TriviaContent = content) => trivia.create(c, seed, at(0));

type Q = Extract<TriviaView, { kind: "question" | "answered" }>;
const view = (s: TriviaState, now = 0, c = content) => trivia.view(s, c, at(now)) as Q;
const rightIndex = (s: TriviaState, now = 0) =>
  view(s, now).choices.findIndex((c) => c.text === "Right");

function play(s: TriviaState, move: unknown, now = 0, c = content): TriviaState {
  const r = trivia.move(trivia.tick(s, c, at(now)), c, move, at(now));
  if (!r.ok) throw new Error(r.message);
  return r.state;
}
const answerRight = (s: TriviaState, now = 0) =>
  play(s, { type: "answer", choice: rightIndex(s, now) }, now);
const answerWrong = (s: TriviaState, now = 0) =>
  play(s, { type: "answer", choice: (rightIndex(s, now) + 1) % 4 }, now);
const next = (s: TriviaState, now = 0) => play(s, { type: "next" }, now);

describe("trivia", () => {
  it("S10-AC3: draws questionsPerPlay different questions, shuffled from the seed", () => {
    const a = start(1);
    expect(a.picks).toHaveLength(3);
    expect(new Set(a.picks.map((p) => p.id)).size).toBe(3);
    expect(start(1)).toEqual(a);
    const others = [2, 3, 4, 5].map((seed) =>
      start(seed)
        .picks.map((p) => p.id)
        .join(),
    );
    expect(new Set([...others, a.picks.map((p) => p.id).join()]).size).toBeGreaterThan(1);
    const orders = [1, 2, 3, 4, 5].map((seed) => start(seed).picks[0]?.order.join());
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it("S10-AC2: the view has the prompt and choices but no answer", () => {
    const v = view(start());
    expect(v).toMatchObject({ kind: "question", number: 1, total: 3, msLeft: 15_000, seconds: 15 });
    expect(v.choices).toHaveLength(4);
    expect(JSON.stringify(v)).not.toMatch(/"(answer|correct|right)"/);
  });

  it("S10-AC4: an answer is checked and the view shows the correct choice", () => {
    const s = answerWrong(start(), 3000);
    const v = view(s, 3000);
    expect(v.kind).toBe("answered");
    expect(v).toMatchObject({ right: false });
    expect(v.choices[(v as Extract<TriviaView, { kind: "answered" }>).correct]?.text).toBe("Right");
    const good = view(answerRight(start(), 3000), 3000);
    expect(good).toMatchObject({ kind: "answered", right: true });
  });

  it("S10-AC5: late answers and no answer count as wrong; the clock runs while away", () => {
    const s = start();
    expect(view(s, 10_000).msLeft).toBe(5000);
    // Within the grace period an answer still counts.
    expect(view(answerRight(s, 15_000 + GRACE_MS), 15_000 + GRACE_MS)).toMatchObject({
      right: true,
    });
    // After it, time is up before the answer lands.
    const late = trivia.tick(s, content, at(15_000 + GRACE_MS + 1));
    expect(view(late)).toMatchObject({ kind: "answered", chosen: null, right: false });
    expect(trivia.move(late, content, { type: "answer", choice: 0 }, at(17_001)).ok).toBe(false);
    expect(trivia.tick(late, content, at(99_999))).toBe(late);
  });

  it("S10-AC6: points are the share of right answers; the result shows correct of total", () => {
    let s = start();
    s = next(answerRight(s, 1000), 1000);
    s = next(answerRight(s, 2000), 2000);
    s = next(answerWrong(s, 3000), 3000);
    expect(trivia.isOver(s)).toBe(true);
    expect(trivia.view(s, content, at(3000))).toEqual({ kind: "done", right: 2, total: 3 });
    expect(trivia.score(s, 100)).toBe(67);
    expect(trivia.score(s, 0)).toBe(0);
  });

  it("each question gets a fresh deadline when shown", () => {
    const s = next(answerRight(start(), 14_000), 20_000);
    expect(view(s, 20_000)).toMatchObject({ kind: "question", number: 2, msLeft: 15_000 });
  });

  it("refuses moves out of turn or out of range, and counts every change as a step", () => {
    const s = start();
    expect(trivia.step(s)).toBe(0);
    expect(trivia.move(s, content, { type: "next" }, at(0)).ok).toBe(false);
    expect(trivia.move(s, content, { type: "answer", choice: 9 }, at(0)).ok).toBe(false);
    expect(trivia.move(s, content, { type: "dance" }, at(0)).ok).toBe(false);
    const answered = answerRight(s);
    expect(trivia.step(answered)).toBe(1);
    expect(trivia.move(answered, content, { type: "answer", choice: 0 }, at(0)).ok).toBe(false);
  });

  it("S10-AC8: short or picture answers show as a grid; long ones as a list", () => {
    const withChoices = (
      choices: TriviaContent["questions"][number]["choices"],
    ): TriviaContent => ({
      questions: [{ id: "q1", prompt: "?", choices, answer: 0 }],
      questionsPerPlay: 1,
    });
    const layout = (c: TriviaContent) => view(trivia.create(c, 1, at(0)), 0, c).layout;
    expect(layout(withChoices(["Red", "Green", "Blue", "Gold"]))).toBe("grid");
    expect(layout(withChoices(["Sixteen chars ok", "B"]))).toBe("grid");
    expect(layout(withChoices(["Seventeen chars no", "B"]))).toBe("list");
    expect(layout(withChoices(["A", "B", "C", "D", "E"]))).toBe("list");
    const img = (alt: string) => ({ image: { src: `/${alt}.svg`, alt } });
    expect(layout(withChoices([img("bell"), img("star"), img("tree")]))).toBe("grid");
  });

  it("S10-AC9: images pass through to the view with their alt text", () => {
    const c: TriviaContent = {
      questions: [
        {
          id: "q1",
          prompt: "Which is a bell?",
          image: { src: "/q.svg", alt: "Question art" },
          choices: [
            { image: { src: "/bell.svg", alt: "A bell" } },
            { text: "Star", image: { src: "/star.svg", alt: "A star" } },
          ],
          answer: 0,
        },
      ],
      questionsPerPlay: 1,
    };
    const v = view(trivia.create(c, 1, at(0)), 0, c);
    expect(v.image).toEqual({ src: "/q.svg", alt: "Question art" });
    expect(v.choices).toEqual(
      expect.arrayContaining([
        { image: { src: "/bell.svg", alt: "A bell" } },
        { text: "Star", image: { src: "/star.svg", alt: "A star" } },
      ]),
    );
  });

  it("builds its instructions from the content's numbers", () => {
    expect(trivia.instructions(content).lines.join(" ")).toMatch(/3 quick questions.*15 seconds/);
    expect(trivia.instructions({ questions: pool(6).questions }).lines.join(" ")).toMatch(
      /5 quick.*15 seconds/,
    );
  });
});
