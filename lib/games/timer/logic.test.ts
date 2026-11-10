import { describe, expect, it } from "vitest";
import { timer, timerShare, TimerContent } from "./logic";

const c = TimerContent.parse({});
const at = (now: number) => ({ now });
const started = (now = 0) => timer.create(c, 1, at(now));

describe("T-Timer", () => {
  it("S16-AC1: content defaults to 7 s with 3 s visible, and instructions say so", () => {
    const lines = timer.instructions(c).lines.join(" ");
    expect(lines).toMatch(/3 seconds.*exactly 7 seconds/);
    expect(lines).not.toMatch(/twentieth/);
    expect(TimerContent.safeParse({ targetSeconds: 5, visibleSeconds: 6 }).success).toBe(false);
  });

  it("S16-AC2: the clock starts with the game; scores by how close the stop is; refuses an impossible time", () => {
    const s = started(1000);
    expect(timer.view(s, c, at(3000))).toMatchObject({
      kind: "running",
      elapsedMs: 2000,
      visibleSeconds: 3,
    });
    expect(timer.move(s, c, { type: "stop", elapsedMs: 7000 }, at(4000)).ok).toBe(false);
    const stopped = timer.move(s, c, { type: "stop", elapsedMs: 7080 }, at(8100));
    if (!stopped.ok) throw new Error(stopped.message);
    expect(timer.isOver(stopped.state)).toBe(true);
    expect(timer.score(stopped.state, 100)).toBe(100);
    expect(timer.view(stopped.state, c, at(9000))).toMatchObject({ kind: "done", offMs: 80 });
    // Forgiving: a second off still earns most of the points; three seconds off, none.
    expect(timerShare(1000)).toBeCloseTo(0.69, 2);
    expect(timerShare(3500)).toBe(0);
  });

  it("S16-AC2: a slow network can't shave time, and a run left running times out at 0", () => {
    const s = started(0);
    // Claims 7.0 s but the server saw 11 s: it counts at least 9.5 s.
    const late = timer.move(s, c, { type: "stop", elapsedMs: 7000 }, at(11_000));
    if (!late.ok) throw new Error(late.message);
    expect(late.state.elapsedMs).toBe(9500);
    const timedOut = timer.tick(s, c, at(30_000));
    expect(timer.isOver(timedOut)).toBe(true);
    expect(timer.score(timedOut, 100)).toBe(0);
    expect(timer.tick(s, c, at(5000))).toBe(s);
  });
});
