import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CacheGame, cacheSummary } from "./cache/cache";
import { JarGame, jarSummary } from "./jar/jar";

const props = (view: unknown, onMove = vi.fn()) => ({
  view,
  onMove,
  onTimeUp: vi.fn(),
  busy: false,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Guessing Jar and Geocache screens (spec 17)", () => {
  test("S17-AC2: the jar takes one number, confirms it's final, then sends it", async () => {
    const onMove = vi.fn();
    render(
      <JarGame {...props({ kind: "guess", prompt: "How many candies are in the jar?" }, onMove)} />,
    );
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Lock in my guess" })).toBeDisabled();
    await user.type(screen.getByLabelText("How many candies are in the jar?"), "3a40");
    await user.click(screen.getByRole("button", { name: "Lock in my guess" }));
    expect(screen.getByRole("alertdialog", { name: "Lock in your guess?" })).toHaveTextContent(
      "Lock in 340? You only get one guess.",
    );
    await user.click(screen.getByRole("button", { name: "Yes, lock it in" }));
    expect(onMove).toHaveBeenCalledWith({ type: "guess", value: 340 });
    expect(
      jarSummary({ kind: "done", prompt: "", guess: 340, actual: null, points: null }),
    ).toMatch(/Points come when the host reveals the jar/);
    expect(jarSummary({ kind: "done", prompt: "", guess: 330, actual: 300, points: 80 })).toBe(
      "You guessed 330 · the jar had 300 · 10% off",
    );
  });

  test("S17-AC4: Geocache sends a typed code, says what happened, and waits after too many misses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onMove = vi.fn();
    const base = { kind: "hunting", total: 3, lockedForMs: 0 };
    const { rerender } = render(
      <CacheGame {...props({ ...base, found: [], last: null }, onMove)} />,
    );
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    await user.type(screen.getByLabelText("Found a code? Type it here"), "snow1");
    await user.click(screen.getByRole("button", { name: "Check code" }));
    expect(onMove).toHaveBeenCalledWith({ type: "code", code: "snow1" });
    rerender(
      <CacheGame
        {...props({ ...base, found: [{ label: "By the door" }], last: "found" }, onMove)}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Found one!");
    expect(screen.getByText("1 of 3 found")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Found" })).toHaveTextContent("By the door");
    rerender(
      <CacheGame {...props({ ...base, found: [], last: "locked", lockedForMs: 30_000 }, onMove)} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Too many tries");
    expect(screen.getByRole("button", { name: "Wait a moment…" })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_100);
    });
    await user.type(screen.getByLabelText("Found a code? Type it here"), "x");
    expect(screen.getByRole("button", { name: "Check code" })).toBeEnabled();
    expect(cacheSummary({ ...base, kind: "done", found: [], last: null })).toBe(
      "All 3 caches found",
    );
  });
});
