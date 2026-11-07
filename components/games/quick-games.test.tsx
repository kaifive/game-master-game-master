import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { recallSummary, RecallGame, FEEDBACK_MS } from "./recall/recall";
import { StackerGame, stackerSummary } from "./stacker/stacker";
import { TapsGame, tapsSummary } from "./taps/taps";
import { TimerGame, timerSummary } from "./timer/timer";
import { extendTrail, TrailGame, trailSummary } from "./trail/trail";

const props = (view: unknown, onMove = vi.fn()) => ({
  view,
  onMove,
  onTimeUp: vi.fn(),
  busy: false,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("quick game screens (spec 16)", () => {
  test("S16-AC2: T-Timer shows the clock, then hides it, and sends the phone's time on Stop", async () => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ["performance", "requestAnimationFrame", "setTimeout"],
    });
    const onMove = vi.fn();
    const { rerender } = render(
      <TimerGame {...props({ kind: "ready", targetSeconds: 10, visibleSeconds: 3 }, onMove)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onMove).toHaveBeenLastCalledWith({ type: "start" });
    rerender(
      <TimerGame
        {...props({ kind: "running", targetSeconds: 10, visibleSeconds: 3, elapsedMs: 0 }, onMove)}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId("timer-clock").textContent).toMatch(/^[01]\.\d\d$/);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByTestId("timer-clock")).toHaveTextContent("?.??");
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    const sent = onMove.mock.calls.at(-1)?.[0] as { type: string; elapsedMs: number };
    expect(sent.type).toBe("stop");
    expect(sent.elapsedMs).toBeGreaterThanOrEqual(3900);
    expect(timerSummary({ kind: "done", targetSeconds: 10, elapsedMs: 10_120, offMs: 120 })).toBe(
      "10.12 s · 0.12 s off",
    );
    expect(timerSummary({ kind: "done", targetSeconds: 10, elapsedMs: null, offMs: null })).toBe(
      "The clock ran out",
    );
  });

  test("S16-AC3: Tap Masher counts down, counts taps, then sends them when time is up", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["performance", "requestAnimationFrame"] });
    const onMove = vi.fn();
    const { rerender } = render(
      <TapsGame {...props({ kind: "ready", seconds: 5, target: 45 }, onMove)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    rerender(<TapsGame {...props({ kind: "running", seconds: 5, goInMs: 1000 }, onMove)} />);
    expect(screen.getByText(/Get ready/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    const pad = screen.getByRole("button", { name: /Tap!/ });
    for (let i = 0; i < 7; i++) fireEvent.pointerDown(pad);
    expect(pad).toHaveTextContent("7");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });
    expect(onMove).toHaveBeenLastCalledWith({ type: "finish", taps: 7 });
    expect(tapsSummary({ kind: "done", taps: 33, target: 45 })).toBe("33 taps");
  });

  test("S16-AC5: Stack Attack stops the bar on a tap and sends the rows when it misses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["performance", "requestAnimationFrame"] });
    const onMove = vi.fn();
    const { rerender } = render(
      <StackerGame {...props({ kind: "ready", rows: 12, width: 7 }, onMove)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    rerender(<StackerGame {...props({ kind: "running", rows: 12, width: 7 }, onMove)} />);
    const board = screen.getByRole("button", { name: "Stop the bar" });
    fireEvent.pointerDown(board); // row 1 always lands
    expect(screen.getByText("1 of 12 rows")).toBeInTheDocument();
    // Keep stopping until a bar misses or the tower is full; it always ends.
    for (let i = 0; i < 40 && onMove.mock.calls.length < 2; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(130 + i * 37);
      });
      fireEvent.pointerDown(board);
    }
    const finish = onMove.mock.calls.at(-1)?.[0] as { type: string; rows: number };
    expect(finish.type).toBe("finish");
    expect(finish.rows).toBeGreaterThanOrEqual(1);
    expect(stackerSummary({ kind: "done", stacked: 6, rows: 12 })).toBe("6 of 12 rows");
  });

  test("S16-AC6: Rapid Recall shows the squares, hides them, and sends the picks", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onMove = vi.fn();
    render(
      <RecallGame
        {...props(
          {
            kind: "round",
            number: 1,
            total: 3,
            size: 3,
            lit: [0, 4, 8],
            showMs: 1500,
            found: 0,
            seen: 0,
          },
          onMove,
        )}
      />,
    );
    expect(screen.getByText("Remember the lit squares…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Square 1" })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    for (const n of [1, 5, 2])
      fireEvent.click(screen.getByRole("button", { name: `Square ${String(n)}` }));
    expect(screen.getByText("2 of 3 right")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FEEDBACK_MS + 50);
    });
    expect(onMove).toHaveBeenCalledWith({ type: "pick", round: 1, cells: [0, 4, 1] });
    expect(recallSummary({ kind: "done", found: 11, total: 15, rounds: [] })).toBe(
      "11 of 15 squares",
    );
  });

  test("S16-AC4: Snow Trail builds the trail square by square, undoes by stepping back, and sends a solved one", () => {
    const view = { kind: "playing" as const, size: 2, dots: [0, 2], msLeft: 1000 };
    expect(extendTrail([], 1, view)).toEqual([]); // must start on 1
    expect(extendTrail([], 0, view)).toEqual([0]);
    expect(extendTrail([0], 3, view)).toEqual([0]); // not a neighbour
    expect(extendTrail([0, 1], 0, view)).toEqual([0]); // step back
    expect(extendTrail([0, 1, 3], 0, view)).toEqual([0]); // back to an earlier square
    const onMove = vi.fn();
    render(<TrailGame {...props(view, onMove)} />);
    expect(screen.getByText("Start on 1")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Number/ })).toHaveLength(2);
    // Tap through the 2×2 grid: 0 → 1 → 3 → 2 ends on the last number.
    const at = (cell: number) => {
      const el = document.querySelector(`[data-cell="${String(cell)}"]`);
      if (!el) throw new Error("no cell");
      return el;
    };
    // jsdom has no layout or pointer capture: point the grid's hit test at each square in turn.
    HTMLElement.prototype.setPointerCapture = () => undefined;
    for (const cell of [0, 1, 3, 2]) {
      document.elementFromPoint = () => at(cell);
      fireEvent.pointerDown(at(cell).parentElement ?? at(cell), { clientX: 1, clientY: 1 });
      fireEvent.pointerUp(at(cell).parentElement ?? at(cell));
    }
    expect(onMove).toHaveBeenCalledWith({ type: "solve", path: [0, 1, 3, 2] });
    expect(trailSummary({ kind: "done", solved: true, tookMs: 23_400, size: 6, dots: [] })).toBe(
      "Solved in 23.4 s",
    );
    expect(trailSummary({ kind: "done", solved: false, tookMs: null, size: 6, dots: [] })).toBe(
      "Time ran out",
    );
  });
});
