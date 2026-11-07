import { describe, expect, it } from "vitest";
import { COUNTDOWN_MS, taps, TapsContent } from "./logic";

const c = TapsContent.parse({});
const at = (now: number) => ({ now });

describe("Tap Masher", () => {
  it("S16-AC1: defaults to 5 seconds and 45 taps for all the points", () => {
    expect(taps.instructions(c).lines.join(" ")).toMatch(/5 seconds.*45 taps/);
  });

  it("S16-AC3: counts taps after the countdown, scales to the target, and refuses the impossible", () => {
    const started = taps.move(taps.create(c, 1, at(0)), c, { type: "start" }, at(0));
    if (!started.ok) throw new Error(started.message);
    const s = started.state;
    expect(taps.view(s, c, at(1000))).toMatchObject({
      kind: "running",
      goInMs: COUNTDOWN_MS - 1000,
    });
    expect(taps.move(s, c, { type: "finish", taps: 20 }, at(4000)).ok).toBe(false); // too early
    expect(taps.move(s, c, { type: "finish", taps: 101 }, at(8000)).ok).toBe(false); // > 20/s
    const done = taps.move(s, c, { type: "finish", taps: 30 }, at(8000));
    if (!done.ok) throw new Error(done.message);
    expect(taps.score(done.state, 100)).toBe(67);
    const max = taps.move(s, c, { type: "finish", taps: 60 }, at(8000));
    if (!max.ok) throw new Error(max.message);
    expect(taps.score(max.state, 100)).toBe(100);
    expect(taps.isOver(taps.tick(s, c, at(60_000)))).toBe(true);
  });
});
