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
    expect(colorShare(26.5)).toBeCloseTo(0.5, 2);
    expect(colorShare(80)).toBe(0);
    // A near purple scores well; a green, nothing.
    expect(colorShare(colorDistance("#8A307F", "#882E7E"))).toBe(1);
    expect(colorShare(colorDistance("#9A3A90", "#882E7E"))).toBeGreaterThan(0.7);
    expect(colorShare(colorDistance("#20C040", "#882E7E"))).toBe(0);
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
