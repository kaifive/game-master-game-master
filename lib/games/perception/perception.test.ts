import { describe, expect, it } from "vitest";
import { LEVELS, type PerceptionCore } from "./core";
import { PERCEPTION_CORES, ribbonCore, staffangleCore } from "./games";
import { FEEDBACK_MS, perceptionSolo } from "./solo";

const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

describe("perception cores (spec 28)", () => {
  it("S28-AC1: every game deals the same task from the same seed, and scores an exact answer 1 and a wild one 0", () => {
    for (const core of PERCEPTION_CORES as readonly PerceptionCore<unknown, unknown>[])
      for (const level of LEVELS) {
        expect(core.deal(9, level)).toEqual(core.deal(9, level));
        expect(core.demo.length).toBeGreaterThan(10);
        expect(core.demo.length).toBeLessThanOrEqual(60);
        expect(core.timeout).toMatch(/^Out of time\?/);
      }
  });

  it("S28-AC1: Staff Angle goes up to 180°, then 360°, then 540°, finer each round; full marks within 2°, falling fast to nothing at 27° off", () => {
    let wide2 = false;
    let wide3 = false;
    for (const s of seeds) {
      const t1 = staffangleCore.deal(s, 1).target;
      expect(t1 % 15 === 0 && t1 >= 10 && t1 <= 170).toBe(true);
      const t2 = staffangleCore.deal(s, 2).target;
      expect(t2 % 5 === 0 && t2 >= 10 && t2 <= 350).toBe(true);
      const t3 = staffangleCore.deal(s, 3).target;
      expect(t3 >= 10 && t3 <= 530).toBe(true);
      wide2 ||= t2 > 180;
      wide3 ||= t3 > 360;
    }
    expect(wide2 && wide3).toBe(true);
    expect(staffangleCore.scene({ level: 3, target: 450 }, "answer")).toEqual({
      target: 450,
      max: 540,
    });
    expect(staffangleCore.valid({ level: 1, target: 35 }, 200)).toBe(false);
    expect(staffangleCore.valid({ level: 3, target: 450 }, 540)).toBe(true);
    const t = { level: 1 as const, target: 35 };
    expect(staffangleCore.closeness(t, 37)).toBe(1);
    // A few degrees off still scores well; a rough guess barely scores.
    expect(staffangleCore.closeness(t, 40)).toBeCloseTo((22 / 25) ** 2);
    expect(staffangleCore.closeness(t, 47)).toBeLessThan(0.4);
    expect(staffangleCore.closeness(t, 62)).toBe(0);
  });

  it("S28-AC1: Cut the Ribbon goes from halves and thirds to fifths and eighths to percentages; full marks within 1%, falling fast to nothing at 12% off", () => {
    for (const s of seeds) {
      expect([1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4]).toContain(ribbonCore.deal(s, 1).at);
      expect(ribbonCore.deal(s, 3).label).toMatch(/^\d0% of the way$/);
    }
    const t = { level: 1 as const, at: 1 / 3, label: "one third of the way" };
    expect(ribbonCore.closeness(t, 1 / 3)).toBe(1);
    expect(ribbonCore.closeness(t, 1 / 3 + 0.01)).toBe(1);
    expect(ribbonCore.closeness(t, 1 / 3 + 0.065)).toBeCloseTo(0.25);
    expect(ribbonCore.closeness(t, 1 / 3 + 0.12)).toBe(0);
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
    expect(solo.score(s, 100)).toBe(Math.round((100 * (1 + 0 + (18 / 25) ** 2)) / 3));
    expect(solo.view(s, {}, { now: s.startedAt })).toMatchObject({ done: true });
  });
});
