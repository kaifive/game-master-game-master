import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { TriviaView } from "@/lib/games";
import { answerKey } from "@/lib/games";
import { REVEAL_MS, TriviaGame, triviaSummary } from "./trivia";

type Asked = Extract<TriviaView, { kind: "question" }>;
const question = (extra: { [K in keyof Asked]?: Asked[K] | undefined } = {}): Asked => ({
  kind: "question",
  key: "",
  number: 2,
  total: 5,
  prompt: "How many legs does a spider have?",
  choices: [{ text: "6" }, { text: "8" }, { text: "10" }, { text: "12" }],
  layout: "grid",
  seconds: 15,
  msLeft: 15_000,
  ...(Object.fromEntries(
    Object.entries(extra).filter(([, v]) => v !== undefined),
  ) as Partial<Asked>),
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

  test("S10-AC4: after answering, marks the right answer and yours", () => {
    show({ ...question(), kind: "answered", chosen: 0, correct: 1, right: false });
    expect(screen.getByRole("status")).toHaveTextContent("Not quite.");
    expect(screen.getByRole("button", { name: "8 (Right answer)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "6 (Your answer)" })).toBeInTheDocument();
  });

  test("S10-AC5: says time's up when no answer came", () => {
    show({ ...question({ number: 5 }), kind: "answered", chosen: null, correct: 1, right: false });
    expect(screen.getByRole("status")).toHaveTextContent("Time's up.");
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
    expect(triviaSummary({ kind: "done", right: 4, total: 5, avgSeconds: 3.2 })).toBe(
      "4 of 5 right · 3.2 s average",
    );
    expect(triviaSummary({ kind: "done", right: 0, total: 5, avgSeconds: null })).toBe(
      "0 of 5 right",
    );
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

describe("TriviaGame pacing", () => {
  test("S10-AC10 S10-AC14: once the answer's confirmed, the next question is asked for at once, to show when the pause ends", () => {
    vi.useFakeTimers({ now: 10_000 });
    const onMove = vi.fn();
    show({ ...question(), kind: "answered", chosen: 1, correct: 1, right: true }, { onMove });
    expect(onMove).toHaveBeenCalledExactlyOnceWith(
      { type: "next", startIn: REVEAL_MS },
      { notBefore: 10_000 + REVEAL_MS },
    );
  });

  test("S10-AC14: the pause counts from the tap, so a slow reply shortens the wait, not the next question", async () => {
    vi.useFakeTimers({ now: 10_000, shouldAdvanceTime: true });
    const onMove = vi.fn();
    const { rerender } = show({ ...question(), key: answerKey(1, 2) }, { onMove });
    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole("button", { name: "8" }));
    const tappedAt = Date.now();
    act(() => {
      vi.advanceTimersByTime(600); // the server's reply takes 0.6 s
    });
    rerender(
      <TriviaGame
        view={{ ...question(), kind: "answered", chosen: 1, correct: 1, right: true }}
        busy={false}
        onMove={onMove}
        onTimeUp={vi.fn()}
      />,
    );
    const [move, options] = onMove.mock.calls[1] as [{ startIn: number }, { notBefore: number }];
    // Counted from the tap, not from the reply 0.6 s later.
    expect(options.notBefore).toBeGreaterThanOrEqual(10_000 + REVEAL_MS);
    expect(options.notBefore).toBeLessThanOrEqual(tappedAt + REVEAL_MS);
    expect(move.startIn).toBeLessThanOrEqual(REVEAL_MS - 600);
  });

  test("S10-AC10: no Next button, and a tap doesn't skip ahead", async () => {
    const onMove = vi.fn();
    show({ ...question(), kind: "answered", chosen: 1, correct: 1, right: true }, { onMove });
    expect(screen.queryByRole("button", { name: /Next|See score/ })).toBeNull();
    await userEvent
      .setup()
      .click(screen.getByRole("heading", { name: "How many legs does a spider have?" }));
    // Only the automatic request for the next question; the tap adds nothing.
    expect(onMove).toHaveBeenCalledTimes(1);
  });
});

describe("TriviaGame cue", () => {
  test("S10-AC11: after an answer, says the next question (or the score) is coming", () => {
    const { unmount } = show({
      ...question(),
      kind: "answered",
      chosen: 1,
      correct: 1,
      right: true,
    });
    expect(screen.getByText("Question 3 of 5 is next…")).toBeInTheDocument();
    unmount();
    show({ ...question({ number: 5 }), kind: "answered", chosen: 1, correct: 1, right: true });
    expect(screen.getByText("Your score is next…")).toBeInTheDocument();
  });
});

describe("TriviaGame tap feedback", () => {
  test("S10-AC13: with the answer key, a tap shows right or wrong at once, before the server replies", async () => {
    const onMove = vi.fn();
    // "8" is choice 1; the key says so.
    show({ ...question(), key: answerKey(1, 2) }, { onMove });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "6" }));
    expect(onMove).toHaveBeenCalledExactlyOnceWith({ type: "answer", choice: 0 });
    expect(screen.getByRole("status")).toHaveTextContent("Not quite.");
    expect(screen.getByRole("button", { name: "8 (Right answer)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "6 (Your answer)" })).toBeInTheDocument();
  });

  test("S10-AC13: without a usable key, the tapped answer still lights up while the server checks", async () => {
    const onMove = vi.fn();
    show(question(), { onMove });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "8" }));
    expect(onMove).toHaveBeenCalledExactlyOnceWith({ type: "answer", choice: 1 });
    expect(screen.getByRole("button", { name: "8" })).toHaveClass("ring-gm-accent");
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "6" }));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  test("S10-AC13: the whole button is the target, not just its text", () => {
    show(question());
    const button = screen.getByRole("button", { name: "8" });
    expect(button).toHaveClass("touch-manipulation", "[&_*]:pointer-events-none");
  });
});

describe("TriviaGame clock", () => {
  const bar = () => screen.getByRole("progressbar", { name: "Time left" });
  const share = () => Number(bar().firstElementChild?.getAttribute("data-share"));

  test("S10-AC15: never shows more than the question's seconds", () => {
    show(question({ msLeft: 15_700, seconds: 15 }));
    expect(bar()).toHaveAttribute("aria-valuenow", "15");
    expect(share()).toBe(1);
  });

  test("S10-AC15: counts down in small steps and freezes where it is when you tap", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onMove = vi.fn();
    show({ ...question({ msLeft: 10_000, seconds: 10 }), key: answerKey(1, 2) }, { onMove });
    act(() => {
      vi.advanceTimersByTime(2_050);
    });
    expect(share()).toBeCloseTo(0.8, 1);
    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole("button", { name: "8" }));
    const frozen = share();
    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(share()).toBe(frozen);
    expect(frozen).toBeLessThan(0.85);
  });

  test("S10-AC15: each new question starts its clock clean", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { rerender } = show(question({ msLeft: 10_000, seconds: 10 }));
    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(share()).toBeLessThan(0.5);
    rerender(
      <TriviaGame
        view={question({ number: 3, msLeft: 10_000, seconds: 10 })}
        busy={false}
        onMove={vi.fn()}
        onTimeUp={vi.fn()}
      />,
    );
    expect(share()).toBe(1);
  });
});
