import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AdminRoot } from "@/components/theme";
import type { Moment } from "@/lib/motion";
import { MomentsProvider, MomentsStage, ToastChainView, useCelebrate } from "./moments";

vi.mock("./confetti", () => ({ fireConfetti: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

let celebrate: (m: Moment) => void = () => undefined;
function Grab({ onReady }: { onReady: (c: (m: Moment) => void) => void }) {
  const c = useCelebrate();
  useEffect(() => {
    onReady(c);
  }, [c, onReady]);
  return null;
}
const grab = (c: (m: Moment) => void) => {
  celebrate = c;
};
const setup = () =>
  render(
    <AdminRoot>
      <MomentsProvider surface="display">
        <Grab onReady={grab} />
        <ToastChainView />
        <MomentsStage />
      </MomentsProvider>
    </AdminRoot>,
  );

describe("S14-AC6: the toast chain on the TV", () => {
  test("shows four toasts, newest on top, and brings in the fifth when one leaves", () => {
    setup();
    act(() => {
      for (const n of [1, 2, 3, 4, 5])
        celebrate({ id: `g${n}`, kind: "game-finished", text: `Player ${n} finished`, value: n });
    });
    const toasts = () => screen.getAllByText(/Player \d finished/).map((el) => el.textContent);
    expect(toasts()).toEqual([
      "Player 4 finished",
      "Player 3 finished",
      "Player 2 finished",
      "Player 1 finished",
    ]);
    act(() => {
      vi.advanceTimersByTime(5200);
    });
    expect(toasts()).toEqual(["Player 5 finished"]);
  });

  test("pauses while a stage moment plays", () => {
    setup();
    act(() => {
      celebrate({ id: "g1", kind: "game-finished", text: "Mai finished" });
      celebrate({ id: "l1", kind: "lead-change", text: "Team Dragon takes the lead" });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Team Dragon takes the lead")).toBeInTheDocument();
    expect(screen.getByText("Mai finished")).toBeInTheDocument();
  });
});

describe("S14-AC7: stage moments play one at a time, in order", () => {
  test("the second waits for the first to finish", () => {
    setup();
    act(() => {
      celebrate({ id: "a", kind: "lead-change", text: "Team Dragon takes the lead" });
      celebrate({ id: "b", kind: "judged-right", text: "Team Crane is right" });
    });
    expect(screen.getByText("Team Dragon takes the lead")).toBeInTheDocument();
    expect(screen.queryByText("Team Crane is right")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(screen.queryByText("Team Dragon takes the lead")).toBeNull();
    expect(screen.getByText("Team Crane is right")).toBeInTheDocument();
  });
});
