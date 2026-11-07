import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { usePoll } from "./use-poll";

describe("usePoll", () => {
  test("S03-AC3 S05-AC2: a new loader (the phone now knows its player) loads at once", async () => {
    const anon = vi.fn(() => Promise.resolve("anyone"));
    const mine = vi.fn(() => Promise.resolve("mine"));
    const { result, rerender } = renderHook(({ load }) => usePoll(load, 60_000), {
      initialProps: { load: anon },
    });
    await waitFor(() => {
      expect(result.current).toBe("anyone");
    });
    rerender({ load: mine });
    await waitFor(() => {
      expect(result.current).toBe("mine");
    });
    expect(mine).toHaveBeenCalledTimes(1);
  });

  test("a hidden tab doesn't poll, and loads at once when it's shown again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const load = vi.fn(() => Promise.resolve("x"));
    renderHook(() => usePoll(load, 1000));
    await waitFor(() => {
      expect(load).toHaveBeenCalledTimes(1);
    });
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(load).toHaveBeenCalledTimes(1);
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(load).toHaveBeenCalledTimes(2);
    hidden.mockRestore();
    vi.useRealTimers();
  });
});
