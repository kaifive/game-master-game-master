import { describe, expect, it } from "vitest";
import {
  passphraseMatches,
  SESSION_MS,
  signSession,
  SignInLimiter,
  verifySession,
} from "./session";

describe("admin session", () => {
  it("S06-AC1: matches only the right passphrase, of any length", () => {
    expect(passphraseMatches("snow-dragon", "snow-dragon")).toBe(true);
    expect(passphraseMatches("snow-dragon ", "snow-dragon")).toBe(false);
    expect(passphraseMatches("", "snow-dragon")).toBe(false);
    expect(passphraseMatches("a".repeat(500), "snow-dragon")).toBe(false);
  });

  it("S06-AC3: a signed session is valid for 7 days with the same passphrase", () => {
    const token = signSession("snow-dragon", 1000);
    expect(verifySession(token, "snow-dragon", 1000)).toBe(true);
    expect(verifySession(token, "snow-dragon", 1000 + SESSION_MS - 1)).toBe(true);
    expect(verifySession(token, "snow-dragon", 1000 + SESSION_MS)).toBe(false);
    expect(SESSION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("S06-AC3: a tampered, foreign or old-passphrase session is refused", () => {
    const token = signSession("snow-dragon", 1000);
    const [expires, signature] = token.split(".");
    expect(
      verifySession(`${String(Number(expires) + 9999999)}.${signature ?? ""}`, "snow-dragon", 1000),
    ).toBe(false);
    expect(verifySession(token, "new-passphrase", 1000)).toBe(false);
    for (const bad of [undefined, "", "abc", "1.2.3", `${expires ?? ""}.`, "nope.sig"])
      expect(verifySession(bad, "snow-dragon", 1000)).toBe(false);
  });

  it("S06-AC2: five wrong tries in 10 minutes lock an IP for 10 minutes", () => {
    const limit = new SignInLimiter();
    const min = 60_000;
    for (let i = 0; i < 4; i++) limit.fail("1.2.3.4", i * min);
    expect(limit.locked("1.2.3.4", 4 * min)).toBe(false);
    limit.fail("1.2.3.4", 4 * min);
    expect(limit.locked("1.2.3.4", 5 * min)).toBe(true);
    expect(limit.locked("5.6.7.8", 5 * min)).toBe(false);
    expect(limit.locked("1.2.3.4", 14 * min + 1)).toBe(false);
  });

  it("S06-AC2: old tries fall out of the window, and a success clears them", () => {
    const limit = new SignInLimiter();
    for (let i = 0; i < 4; i++) limit.fail("ip", 0);
    limit.fail("ip", 11 * 60_000); // a new window
    expect(limit.locked("ip", 11 * 60_000)).toBe(false);
    for (let i = 0; i < 3; i++) limit.fail("ip", 11 * 60_000);
    limit.succeed("ip");
    limit.fail("ip", 11 * 60_000);
    expect(limit.locked("ip", 11 * 60_000)).toBe(false);
  });
});
