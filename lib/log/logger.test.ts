import { afterEach, describe, expect, test, vi } from "vitest";
import { createLogger } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  test("writes one JSON line with level, message and context", () => {
    const write = vi.fn();
    const log = createLogger({ write, now: () => new Date("2026-12-19T20:00:00Z") });
    log.info("player joined", { slug: "holiday-2026" });
    expect(JSON.parse(write.mock.calls[0]![1] as string)).toEqual({
      level: "info",
      msg: "player joined",
      time: "2026-12-19T20:00:00.000Z",
      slug: "holiday-2026",
    });
    expect(write.mock.calls[0]![0]).toBe("info");
  });

  test("never logs secrets, at any depth", () => {
    const write = vi.fn();
    const log = createLogger({ write });
    log.error("sign-in failed", {
      passphrase: "hunter2",
      headers: { authorization: "Bearer abc", Cookie: "x" },
      idToken: "t",
      nested: { apiSecret: "s", ok: "fine" },
    });
    const line = write.mock.calls[0]![1] as string;
    expect(line).not.toMatch(/hunter2|Bearer abc|"t"|"s"|"x"/);
    expect(line).toContain('"ok":"fine"');
    expect(line).toContain("[redacted]");
  });

  test("sends each level to the matching console method by default", () => {
    const info = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const log = createLogger();
    log.info("a");
    log.warn("b");
    log.error("c");
    expect(info).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });

  test("stops at very deep objects instead of looping", () => {
    const write = vi.fn();
    createLogger({ write }).info("deep", { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } });
    expect(write.mock.calls[0]![1]).toContain("[deep]");
  });

  test("turns errors into name, message and stack", () => {
    const write = vi.fn();
    createLogger({ write }).error("boom", { err: new Error("db down") });
    const out = JSON.parse(write.mock.calls[0]![1] as string) as { err: { message: string } };
    expect(out.err.message).toBe("db down");
  });
});
