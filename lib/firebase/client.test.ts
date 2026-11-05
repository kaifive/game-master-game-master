import { beforeEach, describe, expect, test, vi } from "vitest";

const calls = vi.hoisted(() => ({ init: 0, auth: 0, fs: 0, db: 0 }));
vi.mock("firebase/app", () => ({
  getApps: () => [],
  initializeApp: vi.fn(() => {
    calls.init++;
    return { name: "app" };
  }),
}));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({ kind: "auth" }),
  connectAuthEmulator: vi.fn(() => calls.auth++),
}));
vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({ kind: "fs" }),
  connectFirestoreEmulator: vi.fn(() => calls.fs++),
}));
vi.mock("firebase/database", () => ({
  getDatabase: () => ({ kind: "db" }),
  connectDatabaseEmulator: vi.fn(() => calls.db++),
}));

beforeEach(() => {
  vi.resetModules();
  Object.assign(calls, { init: 0, auth: 0, fs: 0, db: 0 });
});

describe("the browser Firebase client", () => {
  test("initializes once and connects to the emulators in development", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATORS", "1");
    const { firebaseClient } = await import("./client");
    const a = firebaseClient();
    const b = firebaseClient();
    expect(a).toBe(b);
    expect(calls).toEqual({ init: 1, auth: 1, fs: 1, db: 1 });
    vi.unstubAllEnvs();
  });

  test("talks to the real project, with no emulators, when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_EMULATORS", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "x.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "x");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "1:2:web:3");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_DATABASE_URL", "https://x-default-rtdb.firebaseio.com");
    const { firebaseClient } = await import("./client");
    firebaseClient();
    expect(calls).toEqual({ init: 1, auth: 0, fs: 0, db: 0 });
    vi.unstubAllEnvs();
  });
});
