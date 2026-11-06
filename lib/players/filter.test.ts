import { describe, expect, it } from "vitest";
import { isBlockedName } from "./filter";

describe("isBlockedName", () => {
  it("S02-AC5: blocks listed words anywhere in the name", () => {
    for (const name of ["shit", "Bullshit", "BigShitter", "fuck", "MotherFucker"])
      expect(isBlockedName(name), name).toBe(true);
  });

  it("S02-AC5: sees through look-alikes, separators, repeats and accents", () => {
    for (const name of [
      "sh1t",
      "$hit",
      "5h!t",
      "s.h.i.t",
      "s h i t",
      "shiiiit",
      "shït",
      "SHIT",
      "f_u_c_k",
    ])
      expect(isBlockedName(name), name).toBe(true);
  });

  it("S02-AC5: blocks short words only as whole words", () => {
    expect(isBlockedName("Big Ass")).toBe(true);
    expect(isBlockedName("a$$")).toBe(true);
    for (const name of [
      "Cassie",
      "Glass",
      "Dickens",
      "Hancock",
      "Grapes",
      "Analise",
      "Sussex",
      "Titan",
      "Shoe",
    ])
      expect(isBlockedName(name), name).toBe(false);
  });

  it("S02-AC5: lets ordinary names through", () => {
    for (const name of [
      "Mai",
      "Khải",
      "Coach Le",
      "Uncle Bao",
      "DJ Snow",
      "李小龙",
      "Peacock",
      "Scott",
    ])
      expect(isBlockedName(name), name).toBe(false);
  });

  it("S02-AC5: applies the event's own words, normalized the same way", () => {
    expect(isBlockedName("The Gr1nch", ["grinch"])).toBe(true);
    expect(isBlockedName("Mai", ["grinch"])).toBe(false);
  });
});
