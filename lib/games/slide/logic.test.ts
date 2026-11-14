import { describe, expect, it } from "vitest";
import {
  isSolved,
  scrambled,
  slide,
  slideGame,
  slideShare,
  SlideContent,
  solvedBoard,
} from "./logic";

/** A 3×3 board is solvable when its tiles (gap left out) are an even number of swaps from order. */
const solvable = (b: number[]) => {
  const tiles = b.filter((v) => v !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if ((tiles[i] as number) > (tiles[j] as number)) inversions++;
  return inversions % 2 === 0;
};

/** Breadth-first search for the taps that solve a 3×3 board (one board, in one test). */
function solve(board: number[], size: number): number[] {
  const key = (b: number[]) => b.join(",");
  const prev = new Map<string, { from: string; tap: number } | null>([[key(board), null]]);
  const queue = [board];
  for (let head = 0; head < queue.length; head++) {
    const b = queue[head] as number[];
    if (isSolved(b)) {
      const taps: number[] = [];
      for (let k = key(b), step = prev.get(k); step; k = step.from, step = prev.get(k))
        taps.unshift(step.tap);
      return taps;
    }
    for (let tile = 1; tile < size * size; tile++) {
      const next = slide(b, size, tile);
      if (!next || prev.has(key(next))) continue;
      prev.set(key(next), { from: key(b), tap: tile });
      queue.push(next);
    }
  }
  throw new Error("unsolvable");
}

describe("Number Slide", () => {
  it("S21-AC1: every seed makes a solvable, unsolved board", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const b = scrambled(3, 80, seed);
      expect(b.slice().sort()).toEqual(solvedBoard(3).slice().sort());
      expect(isSolved(b)).toBe(false);
      expect(solvable(b)).toBe(true);
      seen.add(b.join(","));
    }
    expect(seen.size).toBeGreaterThan(35);
    expect(scrambled(4, 80, 3)).toHaveLength(16);
  });

  it("S21-AC2: slides only from the gap's row or column, pulling the tiles between", () => {
    const b = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    expect(slide(b, 3, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(slide(b, 3, 7)).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
    expect(slide(b, 3, 3)).toEqual([1, 2, 0, 4, 5, 3, 7, 8, 6]);
    expect(slide(b, 3, 1)).toBeNull();
  });

  it("S21-AC2 S21-AC3: the server replays the taps; half for solving plus speed, no time limit", () => {
    const c = SlideContent.parse({});
    const s = slideGame.create(c, 7, { now: 0 });
    expect(slideGame.view(s, c, { now: 2000 })).toMatchObject({
      kind: "playing",
      size: 3,
      elapsedMs: 2000,
    });
    const taps = solve(s.start, 3);
    expect(slideGame.move(s, c, { type: "solve", taps: taps.slice(0, -1) }, { now: 1 }).ok).toBe(
      false,
    );
    expect(slideGame.move(s, c, { type: "solve", taps: [...taps, 99] }, { now: 1 }).ok).toBe(false);
    const fast = slideGame.move(s, c, { type: "solve", taps }, { now: 20_000 });
    if (!fast.ok) throw new Error(fast.message);
    expect(slideGame.score(fast.state, 100)).toBe(100);
    expect(slideGame.view(fast.state, c, { now: 0 })).toMatchObject({
      kind: "done",
      moves: taps.length,
    });
    expect(slideShare(105_000)).toBeCloseTo(0.75);
    expect(slideShare(600_000)).toBe(0.5);
    expect(slideGame.tick(s, c, { now: 3_600_000 })).toBe(s);
    expect(slideGame.instructions(c).lines[0]).toMatch(/1 to 8/);
  });
});
