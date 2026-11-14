import { describe, expect, it } from "vitest";
import { trail, trailShare, TrailContent } from "./logic";
import { checkPath, dotMarks, facing, makePuzzle, turnToward } from "./puzzle";

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

  it("S16-AC8: a runner shows on the phone and leads the instructions", () => {
    const runner = {
      src: "/danny.png",
      alt: "Danny",
      name: "Danny",
      intro: "Help Danny hit all his jumps!",
    };
    const rc = TrailContent.parse({ runner });
    const s = trail.create(rc, 5, at(0));
    expect(trail.view(s, rc, at(0))).toMatchObject({
      kind: "playing",
      runner: { src: "/danny.png", alt: "Danny" },
    });
    const lines = trail.instructions(rc).lines;
    expect(lines[0]).toBe("Help Danny hit all his jumps!");
    expect(lines[1]).toMatch(/Drag Danny/);
    expect(trail.instructions(c).lines[0]).toMatch(/^Draw one trail/);
    expect(trail.view(trail.create(c, 5, at(0)), c, at(0))).not.toHaveProperty("runner");
  });

  it("S16-AC9: numbers are passed in order, skipped when a later one comes first, idle otherwise", () => {
    // Dots 1, 2, 3 on squares 0, 2, 4.
    const dots = [0, 2, 4];
    expect(dotMarks([], dots)).toEqual(["idle", "idle", "idle"]);
    expect(dotMarks([0, 1, 2], dots)).toEqual(["passed", "passed", "idle"]);
    // Reaching 3 before 2 skips 2; 3 itself doesn't count until the trail is fixed.
    expect(dotMarks([0, 1, 4], dots)).toEqual(["passed", "skipped", "idle"]);
    expect(dotMarks([0, 1, 4, 3, 2], dots)).toEqual(["passed", "skipped", "idle"]);
    // Undo back past the skip and it's grey again.
    expect(dotMarks([0, 1], dots)).toEqual(["passed", "idle", "idle"]);
  });

  it("S16-AC10: the runner faces the last move and turns the short way round", () => {
    expect(facing([], 7)).toBe(0);
    expect(facing([10], 7)).toBe(0);
    expect(facing([10, 11], 7)).toBe(90); // right
    expect(facing([10, 17], 7)).toBe(180); // down
    expect(facing([10, 9], 7)).toBe(270); // left
    expect(facing([10, 3], 7)).toBe(0); // up
    expect(turnToward(90, 0)).toBe(0);
    expect(turnToward(0, 270)).toBe(-90);
    expect(turnToward(-90, 180)).toBe(-180);
    expect(turnToward(270, 0)).toBe(360);
    expect(turnToward(360, 90)).toBe(450);
  });
});
