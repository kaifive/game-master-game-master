import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { recallSummary, RecallGame, FEEDBACK_MS } from "./recall/recall";
import { presentFor, StackerGame, stackerSummary } from "./stacker/stacker";
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
  test("S16-AC2: T-Timer always shows the clock and the window, and sends the phone's time on Stop", async () => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
      toFake: ["performance", "requestAnimationFrame", "setTimeout"],
    });
    const onMove = vi.fn();
    const win = { fromSeconds: 1.2, toSeconds: 1.25 };
    const { rerender } = render(<TimerGame {...props({ kind: "ready", ...win }, onMove)} />);
    // An old play still waiting on Start is started for the player: no second button.
    expect(onMove).toHaveBeenLastCalledWith({ type: "start" });
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    rerender(<TimerGame {...props({ kind: "running", ...win, elapsedMs: 0 }, onMove)} />);
    expect(screen.getByText("1.20 – 1.25")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    // It never hides.
    expect(screen.getByTestId("timer-clock").textContent).toMatch(/^[23]\.\d\d$/);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Stop" }));
    const sent = onMove.mock.calls.at(-1)?.[0] as { type: string; elapsedMs: number };
    expect(sent.type).toBe("stop");
    expect(sent.elapsedMs).toBeGreaterThanOrEqual(2900);
    // Stop freezes at once, before the server answers: the time shows and the button rests.
    expect(screen.getByTestId("timer-clock").textContent).toMatch(/^\d\.\d\d$/);
    expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(timerSummary({ kind: "done", ...win, elapsedMs: 1230, offMs: 0 })).toBe(
      "Stopped at 1.23 · in the window!",
    );
    expect(timerSummary({ kind: "done", ...win, elapsedMs: 1310, offMs: 60 })).toBe(
      "Stopped at 1.31 · 0.06 s late",
    );
    expect(timerSummary({ kind: "done", ...win, elapsedMs: 1150, offMs: 50 })).toBe(
      "Stopped at 1.15 · 0.05 s early",
    );
    expect(timerSummary({ kind: "done", ...win, elapsedMs: null, offMs: null })).toBe(
      "The clock ran out",
    );
  });

  test("S16-AC3: Tap Masher counts down, counts taps, then sends them when time is up", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["performance", "requestAnimationFrame"] });
    const onMove = vi.fn();
    const { rerender } = render(
      <TapsGame {...props({ kind: "ready", seconds: 5, target: 50 }, onMove)} />,
    );
    expect(onMove).toHaveBeenLastCalledWith({ type: "start" });
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
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
    expect(screen.queryByText(/50/)).toBeNull(); // the top score stays hidden
    expect(tapsSummary({ kind: "done", taps: 33, target: 45 })).toBe("33 taps");
  });

  test("S16-AC14: a Tap Masher film waits for its frames, plays one per tap, and ends on the last", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["performance", "requestAnimationFrame"] });
    // jsdom loads no images: this one "loads" when asked, so the test controls when.
    const loads: (() => void)[] = [];
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_: string) {
          loads.push(() => this.onload?.());
        }
      },
    );
    const film = {
      sheet: "/form.jpg",
      frames: 6,
      columns: 3,
      width: 320,
      height: 240,
      alt: "Coach's form",
    };
    const onMove = vi.fn();
    const { rerender } = render(
      <TapsGame {...props({ kind: "running", seconds: 5, goInMs: 0, film }, onMove)} />,
    );
    // The countdown waits for the frames.
    expect(screen.getByText("Loading the video…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tap!/ })).toBeDisabled();
    act(() => {
      loads.forEach((load) => {
        load();
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    const pad = screen.getByRole("button", { name: /Tap!/ });
    const frame = () => screen.getByRole("img", { name: /Coach's form/ });
    expect(frame()).toHaveAttribute("data-frame", "0");
    for (let i = 0; i < 4; i++) fireEvent.pointerDown(pad);
    // Frame 4: second row, middle column of a 3 × 2 sheet.
    expect(frame()).toHaveAttribute("data-frame", "4");
    expect(frame().style.backgroundPosition).toBe("50% 100%");
    expect(screen.getByRole("progressbar", { name: "Form" })).toHaveAttribute("aria-valuenow", "4");
    fireEvent.pointerDown(pad);
    fireEvent.pointerDown(pad);
    // The last frame ends the run at once, without waiting for the clock.
    expect(onMove).toHaveBeenLastCalledWith({ type: "finish", taps: 6 });
    expect(screen.getByText("Form complete!")).toBeInTheDocument();
    fireEvent.pointerDown(pad);
    expect(onMove).toHaveBeenCalledTimes(1);
    // The result arrives while the last frame holds: it stays up.
    rerender(<TapsGame {...props({ kind: "done", taps: 6, target: 6, film }, onMove)} />);
    expect(frame()).toHaveAttribute("data-frame", "5");
    expect(tapsSummary({ kind: "done", taps: 6, target: 6, film })).toBe(
      "Finished the whole form!",
    );
    expect(tapsSummary({ kind: "done", taps: 4, target: 6, film })).toBe("4 moves");
    // The count never shows the total.
    expect(screen.queryByText(/\/6|of 6/)).toBeNull();
    vi.unstubAllGlobals();
  });

  test("S16-AC5: Stack Attack stops the bar on a tap anywhere and sends the rows when it misses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["performance", "requestAnimationFrame"] });
    const onMove = vi.fn();
    const { rerender } = render(
      <StackerGame {...props({ kind: "ready", rows: 12, width: 7 }, onMove)} />,
    );
    expect(onMove).toHaveBeenLastCalledWith({ type: "start" });
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    rerender(<StackerGame {...props({ kind: "running", rows: 12, width: 7 }, onMove)} />);
    const board = screen.getByRole("button", { name: "Stop the bar" });
    // A tap anywhere on the screen stops the bar, not just on the board.
    fireEvent.pointerDown(document.body); // row 1 always lands
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

  test("S16-AC12: Stack Attack stacks presents: wide bars are large boxes, trimmed ones medium and small", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["performance", "requestAnimationFrame"] });
    expect([3, 2, 1].map(presentFor)).toEqual(["large", "medium", "small"]);
    const { container } = render(
      <StackerGame {...props({ kind: "running", rows: 12, width: 7 }, vi.fn())} />,
    );
    const presents = () =>
      Array.from(container.querySelectorAll("[data-present]")).map((p) =>
        p.getAttribute("data-present"),
      );
    // The sliding bar is a large present with its bow on top.
    expect(presents()).toEqual(["large"]);
    expect(container.querySelectorAll("[data-bow]")).toHaveLength(1);
    fireEvent.pointerDown(document.body); // row 1 always lands whole
    // Two presents now: the new one sliding above, the landed one under it; only the top one has a bow.
    expect(presents()).toEqual(["large", "large"]);
    expect(container.querySelectorAll("[data-bow]")).toHaveLength(1);
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

  test("S16-AC4: Pathfinder builds the path square by square, undoes by stepping back, and sends a solved one", () => {
    const view = { kind: "playing" as const, size: 2, dots: [0, 2], elapsedMs: 1000 };
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

  test("S16-AC11: a carpet floor draws blue mats inside a white boundary line", () => {
    const view = { kind: "playing" as const, size: 3, dots: [0, 2, 8], elapsedMs: 0 };
    const { rerender } = render(<TrailGame {...props({ ...view, floor: "carpet" })} />);
    const floor = () => document.querySelector("[data-floor]") as HTMLElement;
    expect(floor().getAttribute("data-floor")).toBe("carpet");
    expect(floor().style.boxShadow).toContain("inset");
    const square = document.querySelector('[data-cell="4"]') as HTMLElement;
    expect(square.style.background).not.toBe("");
    rerender(<TrailGame {...props(view)} />);
    expect(floor().getAttribute("data-floor")).toBe("plain");
    expect((document.querySelector('[data-cell="4"]') as HTMLElement).style.background).toBe("");
  });

  test("S16-AC9 S16-AC10: the runner starts on 1, follows and faces the trail, and numbers turn green or red", () => {
    // A 3×3 grid, dots 1, 2, 3 on squares 0, 2, 8.
    const view = {
      kind: "playing" as const,
      size: 3,
      dots: [0, 2, 8],
      elapsedMs: 0,
      runner: { src: "/danny.png", alt: "Danny" },
    };
    render(<TrailGame {...props(view)} />);
    const runner = () => screen.getByRole("img", { name: "Danny" });
    // Which way Danny faces, 0 to 359 (he may have turned past a full circle).
    const facingDeg = () => {
      const deg = Number(
        /rotate\((-?\d+)deg\)/.exec(runner().parentElement?.style.transform ?? "")?.[1],
      );
      return ((deg % 360) + 360) % 360;
    };
    const at = (cell: number) => {
      const el = document.querySelector(`[data-cell="${String(cell)}"]`);
      if (!el) throw new Error("no cell");
      return el;
    };
    const mark = (n: number) =>
      screen
        .getByRole("img", { name: new RegExp(`^Number ${String(n)}`) })
        .getAttribute("data-mark");
    // Danny stands on 1, upright; the 1 chip hides under him.
    expect(runner().closest("[data-runner-at]")?.getAttribute("data-runner-at")).toBe("0");
    expect(facingDeg()).toBe(0);
    expect(mark(1)).toBe("idle");
    HTMLElement.prototype.setPointerCapture = () => undefined;
    const grid = at(0).parentElement as HTMLElement;
    const drag = (cells: number[]) => {
      document.elementFromPoint = () => at(cells[0] as number);
      fireEvent.pointerDown(grid, { clientX: 1, clientY: 1 });
      for (const cell of cells.slice(1)) {
        document.elementFromPoint = () => at(cell);
        fireEvent.pointerMove(grid, { clientX: 1, clientY: 1 });
      }
      fireEvent.pointerUp(grid);
    };
    // Right, right: passes 2 (green); Danny faces right.
    drag([0, 1, 2]);
    expect(mark(1)).toBe("passed");
    expect(mark(2)).toBe("passed");
    expect(runner().closest("[data-runner-at]")?.getAttribute("data-runner-at")).toBe("2");
    expect(facingDeg()).toBe(90);
    // Back to 1 and down the left side to 3's row, then along to 3, skipping 2.
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    drag([0, 3, 6, 7, 8]);
    expect(mark(2)).toBe("skipped");
    expect(mark(3)).toBe("idle");
    expect(facingDeg()).toBe(90);
  });
});
