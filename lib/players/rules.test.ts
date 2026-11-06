import { describe, expect, it } from "vitest";
import { canJoin, checkNickname, cleanNickname, codeMatches, nicknameKey, MESSAGES } from "./rules";

describe("cleanNickname", () => {
  it("S02-AC3: trims and collapses inner spaces", () => {
    expect(cleanNickname("  Mai   Anh \t")).toBe("Mai Anh");
  });
});

describe("checkNickname", () => {
  it("S02-AC3: accepts 2 to 16 characters of letters, numbers, spaces and ' - . _", () => {
    expect(checkNickname(" Mai ")).toMatchObject({ ok: true, nickname: "Mai" });
    expect(checkNickname("Jo")).toMatchObject({ ok: true });
    expect(checkNickname("O'Brien-Le J.R_2")).toMatchObject({ ok: true });
    expect(checkNickname("Khải")).toMatchObject({ ok: true, nickname: "Khải" });
    expect(checkNickname("李小龙")).toMatchObject({ ok: true });
  });

  it("S02-AC3: rejects names that are too short or too long", () => {
    expect(checkNickname("M")).toEqual({ ok: false, message: "Use at least 2 characters." });
    expect(checkNickname("   ")).toEqual({ ok: false, message: "Use at least 2 characters." });
    expect(checkNickname("a".repeat(17))).toEqual({
      ok: false,
      message: "Use 16 characters or fewer.",
    });
    // Accented letters count once, however they are typed.
    expect(checkNickname("é".normalize("NFD").repeat(16))).toMatchObject({ ok: true });
  });

  it("S02-AC3: rejects other characters and punctuation-only names", () => {
    const message = "Use letters, numbers, spaces and ' - . _ only.";
    expect(checkNickname("Mai<3")).toEqual({ ok: false, message });
    expect(checkNickname("Mai 🎄")).toEqual({ ok: false, message });
    expect(checkNickname("..--")).toEqual({ ok: false, message });
  });

  it("S02-AC5: blocked names get 'Pick another name.', including the event's own words", () => {
    expect(checkNickname("Sh1t Head")).toEqual({ ok: false, message: MESSAGES.blocked });
    expect(checkNickname("Grinch", ["grinch"])).toEqual({ ok: false, message: MESSAGES.blocked });
    expect(checkNickname("Cassie")).toMatchObject({ ok: true });
  });

  it("returns the name's uniqueness key", () => {
    expect(checkNickname("Mai Anh")).toMatchObject({ key: nicknameKey("Mai Anh") });
  });
});

describe("nicknameKey", () => {
  it("S02-AC4: ignores case, spacing, punctuation and accents", () => {
    const k = nicknameKey("Mai");
    expect(nicknameKey("mai")).toBe(k);
    expect(nicknameKey("M a i")).toBe(k);
    expect(nicknameKey("Maï")).toBe(k);
    expect(nicknameKey("M.a-i")).toBe(k);
    expect(nicknameKey("Mia")).not.toBe(k);
  });

  it("is always a safe document id, even for any script", () => {
    for (const name of ["Mai", "李小龙", "Ωmega", "Đức", "a".repeat(16), "龍".repeat(16)])
      expect(nicknameKey(name)).toMatch(/^[a-z0-9-]{1,64}$/);
    expect(nicknameKey("李")).not.toBe(nicknameKey("龙"));
  });
});

describe("codeMatches", () => {
  it("S02-AC2: matches the join code ignoring case and spaces", () => {
    expect(codeMatches(" wush7 ", "WUSH7")).toBe(true);
    expect(codeMatches("ZZZZZ", "WUSH7")).toBe(false);
    expect(codeMatches(undefined, "WUSH7")).toBe(false);
    expect(codeMatches("", "WUSH7")).toBe(false);
  });
});

describe("canJoin", () => {
  it("S02-AC10: open while upcoming or live, closed once ended", () => {
    expect(canJoin("upcoming")).toBe(true);
    expect(canJoin("live")).toBe(true);
    expect(canJoin("ended")).toBe(false);
  });
});
