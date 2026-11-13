import { describe, expect, it } from "vitest";
import { jar, JarContent, jarShare } from "./logic";

const c = JarContent.parse({});
const at = { now: 0 };

describe("Guessing Jar", () => {
  it("S17-AC1: content has a default prompt and validates its picture", () => {
    expect(jar.instructions(c).lines[0]).toBe("How many candies are in the jar?");
    expect(JarContent.safeParse({ image: { src: "nope", alt: "" } }).success).toBe(false);
  });

  it("S17-AC2: one whole-number guess, final, waiting for the reveal, and no replays", () => {
    const s = jar.create(c, 1, at);
    expect(jar.view(s, c, at)).toMatchObject({ kind: "guess" });
    expect(jar.move(s, c, { type: "guess", value: 2.5 }, at).ok).toBe(false);
    const guessed = jar.move(s, c, { type: "guess", value: 340 }, at);
    if (!guessed.ok) throw new Error(guessed.message);
    expect(jar.isOver(guessed.state)).toBe(true);
    expect(jar.waiting?.(guessed.state)).toBe(true);
    expect(jar.score(guessed.state, 100)).toBe(0);
    expect(jar.move(guessed.state, c, { type: "guess", value: 341 }, at).ok).toBe(false);
    expect(jar.view(guessed.state, c, at)).toMatchObject({
      kind: "done",
      guess: 340,
      actual: null,
    });
    expect(jar.once).toBe(true);
  });

  it("S17-AC3: all points when exact, 2 fewer per 1% off, never below a third", () => {
    expect(jarShare(312, 312)).toBe(1);
    expect(jarShare(330, 300)).toBeCloseTo(0.8);
    expect(jarShare(270, 300)).toBeCloseTo(0.8);
    expect(jarShare(150, 300)).toBe(0.33);
    expect(jarShare(900, 300)).toBe(0.33);
    expect(jarShare(0, 0)).toBe(1);
    expect(jarShare(3, 0)).toBe(0.33);
  });
});
