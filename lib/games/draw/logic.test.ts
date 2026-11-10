import { describe, expect, it } from "vitest";
import { draw, DrawContent } from "./logic";
import { NOVA_LOGO } from "./nova-logo";
import type { Point } from "./score";

const c = DrawContent.parse({});
const at = (now: number) => ({ now });
const logoStrokes: Point[][] = NOVA_LOGO.edges.map((e) => [
  [(e % 64) / 63, Math.floor(e / 64) / 63],
]);

describe("Quick Draw", () => {
  it("S18-AC3: one untimed drawing, judged on the server, and no replays", () => {
    expect(draw.instructions(c).lines.join(" ")).toMatch(/Nova Wushu logo.*no rush/);
    expect(draw.once).toBe(true);
    const s = draw.create(c, 1, at(0));
    expect(draw.view(s, c, at(0))).toEqual({
      kind: "drawing",
      prompt: "Draw the Nova Wushu logo from memory",
    });
    // No clock: even an hour later, it's still waiting.
    expect(draw.tick(s, c, at(3_600_000))).toBe(s);
    expect(draw.move(s, c, { type: "submit", strokes: [] }, at(1000)).ok).toBe(false);
    expect(draw.move(s, c, { type: "submit", strokes: [[[2, 0]]] }, at(1000)).ok).toBe(false);
    const done = draw.move(s, c, { type: "submit", strokes: logoStrokes }, at(600_000));
    if (!done.ok) throw new Error(done.message);
    expect(draw.score(done.state, 100)).toBeGreaterThan(90);
    expect(draw.view(done.state, c, at(0))).toMatchObject({ kind: "done" });
    expect(draw.move(done.state, c, { type: "submit", strokes: logoStrokes }, at(0)).ok).toBe(
      false,
    );
  });
});
