import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { TriviaView } from "@/lib/games";
import { TriviaGame, triviaSummary } from "./trivia";

type Asked = Extract<TriviaView, { kind: "question" }>;
const question = (extra: Partial<Asked> = {}): Asked => ({
  kind: "question",
  number: 2,
  total: 5,
  prompt: "How many legs does a spider have?",
  choices: [{ text: "6" }, { text: "8" }, { text: "10" }, { text: "12" }],
  layout: "grid",
  seconds: 15,
  msLeft: 15_000,
  ...extra,
});

const show = (view: TriviaView, handlers: { onMove?: () => void; onTimeUp?: () => void } = {}) =>
  render(
    <TriviaGame
      view={view}
      busy={false}
      onMove={handlers.onMove ?? vi.fn()}
      onTimeUp={handlers.onTimeUp ?? vi.fn()}
    />,
  );

afterEach(() => {
  vi.useRealTimers();
});

describe("TriviaGame", () => {
  test("S10-AC2: shows the question, its number and the answers, and sends the tapped one", async () => {
    const onMove = vi.fn();
    show(question(), { onMove });
    expect(screen.getByText("Question 2 of 5")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How many legs does a spider have?" }),
    ).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "8" }));
    expect(onMove).toHaveBeenCalledWith({ type: "answer", choice: 1 });
  });

  test("S10-AC8: short answers in a 2×2 grid, long ones in a list", () => {
    const { unmount } = show(question());
    expect(screen.getByRole("list", { name: "Answers" })).toHaveClass("grid-cols-2");
    unmount();
    show(question({ layout: "list" }));
    expect(screen.getByRole("list", { name: "Answers" })).not.toHaveClass("grid-cols-2");
  });

  test("S10-AC9: shows question and answer images with their alt text", () => {
    show(
      question({
        image: { src: "/events/holiday-2026/tree.svg", alt: "A pine tree" },
        choices: [
          { image: { src: "/bell.svg", alt: "A gold bell" } },
          { text: "Star", image: { src: "/star.svg", alt: "A star" } },
        ],
      }),
    );
    expect(screen.getByRole("img", { name: "A pine tree" })).toHaveAttribute(
      "src",
      "/events/holiday-2026/tree.svg",
    );
    const answers = within(screen.getByRole("list", { name: "Answers" }));
    expect(answers.getByRole("img", { name: "A gold bell" })).toBeInTheDocument();
    expect(answers.getByText("Star")).toBeInTheDocument();
  });

  test("S10-AC4: after answering, marks the right answer and yours, then Next", async () => {
    const onMove = vi.fn();
    show({ ...question(), kind: "answered", chosen: 0, correct: 1, right: false }, { onMove });
    expect(screen.getByRole("status")).toHaveTextContent("Not quite.");
    expect(screen.getByRole("button", { name: "8 (Right answer)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "6 (Your answer)" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Next" }));
    expect(onMove).toHaveBeenCalledWith({ type: "next" });
  });

  test("S10-AC5: says time's up when no answer came, and See score on the last question", () => {
    show({ ...question({ number: 5 }), kind: "answered", chosen: null, correct: 1, right: false });
    expect(screen.getByRole("status")).toHaveTextContent("Time's up.");
    expect(screen.getByRole("button", { name: "See score" })).toBeInTheDocument();
  });

  test("S10-AC5: when the local timer runs out, asks the server for the timed-out view", () => {
    vi.useFakeTimers();
    const onTimeUp = vi.fn();
    show(question({ msLeft: 1000 }), { onTimeUp });
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(onTimeUp).toHaveBeenCalledOnce();
  });

  test("S10-AC6: sums up the result", () => {
    expect(triviaSummary({ kind: "done", right: 4, total: 5 })).toBe("4 of 5 right");
    expect(triviaSummary(question())).toBeNull();
  });
});

describe("TriviaGame timer", () => {
  test("S10-AC5: shows the seconds left on a timer bar", () => {
    show(question({ msLeft: 9000 }));
    const bar = screen.getByRole("progressbar", { name: "Time left" });
    expect(bar).toHaveAttribute("aria-valuenow", "9");
    expect(screen.getByText("9s")).toBeInTheDocument();
  });
});
