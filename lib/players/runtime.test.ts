import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { verifyDevDevice } from "./identity";
import { verifyFirebaseDevice } from "./repo.firebase";
import { playersRuntime, verifierFor } from "./runtime";

describe("players runtime", () => {
  it("S02-AC11: uses Firebase token checks with Firebase, dev tokens only in memory", () => {
    expect(verifierFor("firebase")).toBe(verifyFirebaseDevice);
    expect(verifierFor("memory")).toBe(verifyDevDevice);
  });

  it("shares one in-memory store across calls", () => {
    expect(playersRuntime().repo).toBe(playersRuntime().repo);
  });
});
