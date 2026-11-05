import { describe, expect, test } from "vitest";
import { defineBuilder } from "./define-builder";

type Thing = { id: string; name: string; tags: string[]; points: number };

const aThing = defineBuilder<Thing>((n) => ({
  id: `thing-${n}`,
  name: "Mai",
  tags: [],
  points: 0,
}));

describe("defineBuilder", () => {
  test("builds an object from the defaults", () => {
    aThing.reset();
    expect(aThing()).toEqual({ id: "thing-1", name: "Mai", tags: [], points: 0 });
  });

  test("applies overrides on top of the defaults", () => {
    expect(aThing({ points: 100, name: "Khai" })).toMatchObject({ points: 100, name: "Khai" });
  });

  test("gives each object a new sequence number", () => {
    aThing.reset();
    expect([aThing().id, aThing().id, aThing().id]).toEqual(["thing-1", "thing-2", "thing-3"]);
  });

  test("returns fresh objects so tests can't leak state into each other", () => {
    const a = aThing();
    a.tags.push("changed");
    expect(aThing().tags).toEqual([]);
  });

  test("keeps a separate sequence per builder", () => {
    const anOther = defineBuilder<{ id: string }>((n) => ({ id: `other-${n}` }));
    aThing.reset();
    aThing();
    expect(anOther().id).toBe("other-1");
  });

  test("builds many at once", () => {
    aThing.reset();
    expect(aThing.many(2, { points: 5 })).toEqual([
      { id: "thing-1", name: "Mai", tags: [], points: 5 },
      { id: "thing-2", name: "Mai", tags: [], points: 5 },
    ]);
  });
});
