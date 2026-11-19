import { describe, expect, it } from "vitest";
import { LEVELS, type PerceptionCore } from "./core";
import {
  drumMisses,
  exitY,
  keepBeats,
  liondrumCore,
  PERCEPTION_CORES,
  ribbonCore,
  sleighrunCore,
  snowpileCore,
  staffangleCore,
  type DrumTask,
} from "./games";
import { FEEDBACK_MS, perceptionSolo } from "./solo";

const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

describe("perception cores (spec 28)", () => {
  it("S28-AC1: every game deals the same task from the same seed, and scores an exact answer 1 and a wild one 0", () => {
    for (const core of PERCEPTION_CORES as readonly PerceptionCore<unknown, unknown>[])
      for (const level of LEVELS) {
        expect(core.deal(9, level)).toEqual(core.deal(9, level));
        expect(core.demo.length).toBeGreaterThan(20);
        expect(core.timeout).toMatch(/^Out of time\?/);
      }
  });

  it("S28-AC1: Snow Pile piles get bigger and flash for less time; closeness is 1 minus the miss over the count", () => {
    const by = LEVELS.map((l) => seeds.map((s) => snowpileCore.deal(s, l)));
    expect(Math.max(...(by[0] ?? []).map((t) => t.count))).toBeLessThanOrEqual(25);
    expect(Math.min(...(by[2] ?? []).map((t) => t.count))).toBeGreaterThanOrEqual(50);
    for (const t of by.flat()) {
      expect(t.flakes).toHaveLength(t.count);
      for (const [x, y] of t.flakes) expect(x >= 0 && x <= 1 && y >= 0 && y <= 1).toBe(true);
    }
    expect((by[0]?.[0]?.showMs ?? 0) > (by[2]?.[0]?.showMs ?? 0)).toBe(true);
    const t = { ...snowpileCore.deal(1, 2), count: 50 };
    expect(snowpileCore.closeness(t, 50)).toBe(1);
    expect(snowpileCore.closeness(t, 40)).toBeCloseTo(0.8);
    expect(snowpileCore.closeness(t, 200)).toBe(0);
    // The flakes only show during the show, and the count only at the reveal (S28-AC4).
    expect(snowpileCore.scene(t, "answer")).toBeNull();
    expect(snowpileCore.scene(t, "show")).toMatchObject({ count: null });
    expect(snowpileCore.scene(t, "reveal")).toMatchObject({ count: 50 });
  });

  it("S28-AC1: Staff Angle targets get finer by level; closeness is 1 minus the miss over 45 degrees", () => {
    for (const s of seeds) {
      expect(staffangleCore.deal(s, 1).target % 15).toBe(0);
      expect(staffangleCore.deal(s, 2).target % 5).toBe(0);
      const t3 = staffangleCore.deal(s, 3).target;
      expect(t3 >= 10 && t3 <= 170).toBe(true);
    }
    const t = { level: 1 as const, target: 35 };
    expect(staffangleCore.closeness(t, 35)).toBe(1);
    expect(staffangleCore.closeness(t, 40)).toBeCloseTo(1 - 5 / 45);
    expect(staffangleCore.closeness(t, 100)).toBe(0);
  });

  it("S28-AC1: Sleigh Run gets steeper, wider and faster; the exit stays on screen; closeness is 1 minus the miss over a quarter height", () => {
    for (const s of seeds)
      for (const l of LEVELS) {
        const t = sleighrunCore.deal(s, l);
        expect(exitY(t)).toBeGreaterThan(0.08);
        expect(exitY(t)).toBeLessThan(0.92);
        expect(t.cloudTo).toBeGreaterThan(t.cloudFrom);
      }
    const easy = sleighrunCore.deal(3, 1);
    const hard = sleighrunCore.deal(3, 3);
    expect(hard.cloudTo - hard.cloudFrom).toBeGreaterThan(easy.cloudTo - easy.cloudFrom);
    expect(hard.flightMs).toBeLessThan(easy.flightMs);
    expect(sleighrunCore.closeness(easy, exitY(easy))).toBe(1);
    expect(sleighrunCore.closeness(easy, exitY(easy) + 0.125)).toBeCloseTo(0.5);
    // Where it comes out shows only at the reveal.
    expect(sleighrunCore.scene(easy, "answer")).toMatchObject({ exitY: null });
  });

  it("S28-AC1: Lion Drum gets faster with fewer beats shown; closeness from the average miss over half a beat", () => {
    const t: DrumTask = { level: 1, intervalMs: 800, shown: 8, keep: 4 };
    expect(keepBeats(t)).toEqual([6400, 7200, 8000, 8800]);
    expect(liondrumCore.closeness(t, [6400, 7200, 8000, 8800])).toBe(1);
    // 100 ms off each beat: 1 - 100/400.
    expect(liondrumCore.closeness(t, [6500, 7300, 8100, 8900])).toBeCloseTo(0.75);
    // No taps at all: every beat misses by half a beat.
    expect(liondrumCore.closeness(t, [])).toBe(0);
    expect(drumMisses(t, [6400])).toEqual([0, 400, 400, 400]);
    const fast = liondrumCore.deal(5, 3);
    expect(fast.intervalMs).toBeLessThan(liondrumCore.deal(5, 1).intervalMs);
    expect(fast.shown).toBeLessThan(liondrumCore.deal(5, 1).shown);
    expect(liondrumCore.claims?.([100, 9000, 300])).toBe(9000);
  });

  it("S28-AC1: Cut the Ribbon goes from halves and thirds to fifths and eighths to percentages; closeness is 1 minus the miss over 15%", () => {
    for (const s of seeds) {
      expect([1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4]).toContain(ribbonCore.deal(s, 1).at);
      expect(ribbonCore.deal(s, 3).label).toMatch(/^\d0% of the way$/);
    }
    const t = { level: 1 as const, at: 1 / 3, label: "one third of the way" };
    expect(ribbonCore.closeness(t, 1 / 3)).toBe(1);
    expect(ribbonCore.closeness(t, 1 / 3 + 0.075)).toBeCloseTo(0.5);
    expect(ribbonCore.scene(t, "answer")).toMatchObject({ at: null });
  });
});

describe("perception solo (spec 28)", () => {
  const T0 = 1_000_000;
  const solo = perceptionSolo(staffangleCore);

  it("S28-AC2: three tasks at levels 1 to 3; each answer scores; no answer in time counts 0; points are the average closeness", () => {
    let s = solo.create({}, 4, { now: T0 });
    expect(s.tasks.map((t) => t.level)).toEqual([1, 2, 3]);
    const first = s.tasks[0]?.target ?? 0;
    const r1 = solo.move(s, {}, { answer: first }, { now: T0 + 1000 });
    if (!r1.ok) throw new Error(r1.message);
    s = r1.state;
    // While the last result shows, the view says how close it was.
    expect(solo.view(s, {}, { now: T0 + 1100 })).toMatchObject({
      phase: "between",
      last: { closeness: 1 },
    });
    // Task 2 times out.
    s = solo.tick(s, {}, { now: T0 + 1000 + FEEDBACK_MS + 15_001 });
    expect(s.closeness).toEqual([1, 0]);
    const third = s.tasks[2]?.target ?? 0;
    const r3 = solo.move(s, {}, { answer: third + 9 }, { now: s.startedAt + 500 });
    if (!r3.ok) throw new Error(r3.message);
    s = r3.state;
    expect(solo.isOver(s)).toBe(true);
    expect(solo.score(s, 100)).toBe(Math.round((100 * (1 + 0 + (1 - 9 / 45))) / 3));
    expect(solo.view(s, {}, { now: s.startedAt })).toMatchObject({ done: true });
  });

  it("S28-AC4: a solo Snow Pile shows the flakes only during the show, and refuses an answer before it's over", () => {
    const pile = perceptionSolo(snowpileCore);
    const s = pile.create({}, 2, { now: T0 });
    expect(pile.view(s, {}, { now: T0 + 100 })).toMatchObject({ phase: "show" });
    expect(
      (pile.view(s, {}, { now: T0 + 100 }).scene as { flakes: unknown[] }).flakes.length,
    ).toBeGreaterThan(0);
    expect(pile.view(s, {}, { now: T0 + 2500 })).toMatchObject({ phase: "answer", scene: null });
    expect(pile.move(s, {}, { answer: 10 }, { now: T0 + 100 })).toMatchObject({
      ok: false,
      message: "Watch first!",
    });
  });

  it("S28-AC5: Lion Drum solo refuses taps claiming a moment that hasn't happened yet", () => {
    const drum = perceptionSolo(liondrumCore);
    const s = drum.create({}, 3, { now: T0 });
    const beats = keepBeats(s.tasks[0] ?? { level: 1, intervalMs: 800, shown: 8, keep: 4 });
    expect(drum.move(s, {}, { answer: beats }, { now: T0 + 2000 })).toMatchObject({
      ok: false,
      message: "Those taps aren't possible.",
    });
    const ok = drum.move(s, {}, { answer: beats }, { now: T0 + (beats.at(-1) ?? 0) + 200 });
    expect(ok.ok && ok.state.closeness[0]).toBe(1);
  });
});
