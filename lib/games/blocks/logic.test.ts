import { describe, expect, it } from "vitest";
import { blocks, blocksShare, BlocksContent } from "./logic";
import { checkPlacements, cutBoard, MAX_PIECE, MIN_PIECE, rotate, solveBlocks } from "./puzzle";

describe("Block Fit", () => {
  it("S22-AC1: every seed cuts the board into connected pieces of 3 to 5 that cover it", () => {
    const shapes = new Set<string>();
    for (let seed = 1; seed <= 150; seed++) {
      const pieces = cutBoard(5, 4, seed);
      expect(pieces.reduce((n, p) => n + p.cells.length, 0)).toBe(20);
      for (const p of pieces) {
        expect(p.cells.length).toBeGreaterThanOrEqual(MIN_PIECE);
        expect(p.cells.length).toBeLessThanOrEqual(MAX_PIECE);
        // Connected: a walk from the first square reaches them all.
        const keys = new Set(p.cells.map(([r, c]) => `${String(r)},${String(c)}`));
        const reach = new Set([[...keys][0] as string]);
        for (let grew = true; grew;) {
          grew = false;
          for (const k of reach) {
            const [r, c] = k.split(",").map(Number) as [number, number];
            for (const n of [
              `${String(r + 1)},${String(c)}`,
              `${String(r - 1)},${String(c)}`,
              `${String(r)},${String(c + 1)}`,
              `${String(r)},${String(c - 1)}`,
            ])
              if (keys.has(n) && !reach.has(n)) {
                reach.add(n);
                grew = true;
              }
          }
        }
        expect(reach.size).toBe(keys.size);
      }
      shapes.add(JSON.stringify(pieces));
      expect(solveBlocks(5, 4, pieces)).not.toBeNull();
    }
    expect(shapes.size).toBeGreaterThan(140);
  });

  it("S22-AC2: only placements that cover the board exactly, with no overlap, solve it", () => {
    const c = BlocksContent.parse({});
    const s = blocks.create(c, 11, { now: 0 });
    const solution = solveBlocks(5, 4, s.pieces);
    if (!solution) throw new Error("unsolvable");
    expect(checkPlacements(5, 4, s.pieces, solution)).toBeNull();
    expect(checkPlacements(5, 4, s.pieces, solution.slice(1))).toBe("Place every piece once.");
    const shifted = solution.map((p, i) => (i === 0 ? { ...p, col: p.col + 5 } : p));
    expect(checkPlacements(5, 4, s.pieces, shifted)).toBe("A piece hangs off the board.");
    const piled = solution.map((p) => ({ ...p, row: 0, col: 0 }));
    expect(checkPlacements(5, 4, s.pieces, piled)).not.toBeNull();
    expect(
      rotate(
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [1, 0],
        ],
        1,
      ),
    ).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]);
    expect(
      rotate(
        [
          [0, 0],
          [0, 1],
        ],
        4,
      ),
    ).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });

  it("S22-AC3: half for solving plus up to half for speed, no time limit", () => {
    const c = BlocksContent.parse({});
    const s = blocks.create(c, 4, { now: 0 });
    expect(blocks.view(s, c, { now: 1500 })).toMatchObject({
      kind: "playing",
      width: 5,
      height: 4,
      elapsedMs: 1500,
    });
    const placements = solveBlocks(5, 4, s.pieces) ?? [];
    expect(blocks.move(s, c, { type: "solve", placements: [] }, { now: 1 }).ok).toBe(false);
    const done = blocks.move(s, c, { type: "solve", placements }, { now: 25_000 });
    if (!done.ok) throw new Error(done.message);
    expect(blocks.score(done.state, 100)).toBe(100);
    expect(blocksShare(180_000)).toBe(0.5);
    expect(blocks.tick(s, c, { now: 3_600_000 })).toBe(s);
  });
});
