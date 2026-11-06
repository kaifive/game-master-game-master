import { describe, expect, it } from "vitest";
import { seededRandom, shuffled } from "./random";

describe("seeded randomness", () => {
  it("repeats for the same seed and differs for another", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const c = seededRandom(43);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    for (const n of seqA) expect(n >= 0 && n < 1).toBe(true);
  });

  it("shuffles a copy, keeping every item", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(items, seededRandom(7));
    expect(out).not.toEqual(items);
    expect(out.slice().sort((x, y) => x - y)).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shuffled(items, seededRandom(7))).toEqual(out);
  });
});
