import { renderHook, waitFor } from "@testing-library/react";
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
});
