import { describe, expect, it } from "vitest";
import { deltaE2000 } from "./de2000";

describe("CIEDE2000", () => {
  it("S18-AC2: matches the published test pairs (Sharma, Wu and Dalal)", () => {
    const pairs: [[number, number, number], [number, number, number], number][] = [
      [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
      [[50, -1, 2], [50, 0, 0], 2.3669],
      [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
      [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
      [[50, 2.5, 0], [73, 25, -18], 27.1492],
    ];
    for (const [a, b, want] of pairs) {
      expect(deltaE2000(a, b)).toBeCloseTo(want, 4);
      expect(deltaE2000(b, a)).toBeCloseTo(want, 4);
    }
  });
});
