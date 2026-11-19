import { describe, expect, it } from "vitest";
import { toHsv } from "../color/logic";
import { dealFormation, FLYBY_ROUNDS } from "../counts";
import { gameLogic } from "../registry";
import { LEVELS } from "./core";
import {
  colorCore,
  colorcountCore,
  flybyCore,
  nearCloseness,
  snowsumCore,
  type FlybyTask,
} from "./counts";

const T0 = 1_000_000;
const rgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

describe("Color Matcher as a showdown (spec 30)", () => {
  it("S30-AC1: deals a color per round from the seed: vivid, then softer, then muted; shown only during the show", () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(colorCore.deal(seed, 1)).toEqual(colorCore.deal(seed, 1));
      const vivid = toHsv(rgb(colorCore.deal(seed, 1).target));
      const muted = toHsv(rgb(colorCore.deal(seed, 3).target));
      expect(vivid.s).toBeGreaterThan(0.8);
      expect(vivid.v).toBeGreaterThan(0.8);
      expect(muted.s).toBeLessThan(0.6);
      expect(muted.v).toBeLessThan(0.75);
    }
    const t = colorCore.deal(3, 2);
    expect(colorCore.scene(t, "show")).toEqual({ color: t.target });
    expect(colorCore.scene(t, "answer")).toBeNull();
    expect(colorCore.showMs(colorCore.deal(3, 1))).toBeGreaterThan(colorCore.showMs(t));
  });
});

describe("the counting games solo (spec 30)", () => {
  it("S30-AC2: Fly-by Count, Snow Sum and Color Count each run solo: three rounds at the showdown's levels, scored by its own rule", () => {
    expect(nearCloseness(12, 12)).toBe(1);
    expect(nearCloseness(11, 12)).toBe(0.5);
    expect(nearCloseness(10, 12)).toBe(0);
    for (const type of ["flyby", "snowsum", "colorcount"]) {
      const logic = gameLogic(type);
      if (!logic) throw new Error(type);
      const c = logic.content.parse({});
      const s = logic.create(c, 5, { now: T0 }) as { tasks: { level: number }[] };
      expect(s.tasks.map((t) => t.level)).toEqual([1, 2, 3]);
    }
    // The solo deal is the showdown's: the same rounds.
    for (const level of LEVELS)
      expect(flybyCore.deal(9, level).count).toBe(
        dealFormation(9, FLYBY_ROUNDS[level - 1] ?? FLYBY_ROUNDS[0]!).count,
      );
    const snow = snowsumCore.deal(4, 3);
    expect(snowsumCore.closeness(snow, snow.total + 1)).toBe(0.5);
    expect(snowsumCore.valid(snow, -51)).toBe(false);
    const cc = colorcountCore.deal(4, 2);
    expect(colorcountCore.closeness(cc, cc.truth)).toBe(1);
    expect(colorcountCore.closeness(cc, cc.truth * 3)).toBe(0);
  });

  it("S30-AC2: points are the game's points times the average closeness; no answer counts 0", () => {
    const logic = gameLogic("flyby");
    if (!logic) throw new Error("flyby");
    const c = logic.content.parse({});
    let s = logic.create(c, 2, { now: T0 }) as never;
    const task = (n: number) => (s as { tasks: FlybyTask[] }).tasks[n] as FlybyTask;
    const answer = (a: number, at: number) => {
      const r = logic.move(s, c, { answer: a }, { now: at });
      if (!r.ok) throw new Error(r.message);
      s = r.state as never;
    };
    answer(task(0).count, T0 + task(0).ms + 100);
    answer(task(1).count + 1, (s as { startedAt: number }).startedAt + task(1).ms + 100);
    s = logic.tick(s, c, { now: (s as { startedAt: number }).startedAt + 60_000 }) as never;
    expect(logic.isOver(s)).toBe(true);
    expect(logic.score(s, 90)).toBe(Math.round((90 * (1 + 0.5 + 0)) / 3));
  });

  it("S30-AC3: nothing that gives the answer away shows outside the show", () => {
    const fly = flybyCore.deal(1, 1);
    expect(flybyCore.scene(fly, "show")).toMatchObject({ cells: fly.cells });
    expect(flybyCore.scene(fly, "answer")).toBeNull();
    expect(flybyCore.scene(fly, "reveal")).toEqual({ count: fly.count });
    const snow = snowsumCore.deal(1, 1);
    expect(snowsumCore.scene(snow, "answer")).toBeNull();
    const cc = colorcountCore.deal(1, 1);
    expect(colorcountCore.scene(cc, "show")).toMatchObject({ ask: null });
    expect(colorcountCore.scene(cc, "answer")).toEqual({ flashes: null, ask: cc.ask });
    const solo = gameLogic("snowsum");
    if (!solo) throw new Error("snowsum");
    const c = solo.content.parse({});
    const s = solo.create(c, 3, { now: T0 });
    // 5 flakes of 1.4 s: at 10 s the flakes are gone and the answer is open.
    expect(solo.view(s, c, { now: T0 + 10_000 })).toMatchObject({ phase: "answer", scene: null });
  });
});
