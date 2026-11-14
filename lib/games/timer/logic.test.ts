import { describe, expect, it } from "vitest";
import { offWindow, timer, timerShare, TimerContent } from "./logic";

const c = TimerContent.parse({});
const at = (now: number) => ({ now });
const started = (now = 0) => timer.create(c, 1, at(now));

describe("T-Timer", () => {
  it("S16-AC1: content defaults to a 1.20–1.25 s window, and the instructions say so", () => {
    const lines = timer.instructions(c).lines.join(" ");
    expect(lines).toMatch(/between 1\.20 and 1\.25 seconds/);
    expect(lines).not.toMatch(/hides/);
    expect(TimerContent.safeParse({ fromSeconds: 2, toSeconds: 1.5 }).success).toBe(false);
    expect(TimerContent.safeParse({ targetSeconds: 7 }).success).toBe(false);
  });

  it("S16-AC2: the clock starts with the game and always shows; full points inside the window, none 0.5 s outside", () => {
    const s = started(1000);
    expect(timer.view(s, c, at(2000))).toMatchObject({
      kind: "running",
      elapsedMs: 1000,
      fromSeconds: 1.2,
      toSeconds: 1.25,
    });
    expect(timer.move(s, c, { type: "stop", elapsedMs: 3000 }, at(1500)).ok).toBe(false);
    const stopped = timer.move(s, c, { type: "stop", elapsedMs: 1230 }, at(2300));
    if (!stopped.ok) throw new Error(stopped.message);
    expect(timer.isOver(stopped.state)).toBe(true);
    expect(timer.score(stopped.state, 100)).toBe(100);
    expect(timer.view(stopped.state, c, at(3000))).toMatchObject({
      kind: "done",
      elapsedMs: 1230,
      offMs: 0,
    });
    // Both edges count as in; outside, the points fall off to none at 0.5 s away.
    expect(offWindow(1200, 1200, 1250)).toBe(0);
    expect(offWindow(1250, 1200, 1250)).toBe(0);
    expect(offWindow(1100, 1200, 1250)).toBe(100);
    expect(offWindow(1400, 1200, 1250)).toBe(150);
    expect(timerShare(0)).toBe(1);
    expect(timerShare(100)).toBeCloseTo(0.8);
    expect(timerShare(500)).toBe(0);
    expect(timerShare(900)).toBe(0);
  });

  it("S16-AC2: a slow network can't shave time, and a run left running times out at 0", () => {
    const s = started(0);
    // Claims 1.22 s but the server saw 4 s: it counts at least 2.5 s.
    const late = timer.move(s, c, { type: "stop", elapsedMs: 1220 }, at(4000));
    if (!late.ok) throw new Error(late.message);
    expect(late.state.elapsedMs).toBe(2500);
    expect(timer.score(late.state, 100)).toBe(0);
    const timedOut = timer.tick(s, c, at(30_000));
    expect(timer.isOver(timedOut)).toBe(true);
    expect(timer.score(timedOut, 100)).toBe(0);
    expect(timer.tick(s, c, at(5000))).toBe(s);
  });
});
