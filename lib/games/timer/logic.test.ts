import { describe, expect, it } from "vitest";
import { timer, timerShare, TimerContent } from "./logic";

const c = TimerContent.parse({});
const at = (now: number) => ({ now });

describe("T-Timer", () => {
  it("S16-AC1: content defaults to 10 s with 3 s visible, and instructions say so", () => {
    expect(timer.instructions(c).lines.join(" ")).toMatch(/3 seconds.*exactly 10 seconds/);
    expect(TimerContent.safeParse({ targetSeconds: 5, visibleSeconds: 6 }).success).toBe(false);
  });

  it("S16-AC2: scores by how close the stop is; the server refuses an impossible time", () => {
    let s = timer.create(c, 1, at(0));
    expect(timer.view(s, c, at(0))).toMatchObject({ kind: "ready", visibleSeconds: 3 });
    const started = timer.move(s, c, { type: "start" }, at(1000));
    if (!started.ok) throw new Error(started.message);
    s = started.state;
    expect(timer.view(s, c, at(3000))).toMatchObject({ kind: "running", elapsedMs: 2000 });
    expect(timer.move(s, c, { type: "stop", elapsedMs: 10_000 }, at(5000)).ok).toBe(false);
    const stopped = timer.move(s, c, { type: "stop", elapsedMs: 10_030 }, at(11_100));
    if (!stopped.ok) throw new Error(stopped.message);
    expect(timer.isOver(stopped.state)).toBe(true);
    expect(timer.score(stopped.state, 100)).toBe(100);
    expect(timer.view(stopped.state, c, at(12_000))).toMatchObject({ kind: "done", offMs: 30 });
    expect(timerShare(1025)).toBeCloseTo(0.5, 2);
    expect(timerShare(2500)).toBe(0);
  });

  it("S16-AC2: a slow network can't shave time, and a run left running times out at 0", () => {
    const s = timer.move(timer.create(c, 1, at(0)), c, { type: "start" }, at(0));
    if (!s.ok) throw new Error(s.message);
    // Claims 10.0 s but the server saw 14 s: it counts at least 12.5 s.
    const late = timer.move(s.state, c, { type: "stop", elapsedMs: 10_000 }, at(14_000));
    if (!late.ok) throw new Error(late.message);
    expect(late.state.elapsedMs).toBe(12_500);
    const timedOut = timer.tick(s.state, c, at(30_000));
    expect(timer.isOver(timedOut)).toBe(true);
    expect(timer.score(timedOut, 100)).toBe(0);
    expect(timer.tick(s.state, c, at(5000))).toBe(s.state);
  });
});
