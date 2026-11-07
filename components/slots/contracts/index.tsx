import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { fireConfetti } from "@/components/motion/confetti";
import { MOMENT_KINDS } from "@/lib/motion";
import type { SlotComponents, SlotName } from "@/lib/themes";
import { setReducedMotion } from "@/tests/motion";

/**
 * Contract suites (ADR-022): every version of a slot, default or from a
 * pack, must pass the same tests. A pack may change how a slot looks and
 * moves, never what it means or does.
 */

/** Animation and transition classes must only apply when motion is allowed. */
export function expectMotionSafe(container: HTMLElement) {
  const offenders = [...container.querySelectorAll("[class]")].flatMap((el) =>
    (el.getAttribute("class") ?? "")
      .split(/\s+/)
      .filter((c) => /(^|:)(animate-|transition)/.test(c) && !c.startsWith("motion-safe:")),
  );
  expect(offenders).toEqual([]);
}

type Suite<N extends SlotName> = (C: SlotComponents[N]) => void;

const suites: { [N in SlotName]: Suite<N> } = {
  Surface: (Surface) => {
    test("renders its children inside a surface", () => {
      const { container } = render(<Surface>hello</Surface>);
      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(container.querySelector('[data-slot="surface"]')).not.toBeNull();
      expectMotionSafe(container);
    });
  },
  Banner: (Banner) => {
    test("shows the title as a heading and the subtitle", () => {
      render(<Banner title="Wushu Holiday Party" subtitle="Dec 19" />);
      expect(
        screen.getByRole("heading", { level: 1, name: "Wushu Holiday Party" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Dec 19")).toBeInTheDocument();
      expect(screen.queryByText(/live/i)).toBeNull();
    });
    test("shows its lead before the title, such as a back link", () => {
      render(<Banner title="Holiday Trivia" lead={<button type="button">Back to games</button>} />);
      const back = screen.getByRole("button", { name: "Back to games" });
      const title = screen.getByRole("heading", { name: "Holiday Trivia" });
      expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    test("shows its aside, such as the player's total", () => {
      render(<Banner title="Party" aside={<span>★ 180</span>} />);
      expect(screen.getByText("★ 180")).toBeInTheDocument();
    });
    test("shows Live only when live, at the requested heading level", () => {
      const { container } = render(<Banner title="Results" live level={2} />);
      expect(screen.getByRole("heading", { level: 2, name: "Results" })).toBeInTheDocument();
      expect(screen.getByText(/live/i)).toBeInTheDocument();
      expectMotionSafe(container);
    });
  },
  Button: (Button) => {
    test("is a button that calls onClick, by click and by keyboard", async () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Play</Button>);
      const btn = screen.getByRole("button", { name: "Play" });
      await userEvent.click(btn);
      btn.focus();
      await userEvent.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledTimes(2);
    });
    test("does nothing when disabled", async () => {
      const onClick = vi.fn();
      const { container } = render(
        <Button onClick={onClick} disabled tone="secondary">
          Play
        </Button>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Play" }));
      expect(onClick).not.toHaveBeenCalled();
      expectMotionSafe(container);
    });
  },
  Panel: (Panel) => {
    test("is a labelled region holding its children", () => {
      render(<Panel label="Join">scan me</Panel>);
      expect(
        within(screen.getByRole("region", { name: "Join" })).getByText("scan me"),
      ).toBeInTheDocument();
    });
  },
  ScoreCard: (ScoreCard) => {
    test("names the game and its score for screen readers", () => {
      render(<ScoreCard label="Gift Guess" value={150} state="scored" />);
      expect(screen.getByRole("img", { name: "Gift Guess: 150 points" })).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
    });
    test("a blank card says it isn't scored and shows no number", () => {
      const { container } = render(<ScoreCard label="Word Sprint" state="blank" size="sm" />);
      expect(screen.getByRole("img", { name: "Word Sprint: not scored yet" })).toBeInTheDocument();
      expect(container.textContent).not.toMatch(/\d/);
      expectMotionSafe(container);
    });
    test("a highlighted card still reads its score", () => {
      render(<ScoreCard label="Daily Word" value={100} state="highlight" size="lg" />);
      expect(screen.getByRole("img", { name: "Daily Word: 100 points" })).toBeInTheDocument();
    });
  },
  Tile: (Tile) => {
    test.each([
      ["correct", "S, correct"],
      ["present", "S, in the word but elsewhere"],
      ["absent", "S, not in the word"],
      ["typed", "S"],
    ] as const)("a %s tile is announced as %j", (state, name) => {
      render(<Tile letter="S" state={state} />);
      expect(screen.getByRole("img", { name })).toBeInTheDocument();
    });
    test("correct and present tiles carry a mark, so color isn't the only cue", () => {
      const { container } = render(
        <>
          <Tile letter="A" state="correct" />
          <Tile letter="T" state="present" />
          <Tile letter="C" state="absent" />
        </>,
      );
      expect(container.querySelector('[data-state="correct"] [data-mark]')).not.toBeNull();
      expect(container.querySelector('[data-state="present"] [data-mark]')).not.toBeNull();
      expect(container.querySelector('[data-state="absent"] [data-mark]')).toBeNull();
      expectMotionSafe(container);
    });
    test("an empty tile is announced as empty", () => {
      render(<Tile state="empty" />);
      expect(screen.getByRole("img", { name: "empty" })).toBeInTheDocument();
    });
  },
  Key: (Key) => {
    test("pressing a key sends its label, by click and by keyboard", async () => {
      const onPress = vi.fn();
      render(<Key label="A" state="correct" onPress={onPress} />);
      const key = screen.getByRole("button", { name: "A, correct" });
      await userEvent.click(key);
      key.focus();
      await userEvent.keyboard(" ");
      expect(onPress).toHaveBeenNthCalledWith(1, "A");
      expect(onPress).toHaveBeenCalledTimes(2);
    });
    test("an unused key is named by its label alone", () => {
      const { container } = render(<Key label="Enter" wide onPress={() => undefined} />);
      expect(screen.getByRole("button", { name: "Enter" })).toBeInTheDocument();
      expectMotionSafe(container);
    });
  },
  Progress: (Progress) => {
    test("is a progress bar with its values and a readable summary", () => {
      const { container } = render(<Progress done={5} total={9} label="Games scored" />);
      const bar = screen.getByRole("progressbar", { name: "Games scored" });
      expect(bar).toHaveAttribute("aria-valuenow", "5");
      expect(bar).toHaveAttribute("aria-valuemax", "9");
      expect(screen.getByText("5 of 9")).toBeInTheDocument();
      expectMotionSafe(container);
    });
    test("handles zero games", () => {
      render(<Progress done={0} total={0} label="Games scored" />);
      expect(screen.getByText("0 of 0")).toBeInTheDocument();
    });
  },
  Toast: (Toast) => {
    test("shows its text and value", () => {
      const { container } = render(<Toast text="Mai finished Gift Guess" value={150} />);
      expect(screen.getByText("Mai finished Gift Guess")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
      expectMotionSafe(container);
    });
    test("works without a value", () => {
      render(<Toast text="Bao joined Team Crane" />);
      expect(screen.getByText("Bao joined Team Crane")).toBeInTheDocument();
    });
  },
  LeaderboardRow: (LeaderboardRow) => {
    test("reads as rank, name and score", () => {
      const { container } = render(
        <ul>
          <LeaderboardRow rank={1} name="Team Dragon" score={1840} team={1} highlight />
        </ul>,
      );
      expect(
        screen.getByRole("listitem", { name: "1. Team Dragon, 1,840 points" }),
      ).toBeInTheDocument();
      expect(screen.getByText("1,840")).toBeInTheDocument();
      expectMotionSafe(container);
    });
  },
  Buzzer: (Buzzer) => {
    test("a ready buzzer buzzes on press", async () => {
      const onBuzz = vi.fn();
      render(<Buzzer state="ready" onBuzz={onBuzz} />);
      await userEvent.click(screen.getByRole("button", { name: "Buzz" }));
      expect(onBuzz).toHaveBeenCalledOnce();
    });
    test.each([
      ["locked", "Buzzer locked"],
      ["buzzed", "Buzzed in"],
    ] as const)("a %s buzzer can't be pressed", async (state, name) => {
      const onBuzz = vi.fn();
      const { container } = render(<Buzzer state={state} onBuzz={onBuzz} />);
      const btn = screen.getByRole("button", { name });
      expect(btn).toBeDisabled();
      await userEvent.click(btn);
      expect(onBuzz).not.toHaveBeenCalled();
      expectMotionSafe(container);
    });
  },
  CodeEntry: (CodeEntry) => {
    test("submits the code uppercased and trimmed", async () => {
      const onSubmit = vi.fn();
      render(<CodeEntry onSubmit={onSubmit} />);
      await userEvent.type(screen.getByLabelText("Code"), " drgn5 ");
      await userEvent.click(screen.getByRole("button", { name: "Go" }));
      expect(onSubmit).toHaveBeenCalledWith("DRGN5");
    });
    test("submits on Enter and shows an error as an alert", async () => {
      const onSubmit = vi.fn();
      const { container } = render(
        <CodeEntry onSubmit={onSubmit} error="That code isn't valid." defaultValue="abcde" />,
      );
      await userEvent.type(screen.getByLabelText("Code"), "{Enter}");
      expect(onSubmit).toHaveBeenCalledWith("ABCDE");
      expect(screen.getByRole("alert")).toHaveTextContent("That code isn't valid.");
      expectMotionSafe(container);
    });
  },
  Celebration: (Celebration) => {
    const moment = {
      id: "m1",
      kind: "judged-right" as const,
      text: "Team Crane is right",
      value: 400,
    };
    test("announces the moment, then calls onDone exactly once", () => {
      vi.useFakeTimers();
      const onDone = vi.fn();
      const { container } = render(
        <Celebration moment={moment} surface="display" onDone={onDone} />,
      );
      expect(screen.getByRole("status")).toHaveTextContent("Team Crane is right");
      expect(
        container.querySelector("[data-animation]")?.getAttribute("data-animation"),
      ).toBeTruthy();
      expectMotionSafe(container);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(onDone).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });
    test("S14-AC10: with reduced motion, plays no confetti, flips or shakes, and finishes quickly", () => {
      vi.useFakeTimers();
      setReducedMotion(true);
      vi.mocked(fireConfetti).mockClear();
      for (const kind of MOMENT_KINDS) {
        const onDone = vi.fn();
        const { unmount } = render(
          <Celebration moment={{ ...moment, kind }} surface="player" onDone={onDone} />,
        );
        act(() => {
          vi.advanceTimersByTime(500);
        });
        expect(onDone).toHaveBeenCalledOnce();
        unmount();
      }
      expect(fireConfetti).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  },
};

/** Runs the contract suite for one slot against one component. */
export function runSlotContract<N extends SlotName>(name: N, Component: SlotComponents[N]) {
  suites[name](Component);
}
