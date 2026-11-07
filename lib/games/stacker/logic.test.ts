import { describe, expect, it } from "vitest";
import { barStart, speedFor, trim } from "./engine";
import { stacker, StackerContent } from "./logic";

const c = StackerContent.parse({});
const at = (now: number) => ({ now });

describe("Stack Attack", () => {
  it("S16-AC5: a stopped bar is trimmed to the one below; a complete miss ends it", () => {
    expect(trim(null, { start: 2, length: 3 })).toEqual({ start: 2, length: 3 });
    expect(trim({ start: 2, length: 3 }, { start: 3, length: 3 })).toEqual({ start: 3, length: 2 });
    expect(trim({ start: 2, length: 3 }, { start: 0, length: 2 })).toBeNull();
    // The bar bounces between the edges, faster as it climbs.
    expect(barStart(7, 3, 0, 0)).toBe(0);
    expect(barStart(7, 3, 0, 1000)).toBe(4);
    expect(barStart(7, 3, 0, 1500)).toBe(2);
    expect(speedFor(5)).toBeGreaterThan(speedFor(0));
  });

  it("S16-AC5: scores by rows stacked; a count too high or too fast is refused", () => {
    expect(stacker.instructions(c).lines.join(" ")).toMatch(/up to 12/);
    const started = stacker.move(stacker.create(c, 1, at(0)), c, { type: "start" }, at(0));
    if (!started.ok) throw new Error(started.message);
    expect(stacker.move(started.state, c, { type: "finish", rows: 13 }, at(60_000)).ok).toBe(false);
    expect(stacker.move(started.state, c, { type: "finish", rows: 12 }, at(100)).ok).toBe(false);
    const done = stacker.move(started.state, c, { type: "finish", rows: 6 }, at(20_000));
    if (!done.ok) throw new Error(done.message);
    expect(stacker.score(done.state, 100)).toBe(50);
    expect(stacker.view(done.state, c, at(0))).toEqual({ kind: "done", stacked: 6, rows: 12 });
  });
});
