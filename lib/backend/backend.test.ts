import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { backend } from ".";

describe("backend", () => {
  it("uses Firebase when a service account or the emulators are configured", () => {
    expect(backend({ NODE_ENV: "production", FIREBASE_SERVICE_ACCOUNT: "{}" })).toBe("firebase");
    expect(backend({ NODE_ENV: "development", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" })).toBe(
      "firebase",
    );
  });

  it("uses memory outside production, or in CI builds that opt in", () => {
    expect(backend({ NODE_ENV: "development" })).toBe("memory");
    expect(backend({ NODE_ENV: "test" })).toBe("memory");
    expect(backend({ NODE_ENV: "production", GM_ALLOW_NO_FIREBASE: "1" })).toBe("memory");
  });

  it("S02-AC11: production without Firebase refuses to run in memory", () => {
    expect(() => backend({ NODE_ENV: "production" })).toThrow(/FIREBASE_SERVICE_ACCOUNT/);
  });
});
