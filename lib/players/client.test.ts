// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { activePlayer, deviceToken, devToken, playersApi } from "./client";

vi.mock("@/lib/firebase/device", () => ({
  firebaseDeviceToken: () => Promise.resolve("fb-token"),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("phone helpers", () => {
  it("S02-AC1: keeps one dev device id on this phone", () => {
    const first = devToken();
    expect(first).toMatch(/^dev:[0-9a-f-]{36}$/);
    expect(devToken()).toBe(first);
  });

  it("uses Firebase tokens when the server runs on Firebase", async () => {
    expect(await deviceToken("firebase")).toBe("fb-token");
    expect(await deviceToken("dev")).toMatch(/^dev:/);
  });

  it("still works when local storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(devToken()).toMatch(/^dev:/);
    expect(activePlayer.read("holiday-2026")).toBeNull();
    expect(() => {
      activePlayer.write("holiday-2026", "p1");
    }).not.toThrow();
  });

  it("returns the server's message, or a plain one when there is none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ error: "Nope." }, { status: 409 }))),
    );
    expect(await playersApi.device("holiday-2026", "t")).toEqual({ ok: false, message: "Nope." });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("oops", { status: 500 }))),
    );
    expect(await playersApi.device("holiday-2026", "t")).toMatchObject({ ok: false });
  });
});
