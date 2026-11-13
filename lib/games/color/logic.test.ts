import { describe, expect, it } from "vitest";
import { color, ColorContent, colorDistance, colorShare, toHex } from "./logic";

const c = ColorContent.parse({
  target: "#882e7e",
  prompt: "Pick the color of the Nova Wushu logo",
});
const at = { now: 0 };

describe("Color Matcher", () => {
  it("S18-AC1: content needs a real target color; the phone never sees it before picking", () => {
    expect(ColorContent.safeParse({ target: "purple" }).success).toBe(false);
    const s = color.create(c, 1, at);
    expect(JSON.stringify(color.view(s, c, at))).not.toMatch(/882E7E/i);
    expect(color.instructions(c).lines[0]).toBe("Pick the color of the Nova Wushu logo.");
  });

  it("S18-AC2: scores by how close the color looks, once per run", () => {
    expect(colorDistance("#882E7E", "#882E7E")).toBe(0);
    expect(colorShare(0)).toBe(1);
    expect(colorShare(0.27)).toBeCloseTo(0.5, 2);
    expect(colorShare(0.6)).toBe(0);
    // A near purple scores well; a green, nothing.
    expect(colorShare(colorDistance("#8A307F", "#882E7E"))).toBe(1);
    expect(colorShare(colorDistance("#20C040", "#882E7E"))).toBe(0);
    // Each control counts the same (Khai, 2026-11-13): a quarter off on
    // strength or on brightness lands near half the points, and a neon
    // magenta no longer beats a slightly-too-light purple.
    const share = (hex: string) => colorShare(colorDistance(hex, "#882E7E"));
    const hsv = (h: number, s: number, v: number) => {
      const f = (n: number) => {
        const k = (n + h / 60) % 6;
        return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
      };
      return toHex([f(5), f(3), f(1)]);
    };
    const [H, S, V] = [306.7, 0.662, 0.533];
    expect(share(hsv(H, S + 0.25, V))).toBeGreaterThan(0.4);
    expect(share(hsv(H, S + 0.25, V))).toBeLessThan(0.6);
    expect(share(hsv(H, S, V + 0.25))).toBeGreaterThan(0.4);
    expect(share(hsv(H, S, V + 0.25))).toBeLessThan(0.6);
    expect(share(hsv(H, 1, V))).toBeLessThan(share(hsv(H, S, V + 0.15)));
    expect(share(hsv(H + 10, S, V))).toBeGreaterThan(0.75);
    expect(share(hsv(H + 45, S, V))).toBeLessThan(0.1);
    for (const far of ["#5C5C5C", "#FF1493", "#22AA44"]) expect(share(far)).toBeLessThan(0.1);
    const s = color.create(c, 1, at);
    expect(color.move(s, c, { type: "pick", color: "red" }, at).ok).toBe(false);
    const picked = color.move(s, c, { type: "pick", color: "#8a307f" }, at);
    if (!picked.ok) throw new Error(picked.message);
    expect(color.isOver(picked.state)).toBe(true);
    expect(color.score(picked.state, 100)).toBe(100);
    expect(color.view(picked.state, c, at)).toEqual({
      kind: "done",
      picked: "#8A307F",
      target: "#882E7E",
      match: 100,
    });
    expect(color.move(picked.state, c, { type: "pick", color: "#000000" }, at).ok).toBe(false);
    expect(toHex([136, 46, 126])).toBe("#882E7E");
    // A replayable event keeps the target back.
    expect(color.view(picked.state, c, { now: 0, replayable: true })).toMatchObject({
      target: null,
    });
  });
});
