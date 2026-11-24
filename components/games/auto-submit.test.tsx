import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { NumberEntry } from "./number-entry";
import { PerceptionStage } from "./perception/stage";

const entry = (closesIn: number, onLock: (n: number) => void) => (
  <NumberEntry prompt="How many?" busy={false} onLock={onLock} closesIn={closesIn} />
);

describe("sending what's on the controller as the timer runs out (Khai, 2026-11-24)", () => {
  test("S25-AC1: a typed number is sent once, just before time's up; nothing typed, nothing sent", async () => {
    const user = userEvent.setup();
    const onLock = vi.fn();
    const { rerender } = render(entry(5000, onLock));
    await user.click(screen.getByRole("button", { name: "7" }));
    rerender(entry(2000, onLock));
    expect(onLock).not.toHaveBeenCalled();
    rerender(entry(400, onLock));
    expect(onLock).toHaveBeenCalledWith(7);
    rerender(entry(100, onLock));
    expect(onLock).toHaveBeenCalledTimes(1);
    const empty = vi.fn();
    render(entry(300, empty));
    expect(empty).not.toHaveBeenCalled();
  });

  test("S28-AC3: a staff that's been turned is sent as time runs out; one never touched isn't", async () => {
    const user = userEvent.setup();
    const stage = (elapsed: number, onAnswer: (a: unknown) => void) => (
      <PerceptionStage
        type="staffangle"
        scene={{ target: 35 }}
        elapsed={elapsed}
        clock={() => elapsed}
        showMs={0}
        answerMs={15_000}
        busy={false}
        onAnswer={onAnswer}
        timer={null}
        showOn="tv"
      />
    );
    const onAnswer = vi.fn();
    const { rerender, unmount } = render(stage(1000, onAnswer));
    await user.click(screen.getByRole("button", { name: "Turn left 5 degrees" }));
    rerender(stage(14_700, onAnswer));
    expect(onAnswer).toHaveBeenCalledWith(5);
    unmount();
    const untouched = vi.fn();
    const again = render(stage(1000, untouched));
    again.rerender(stage(14_700, untouched));
    expect(untouched).not.toHaveBeenCalled();
  });
});
