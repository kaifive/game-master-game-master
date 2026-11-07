import { describe, expect, it } from "vitest";
import { trail, trailShare, TrailContent } from "./logic";
import { checkPath, makePuzzle } from "./puzzle";

const c = TrailContent.parse({});
const at = (now: number) => ({ now });

describe("Snow Trail", () => {
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

  it("S16-AC4: half the points for solving, up to half more for speed; it gives up after 3 minutes", () => {
    const s = trail.create(c, 5, at(0));
    const { path } = makePuzzle(6, 8, 5);
    expect(trail.view(s, c, at(1000))).toMatchObject({ kind: "playing", size: 6 });
    expect(trail.move(s, c, { type: "solve", path: path.slice(0, 10) }, at(1000)).ok).toBe(false);
    const fast = trail.move(s, c, { type: "solve", path }, at(15_000));
    if (!fast.ok) throw new Error(fast.message);
    expect(trail.score(fast.state, 100)).toBe(100);
    const slow = trail.move(s, c, { type: "solve", path }, at(70_000));
    if (!slow.ok) throw new Error(slow.message);
    expect(trail.score(slow.state, 100)).toBe(75);
    expect(trailShare(200_000)).toBe(0.5);
    const timedOut = trail.tick(s, c, at(181_000));
    expect(trail.isOver(timedOut)).toBe(true);
    expect(trail.score(timedOut, 100)).toBe(0);
    expect(trail.instructions(c).lines[0]).toMatch(/every square/);
  });
});
