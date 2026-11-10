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
    expect(colorShare(13.5)).toBeCloseTo(0.5, 2);
    expect(colorShare(40)).toBe(0);
    // A near purple scores well; a green, nothing.
    expect(colorShare(colorDistance("#8A307F", "#882E7E"))).toBe(1);
    expect(colorShare(colorDistance("#9A3A90", "#882E7E"))).toBeGreaterThan(0.7);
    expect(colorShare(colorDistance("#20C040", "#882E7E"))).toBe(0);
    // Scores follow what eyes see: a more vivid purple is closer than a bluer
    // one, and grey or hot pink earn next to nothing (S18-AC2, Khai 2026-11-10).
    const share = (hex: string) => colorShare(colorDistance(hex, "#882E7E"));
    expect(share("#A11791")).toBeGreaterThan(share("#6E2F89"));
    expect(share("#842F89")).toBeGreaterThan(0.85);
    expect(share("#AF3CA1")).toBeGreaterThan(0.55);
    expect(share("#AF3CA1")).toBeLessThan(0.8);
    for (const far of ["#5C5C5C", "#FF1493", "#B57EDC"]) expect(share(far)).toBeLessThan(0.1);
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
