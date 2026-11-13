import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Mark, WordView } from "@/lib/games";
import { WORD_HOLD_MS, WordGame, wordSummary } from "./word";

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

afterEach(() => {
  vi.useRealTimers();
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

  test("S19-AC3: a new guess flips over tile by tile, and the keyboard waits for the flips", async () => {
    vi.useFakeTimers();
    const onMove = vi.fn();
    const { rerender } = render(<WordGame {...props(guessing(), onMove)} />);
    const marks = ["absent", "present", "present", "absent", "correct"] as Mark[];
    rerender(<WordGame {...props(guessing({ rows: [{ word: "CRANE", marks }] }), onMove)} />);
    const tiles = () =>
      within(screen.getByRole("group", { name: "Guess 1" }))
        .getAllByRole("img")
        .map((t) => t.getAttribute("data-state"));
    // Nothing shows yet: every tile still reads as typed, and the keyboard is unmarked.
    expect(tiles()).toEqual(["typed", "typed", "typed", "typed", "typed"]);
    expect(screen.getByRole("button", { name: /^E($|,)/ })).toHaveAttribute("data-state", "unused");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(tiles()).toEqual(["absent", "typed", "typed", "typed", "typed"]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WORD_HOLD_MS);
    });
    expect(tiles()).toEqual(marks);
    expect(screen.getByRole("button", { name: /^E($|,)/ })).toHaveAttribute(
      "data-state",
      "correct",
    );
  });

  test("S19-AC2: a turned-away word shakes the row, and the message clears itself", async () => {
    vi.useFakeTimers();
    const onMove = vi.fn();
    const { rerender } = render(<WordGame {...props(guessing(), onMove)} />);
    for (const key of ["x", "q", "z", "v", "b"]) fireEvent.keyDown(window, { key });
    const row = () => screen.getByRole("group", { name: "Guess 1" });
    expect(row().className).not.toMatch(/gm-shake/);
    rerender(<WordGame {...props(guessing({ rejected: "XQZVB" }), onMove)} />);
    expect(row().className).toMatch(/gm-shake/);
    expect(screen.getByRole("status")).toHaveTextContent("Not in the word list");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});
