import { describe, expect, test } from "vitest";
import { ADMIN_THEME, PACKS, resolveTheme } from "@/lib/themes";
import { MOMENT_KINDS, MOTION_TOKENS } from "./model";
import {
  barShare,
  countUpValue,
  easeOut,
  emptyStage,
  emptyToasts,
  finishStage,
  flipDelta,
  laneFor,
  parseDuration,
  pushStage,
  pushToast,
  tickToasts,
  TOAST_LIMIT,
  TOAST_MS,
} from "./rules";

const moment = (id: string, kind: (typeof MOMENT_KINDS)[number] = "lead-change") => ({
  id,
  kind,
  text: id,
});

describe("S14-AC1: every pack and the admin theme define every motion token", () => {
  const sets = [
    ...Object.values(PACKS).flatMap((p) =>
      [undefined, ...Object.keys(p.variants)].flatMap((v) =>
        (["light", "dark"] as const).map(
          (m) => [`${p.id}/${v ?? "base"}/${m}`, resolveTheme(p, v, m).tokens] as const,
        ),
      ),
    ),
    ["admin/light", ADMIN_THEME.light] as const,
    ["admin/dark", ADMIN_THEME.dark] as const,
  ];
  test.each(sets)("%s", (_name, tokens) => {
    expect(MOTION_TOKENS.filter((t) => !(t in tokens))).toEqual([]);
    expect(parseDuration(tokens["motion-base"]!)).toBeGreaterThan(0);
  });

  test("parseDuration reads ms and s", () => {
    expect(parseDuration("300ms")).toBe(300);
    expect(parseDuration("1.2s")).toBe(1200);
    expect(parseDuration("nope")).toBe(0);
  });
});

describe("S14-AC2: FLIP deltas move an item from its old place to its new one", () => {
  test("the delta is old position minus new position", () => {
    expect(flipDelta({ left: 0, top: 200 }, { left: 0, top: 50 })).toEqual({ dx: 0, dy: 150 });
    expect(flipDelta({ left: 10, top: 0 }, { left: 10, top: 0 })).toEqual({ dx: 0, dy: 0 });
  });
});

describe("S14-AC3: count-up math", () => {
  test("starts at the old value and ends exactly on the new one", () => {
    expect(countUpValue(100, 250, 0)).toBe(100);
    expect(countUpValue(100, 250, 1)).toBe(250);
    expect(countUpValue(100, 250, 1.4)).toBe(250);
  });
  test("moves fast first and settles (ease-out), in whole numbers", () => {
    const mid = countUpValue(0, 1000, 0.5);
    expect(mid).toBeGreaterThan(500);
    expect(Number.isInteger(mid)).toBe(true);
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
  });
  test("counts down too", () => {
    expect(countUpValue(500, 300, 1)).toBe(300);
    expect(countUpValue(500, 300, 0.5)).toBeLessThan(500);
  });
});

describe("S14-AC4: bar shares", () => {
  test("a bar is its share of the top score, with a visible sliver for zero", () => {
    expect(barShare(1840, 1840)).toBe(1);
    expect(barShare(920, 1840)).toBe(0.5);
    expect(barShare(0, 1840)).toBe(0.04);
    expect(barShare(0, 0)).toBe(0.04);
  });
});

describe("S14-AC6: the toast chain", () => {
  const toast = (id: string) => ({ id, text: id });

  test("shows at most four, newest first; extras wait", () => {
    let s = emptyToasts();
    for (const id of ["a", "b", "c", "d", "e"]) s = pushToast(s, toast(id));
    expect(s.visible.map((t) => t.id)).toEqual(["d", "c", "b", "a"]);
    expect(s.waiting.map((t) => t.id)).toEqual(["e"]);
    expect(TOAST_LIMIT).toBe(4);
  });

  test("each toast leaves after about five seconds and the next one comes in", () => {
    let s = emptyToasts();
    for (const id of ["a", "b", "c", "d", "e"]) s = pushToast(s, toast(id));
    s = tickToasts(s, TOAST_MS - 1, false);
    expect(s.visible).toHaveLength(4);
    s = tickToasts(s, 1, false);
    expect(s.visible.map((t) => t.id)).toEqual(["e"]);
    s = tickToasts(s, TOAST_MS, false);
    expect(s.visible).toEqual([]);
  });

  test("time doesn't pass while a stage moment plays", () => {
    let s = pushToast(emptyToasts(), toast("a"));
    s = tickToasts(s, TOAST_MS * 3, true);
    expect(s.visible.map((t) => t.id)).toEqual(["a"]);
  });
});

describe("S14-AC7: stage moments play one at a time, in order", () => {
  test("the first plays at once; later ones wait in arrival order", () => {
    let s = emptyStage();
    s = pushStage(s, moment("lead"));
    s = pushStage(s, moment("right", "judged-right"));
    s = pushStage(s, moment("phase", "phase-change"));
    expect(s.current?.id).toBe("lead");
    s = finishStage(s);
    expect(s.current?.id).toBe("right");
    s = finishStage(s);
    s = finishStage(s);
    expect(s).toEqual(emptyStage());
  });
});

describe("moment lanes", () => {
  test("on the TV, finished games are toasts and lead changes take the stage", () => {
    expect(laneFor("game-finished", "display")).toBe("toast");
    expect(laneFor("lead-change", "display")).toBe("stage");
  });
  test("on a phone, finishing a game takes the stage", () => {
    expect(laneFor("game-finished", "player")).toBe("stage");
    expect(laneFor("rank-change", "player")).toBe("toast");
  });
  test("every kind has a lane on both surfaces", () => {
    for (const k of MOMENT_KINDS) {
      expect(["toast", "stage"]).toContain(laneFor(k, "display"));
      expect(["toast", "stage"]).toContain(laneFor(k, "player"));
    }
  });
});
