import { describe, expect, it } from "vitest";
import { draw, DrawContent, GRACE_MS } from "./logic";
import { NOVA_LOGO } from "./nova-logo";
import type { Point } from "./score";

const c = DrawContent.parse({});
const at = (now: number) => ({ now });
const logoStrokes: Point[][] = NOVA_LOGO.edges.map((e) => [
  [(e % 64) / 63, Math.floor(e / 64) / 63],
]);

describe("Quick Draw", () => {
  it("S18-AC3: one drawing in 30 seconds, judged on the server; a run left unsent ends at 0", () => {
    expect(draw.instructions(c).lines.join(" ")).toMatch(/Nova Wushu logo.*30 seconds/);
    expect(draw.once).toBe(true);
    const started = draw.move(draw.create(c, 1, at(0)), c, { type: "start" }, at(0));
    if (!started.ok) throw new Error(started.message);
    expect(draw.view(started.state, c, at(10_000))).toMatchObject({
      kind: "drawing",
      msLeft: 20_000,
    });
    expect(draw.move(started.state, c, { type: "submit", strokes: [[[2, 0]]] }, at(1000)).ok).toBe(
      false,
    );
    const done = draw.move(started.state, c, { type: "submit", strokes: logoStrokes }, at(20_000));
    if (!done.ok) throw new Error(done.message);
    expect(draw.score(done.state, 100)).toBeGreaterThan(90);
    expect(draw.view(done.state, c, at(0))).toMatchObject({ kind: "done" });
    expect(draw.move(done.state, c, { type: "submit", strokes: logoStrokes }, at(21_000)).ok).toBe(
      false,
    );
    const late = draw.tick(started.state, c, at(30_000 + GRACE_MS + 1));
    expect(draw.isOver(late)).toBe(true);
    expect(draw.score(late, 100)).toBe(0);
  });
});
