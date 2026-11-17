import { describe, expect, it } from "vitest";
import { clockOffset, keepBest } from "./clock";

describe("shared clock (S11-AC5)", () => {
  it("S11-AC5: the offset comes from the reply with the shortest round trip", () => {
    // The server is 5 s ahead. A slow reply (sent 0, back 900) would mislead; the fast one doesn't.
    const samples = [
      { sent: 0, received: 900, server: 5_100 },
      { sent: 1_000, received: 1_040, server: 6_020 },
      { sent: 2_000, received: 2_300, server: 7_250 },
    ];
    expect(clockOffset(samples)).toBe(5_000);
    expect(clockOffset([])).toBe(0);
    // A reply that came back before it was sent (clock jump) is ignored.
    expect(clockOffset([{ sent: 10, received: 5, server: 99 }])).toBe(0);
  });

  it("S11-AC5: keeps the few fastest samples", () => {
    let kept: { sent: number; received: number; server: number }[] = [];
    for (let i = 0; i < 20; i++)
      kept = keepBest(kept, { sent: 0, received: 100 - i, server: 0 }, 4);
    expect(kept.map((s) => s.received)).toEqual([81, 82, 83, 84]);
  });
});
