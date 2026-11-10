import { describe, expect, it } from "vitest";
import { trail, trailShare, TrailContent } from "./logic";
import { checkPath, makePuzzle } from "./puzzle";

const c = TrailContent.parse({});
const at = (now: number) => ({ now });

describe("Pathfinder", () => {
  it("S16-AC4: every seed makes a different puzzle that has a solution", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const p = makePuzzle(6, 8, seed);
      expect(checkPath(p, p.path)).toBeNull();
      expect(p.dots).toHaveLength(8);
      seen.add(p.dots.join(","));
    }
    expect(seen.size).toBeGreaterThan(190);
    for (const size of [4, 5, 7, 8]) {
      const p = makePuzzle(size, 6, 99);
      expect(checkPath(p, p.path)).toBeNull();
    }
  });

  it("S16-AC4: only a whole, connected path through the dots in order solves it", () => {
    const p = makePuzzle(6, 8, 3);
    expect(checkPath(p, p.path.slice(1))).toBe("Fill every square.");
    expect(checkPath(p, [...p.path].reverse())).toMatch(/Start on 1/);
    const jumped = [...p.path];
    [jumped[3], jumped[20]] = [jumped[20] as number, jumped[3] as number];
    expect(checkPath(p, jumped)).not.toBeNull();
  });

  it("S16-AC4: a 7×7 grid; half the points for solving, up to half more for speed; no time limit", () => {
    const s = trail.create(c, 5, at(0));
    const { path } = makePuzzle(7, 8, 5);
    expect(trail.view(s, c, at(1000))).toMatchObject({ kind: "playing", size: 7, elapsedMs: 1000 });
    expect(trail.move(s, c, { type: "solve", path: path.slice(0, 10) }, at(1000)).ok).toBe(false);
    const fast = trail.move(s, c, { type: "solve", path }, at(15_000));
    if (!fast.ok) throw new Error(fast.message);
    expect(trail.score(fast.state, 100)).toBe(100);
    const slower = trail.move(s, c, { type: "solve", path }, at(30_000));
    if (!slower.ok) throw new Error(slower.message);
    expect(trail.score(slower.state, 100)).toBe(90);
    expect(trailShare(200_000)).toBe(0.5);
    // No limit: an hour later it's still waiting to be solved.
    expect(trail.tick(s, c, at(3_600_000))).toBe(s);
    const lines = trail.instructions(c).lines.join(" ");
    expect(lines).toMatch(/every square/);
    expect(lines).not.toMatch(/minutes/);
  });
});
