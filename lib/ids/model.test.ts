import { describe, expect, test } from "vitest";
import { EntityId, Slug } from "./model";

describe("Slug", () => {
  test.each(["holiday-2026", "a", "wushu-party-2"])("accepts %s", (s) => {
    expect(Slug.parse(s)).toBe(s);
  });

  test.each(["", "Holiday", "has space", "a/b", "a.b", "-a", "a-", "a--b", "x".repeat(41)])(
    "rejects %j",
    (s) => {
      expect(Slug.safeParse(s).success).toBe(false);
    },
  );
});

describe("EntityId", () => {
  test.each(["abc", "A1_b-2", "x".repeat(64)])("accepts %s", (s) => {
    expect(EntityId.parse(s)).toBe(s);
  });

  test.each(["", "a/b", "a.b", "a b", "$x", "#", "[x]", "x".repeat(65)])("rejects %j", (s) => {
    expect(EntityId.safeParse(s).success).toBe(false);
  });
});
