import { describe, expect, it } from "vitest";
import { cache, CacheContent, LOCK_MS, MAX_MISSES } from "./logic";

const c = CacheContent.parse({
  caches: [
    { id: "c1", label: "By the door", code: "SNOW1" },
    { id: "c2", label: "Under the table", code: "holly-2" },
  ],
});
const at = (now: number) => ({ now });
const play = (s: ReturnType<typeof cache.create>, code: string, now = 0) => {
  const r = cache.move(s, c, { type: "code", code }, at(now));
  if (!r.ok) throw new Error(r.message);
  return r.state;
};

describe("Geocache", () => {
  it("S17-AC1: codes are unique, and phones never see codes or unfound spots", () => {
    expect(
      CacheContent.safeParse({
        caches: [
          { id: "a", label: "x", code: "SNOW1" },
          { id: "b", label: "y", code: "snow-1" },
        ],
      }).success,
    ).toBe(false);
    const view = JSON.stringify(cache.view(cache.create(c, 1, at(0)), c, at(0)));
    expect(view).not.toMatch(/SNOW1|HOLLY|By the door|Under the table/i);
  });

  it("S17-AC4: a right code scores its share once; found or wrong codes say so", () => {
    let s = cache.create(c, 1, at(0));
    s = play(s, " snow 1 ");
    expect(s.last).toBe("found");
    expect(cache.score(s, 100)).toBe(50);
    expect(cache.view(s, c, at(0))).toMatchObject({
      kind: "hunting",
      found: [{ label: "By the door" }],
    });
    s = play(s, "SNOW1");
    expect(s.last).toBe("again");
    expect(cache.score(s, 100)).toBe(50);
    s = play(s, "NOPE");
    expect(s.last).toBe("wrong");
    s = play(s, "HOLLY2");
    expect(cache.isOver(s)).toBe(true);
    expect(cache.score(s, 100)).toBe(100);
    expect(cache.progressive).toBe(true);
    expect(cache.once).toBe(true);
  });

  it("S17-AC4: five wrong codes in a row make the box wait 30 seconds", () => {
    let s = cache.create(c, 1, at(0));
    for (let i = 0; i < MAX_MISSES; i++) s = play(s, `BAD${String(i)}`, 1000);
    expect(s.last).toBe("locked");
    expect(cache.view(s, c, at(1000)).lockedForMs).toBe(LOCK_MS);
    s = play(s, "SNOW1", 2000);
    expect(s.found).toEqual([]); // still waiting, even for a right code
    s = play(s, "SNOW1", 1000 + LOCK_MS + 1);
    expect(s.found).toEqual(["c1"]);
  });
});
