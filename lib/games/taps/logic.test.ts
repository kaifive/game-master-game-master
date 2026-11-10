import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, taps, TapsContent } from "./logic";

const c = TapsContent.parse({});
const at = (now: number) => ({ now });

describe("Tap Masher", () => {
  it("S16-AC1: defaults to 5 seconds; the instructions don't give away the top score", () => {
    const lines = taps.instructions(c).lines.join(" ");
    expect(lines).toMatch(/5 seconds/);
    expect(lines).not.toMatch(/50/);
  });

  it("S16-AC3: the countdown starts with the game; 50 taps scores all, and the impossible is refused", () => {
    const s = taps.create(c, 1, at(0));
    expect(taps.view(s, c, at(1000))).toMatchObject({
      kind: "running",
      goInMs: COUNTDOWN_MS - 1000,
    });
    expect(taps.move(s, c, { type: "finish", taps: 20 }, at(4000)).ok).toBe(false); // too early
    expect(taps.move(s, c, { type: "finish", taps: 101 }, at(8000)).ok).toBe(false); // > 20/s
    const done = taps.move(s, c, { type: "finish", taps: 30 }, at(8000));
    if (!done.ok) throw new Error(done.message);
    expect(taps.score(done.state, 100)).toBe(60);
    const max = taps.move(s, c, { type: "finish", taps: 70 }, at(8000));
    if (!max.ok) throw new Error(max.message);
    expect(taps.score(max.state, 100)).toBe(100);
    expect(taps.isOver(taps.tick(s, c, at(60_000)))).toBe(true);
  });
});
