import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SlideGame, slideSummary } from "./slide";

const props = (onMove = vi.fn()) => ({
  view: { kind: "playing" as const, size: 3, board: [1, 2, 3, 4, 5, 0, 7, 8, 6], elapsedMs: 0 },
  onMove,
  onTimeUp: vi.fn(),
  busy: false,
});

describe("Number Slide screen (spec 21)", () => {
  test("S21-AC4: slides a tile on tap, counts moves, ignores stuck tiles, and sends the taps when in order", () => {
    const onMove = vi.fn();
    render(<SlideGame {...props(onMove)} />);
    expect(screen.getByText("0 moves")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tile 1, in place" })); // not in the gap's line
    expect(screen.getByText("0 moves")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tile 6" }));
    expect(onMove).toHaveBeenCalledWith({ type: "solve", taps: [6] });
    expect(screen.getByText("1 move")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tile 6, in place" })).toBeInTheDocument();
    expect(slideSummary({ kind: "done", size: 3, tookMs: 75_000, moves: 31 })).toBe(
      "Solved in 1:15 · 31 moves",
    );
  });

  test("S21-AC5: a picture puzzle shows each tile's slice of the picture, not its number, and the goal", () => {
    const base = props();
    render(
      <SlideGame {...base} view={{ ...base.view, image: { src: "/p.png", alt: "A picture" } }} />,
    );
    const tile = screen.getByRole("button", { name: "Tile 6" });
    expect(tile).not.toHaveTextContent("6");
    // Tile 6 belongs in the middle row, right column.
    const slice = tile.querySelector("span");
    expect(slice?.style.backgroundImage).toContain("/p.png");
    expect(slice?.style.backgroundPosition).toBe("100% 50%");
    expect(screen.getByRole("img", { name: "Goal: A picture" })).toBeInTheDocument();
  });
});
