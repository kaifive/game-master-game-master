import { describe, expect, it } from "vitest";
import { seededRandom } from "../random";
import { NOVA_LOGO } from "./nova-logo";
import { drawShare, matchOf, rasterize, type Point } from "./score";

const N = NOVA_LOGO.size;
/** The reference itself as strokes: each edge square as a dot. */
const asDots = (cells: number[], jitter = 0, seed = 1): Point[][] => {
  const r = seededRandom(seed);
  return cells.map((c) => [
    [(c % N) + (r() - 0.5) * jitter, Math.floor(c / N) + (r() - 0.5) * jitter],
  ]);
};
const circle = (cx: number, cy: number, radius: number, points = 120): Point[] =>
  Array.from({ length: points + 1 }, (_, i) => [
    cx + radius * Math.cos((i / points) * 2 * Math.PI),
    cy + radius * Math.sin((i / points) * 2 * Math.PI),
  ]);

describe("Quick Draw's judge", () => {
  it("S18-AC4: size and position don't matter: a smaller, shifted copy matches like the original", () => {
    const original = matchOf(asDots(NOVA_LOGO.edges), NOVA_LOGO);
    const moved = asDots(NOVA_LOGO.edges).map((s) =>
      s.map(([x, y]) => [x * 0.5 + 100, y * 0.5 + 7] as Point),
    );
    expect(original).toBeGreaterThan(0.95);
    expect(Math.abs(matchOf(moved, NOVA_LOGO) - original)).toBeLessThan(0.1);
    expect(rasterize([], N).size).toBe(0);
    expect(matchOf([], NOVA_LOGO)).toBe(0);
  });

  it("S18-AC4: a faithful sketch beats a rough one, which beats a circle alone or a scribble", () => {
    const faithful = drawShare(matchOf(asDots(NOVA_LOGO.edges, 2), NOVA_LOGO));
    const rough = drawShare(
      matchOf(
        asDots(
          NOVA_LOGO.edges.filter((_, i) => i % 3 === 0),
          5,
        ),
        NOVA_LOGO,
      ),
    );
    const ringOnly = drawShare(matchOf([circle(31.5, 31.5, 31)], NOVA_LOGO));
    const r = seededRandom(9);
    const scribble = Math.max(
      ...[400, 40].map((n) =>
        drawShare(
          matchOf([Array.from({ length: n }, () => [r() * 64, r() * 64] as Point)], NOVA_LOGO),
        ),
      ),
    );
    expect(faithful).toBeGreaterThan(0.85);
    // A hand-drawn take: stretched, tilted, wobbly, half the lines. It should still score well.
    const warped = NOVA_LOGO.edges
      .filter((_, i) => i % 2 === 0)
      .map((c, i): Point[] => {
        const [x, y] = [((c % N) - 32) * 1.15, (Math.floor(c / N) - 32) * 0.92];
        const wobble = Math.sin(i) * 2;
        return [[32 + x * 0.99 - y * 0.14 + wobble, 32 + x * 0.14 + y * 0.99 - wobble]];
      });
    expect(drawShare(matchOf(warped, NOVA_LOGO))).toBeGreaterThan(0.7);
    expect(rough).toBeGreaterThan(ringOnly);
    expect(rough).toBeGreaterThan(scribble);
    expect(ringOnly).toBeLessThan(0.2);
    expect(scribble).toBeLessThan(0.2);
    expect(rough).toBeGreaterThan(0.4);
  });
});
