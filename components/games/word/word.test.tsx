import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { WordView } from "@/lib/games";
import { WordGame, wordSummary } from "./word";

const props = (view: WordView, onMove = vi.fn()) => ({
  view,
  onMove,
  onTimeUp: vi.fn(),
  busy: false,
});
const guessing = (over: Partial<Extract<WordView, { kind: "guessing" }>> = {}): WordView => ({
  kind: "guessing",
  rows: [],
  maxGuesses: 6,
  rejected: null,
  ...over,
});

describe("Secret Word screen (spec 19)", () => {
  test("S19-AC2: types on the keyboard and sends five letters on Enter, and only five", async () => {
    const onMove = vi.fn();
    render(<WordGame {...props(guessing(), onMove)} />);
    const user = userEvent.setup();
    for (const l of ["S", "P", "E", "A"]) await user.click(screen.getByRole("button", { name: l }));
    await user.click(screen.getByRole("button", { name: "Enter" }));
    expect(onMove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "R" }));
    await user.click(screen.getByRole("button", { name: "X" })); // a sixth letter is ignored
    expect(
      within(screen.getByRole("group", { name: "Guess 1" })).getAllByRole("img")[4],
    ).toHaveAccessibleName(/^R/);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "R" }));
    await user.click(screen.getByRole("button", { name: "Enter" }));
    expect(onMove).toHaveBeenCalledWith({ type: "guess", word: "SPEAR" });
  });

  test("S19-AC2: a physical keyboard works, and a word not in the list says so and keeps the letters", () => {
    const onMove = vi.fn();
    const { rerender } = render(<WordGame {...props(guessing(), onMove)} />);
    for (const key of ["x", "q", "z", "v", "b", "Enter"]) fireEvent.keyDown(window, { key });
    expect(onMove).toHaveBeenCalledWith({ type: "guess", word: "XQZVB" });
    rerender(<WordGame {...props(guessing({ rejected: "XQZVB" }), onMove)} />);
    expect(screen.getByRole("status")).toHaveTextContent("Not in the word list");
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  test("S19-AC3: marked rows show on the tiles, and the keyboard keeps each letter's best mark", () => {
    const rows = [
      { word: "CRANE", marks: ["absent", "present", "present", "absent", "present"] as const },
      { word: "SPEAR", marks: ["correct", "correct", "correct", "correct", "correct"] as const },
    ].map((r) => ({ ...r, marks: [...r.marks] }));
    render(<WordGame {...props(guessing({ rows: rows.slice(0, 1) }))} />);
    const first = screen.getByRole("group", { name: "Guess 1" });
    expect(
      within(first)
        .getAllByRole("img")
        .map((t) => t.getAttribute("aria-label"))[0],
    ).toMatch(/^C/);
    expect(screen.getByRole("button", { name: /^R, / })).toHaveAttribute("data-state", "present");
    expect(screen.getByRole("button", { name: /^C, / })).toHaveAttribute("data-state", "absent");
    expect(wordSummary({ kind: "done", rows, maxGuesses: 6, solved: true, answer: "SPEAR" })).toBe(
      "Solved in 2 guesses",
    );
    expect(wordSummary({ kind: "done", rows, maxGuesses: 6, solved: false, answer: null })).toBe(
      "Not this time",
    );
    expect(wordSummary({ kind: "done", rows, maxGuesses: 6, solved: false, answer: "SPEAR" })).toBe(
      "The word was SPEAR",
    );
  });
});
