import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BlocksGame, blocksSummary } from "./blocks";

const bar: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
];
const props = (onMove = vi.fn()) => ({
  view: {
    kind: "playing" as const,
    width: 3,
    height: 2,
    pieces: [
      { id: 0, cells: bar },
      { id: 1, cells: bar },
    ],
    elapsedMs: 0,
  },
  onMove,
  onTimeUp: vi.fn(),
  busy: false,
});

const rect = Object.getOwnPropertyDescriptor(Element.prototype, "getBoundingClientRect");
beforeEach(() => {
  // jsdom has no layout: the board is 3 squares of 48px wide, and everything starts at 0, 0.
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 144, height: 96, right: 144, bottom: 96, x: 0, y: 0 }) as DOMRect;
  HTMLElement.prototype.setPointerCapture = () => undefined;
});
afterEach(() => {
  if (rect) Object.defineProperty(Element.prototype, "getBoundingClientRect", rect);
});

const dragTo = (piece: HTMLElement, x: number, y: number) => {
  fireEvent.pointerDown(piece, { pointerId: 1, clientX: 5, clientY: 5 });
  fireEvent.pointerMove(piece, { pointerId: 1, clientX: x, clientY: y });
  fireEvent.pointerUp(piece, { pointerId: 1, clientX: x, clientY: y });
};

describe("Block Fit screen (spec 22)", () => {
  test("S22-AC4: a tap turns a piece; a drag drops it where it fits; a full board sends the placements", () => {
    const onMove = vi.fn();
    render(<BlocksGame {...props(onMove)} />);
    const tray = () => within(screen.getByRole("group", { name: "Pieces" })).getAllByRole("button");
    // A tap turns the first piece a quarter turn (it now stands upright and won't fit flat).
    fireEvent.pointerDown(tray()[0] as HTMLElement, { pointerId: 1, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(tray()[0] as HTMLElement, { pointerId: 1, clientX: 5, clientY: 5 });
    // Upright, three tall: it hangs off a two-row board, so the drop is refused.
    dragTo(tray()[0] as HTMLElement, 24, 24);
    expect(screen.getByText("0 of 2 placed")).toBeInTheDocument();
    // Turn it back flat (three more taps), then drop both bars, one per row.
    for (let i = 0; i < 3; i++) {
      fireEvent.pointerDown(tray()[0] as HTMLElement, { pointerId: 1, clientX: 5, clientY: 5 });
      fireEvent.pointerUp(tray()[0] as HTMLElement, { pointerId: 1, clientX: 5, clientY: 5 });
    }
    dragTo(tray()[0] as HTMLElement, 24, 24);
    expect(screen.getByText("1 of 2 placed")).toBeInTheDocument();
    dragTo(tray()[0] as HTMLElement, 24, 72);
    expect(onMove).toHaveBeenCalledWith({
      type: "solve",
      placements: [
        { piece: 0, turns: 0, row: 0, col: 0 },
        { piece: 1, turns: 0, row: 1, col: 0 },
      ],
    });
    expect(blocksSummary({ kind: "done", width: 3, height: 2, tookMs: 42_000, pieces: 2 })).toBe(
      "Solved in 0:42",
    );
  });

  test("S22-AC4: a placed piece taps back off the board", () => {
    render(<BlocksGame {...props()} />);
    const tray = () => within(screen.getByRole("group", { name: "Pieces" })).getAllByRole("button");
    dragTo(tray()[0] as HTMLElement, 24, 24);
    expect(screen.getByText("1 of 2 placed")).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Placed piece: tap to take it back",
      })[0] as HTMLElement,
    );
    expect(screen.getByText("0 of 2 placed")).toBeInTheDocument();
  });

  test("S22-AC5: picture pieces show their photo slices, turned as dealt, and a full board shows the whole photo", () => {
    const base = props();
    render(
      <BlocksGame
        {...base}
        view={{
          ...base.view,
          image: { src: "/p.jpg", alt: "A photo" },
          pieces: [
            {
              id: 0,
              cells: bar,
              slices: [
                [0, 0],
                [0, 1],
                [0, 2],
              ],
              spin: 0,
            },
            // Dealt upside down: its first square is the photo's bottom-right slice.
            {
              id: 1,
              cells: bar,
              slices: [
                [1, 2],
                [1, 1],
                [1, 0],
              ],
              spin: 2,
            },
          ],
        }}
      />,
    );
    const tray = () => within(screen.getByRole("group", { name: "Pieces" })).getAllByRole("button");
    dragTo(tray()[1] as HTMLElement, 24, 72);
    const board = within(screen.getByRole("group", { name: "Board" })).getAllByRole("button");
    const slice = board[3]?.querySelector("span");
    expect(slice?.style.backgroundImage).toContain("/p.jpg");
    expect(slice?.style.backgroundPosition).toBe("100% 100%");
    expect(slice?.style.transform).toBe("rotate(180deg)");
    expect(screen.queryByRole("img", { name: "Solved: A photo" })).not.toBeInTheDocument();
    dragTo(tray()[0] as HTMLElement, 24, 24);
    expect(screen.getByRole("img", { name: "Solved: A photo" })).toBeInTheDocument();
  });
});
