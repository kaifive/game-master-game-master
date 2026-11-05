import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
const init = vi.hoisted(() => vi.fn((opts: unknown) => ({ opts })));
vi.mock("firebase-admin/app", () => ({
  getApps: () => [],
  initializeApp: init,
  cert: (c: unknown) => ({ cert: c }),
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ kind: "auth" }) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({ kind: "fs" }) }));
vi.mock("firebase-admin/database", () => ({ getDatabase: () => ({ kind: "db" }) }));

beforeEach(() => {
  vi.resetModules();
  init.mockClear();
  vi.unstubAllEnvs();
});

const account = JSON.stringify({
  project_id: "game-master-2caae",
  client_email: "a@game-master-2caae.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
});

describe("the server's Firebase Admin", () => {
  test("uses the service account and the project's database URL, once", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", account);
    vi.stubEnv(
      "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
      "https://game-master-2caae-default-rtdb.firebaseio.com",
    );
    const { firebaseAdmin } = await import("./admin");
    expect(firebaseAdmin()).toBe(firebaseAdmin());
    expect(init).toHaveBeenCalledOnce();
    expect(init.mock.calls[0]![0]).toMatchObject({
      projectId: "game-master-2caae",
      databaseURL: "https://game-master-2caae-default-rtdb.firebaseio.com",
    });
  });

  test("needs no credentials against the emulators", async () => {
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    const { firebaseAdmin } = await import("./admin");
    firebaseAdmin();
    expect(init.mock.calls[0]![0]).toMatchObject({ projectId: "demo-game-master" });
    expect(init.mock.calls[0]![0]).not.toHaveProperty("credential");
  });

  test("explains what's missing when the service account isn't set", async () => {
    const { firebaseAdmin } = await import("./admin");
    expect(() => firebaseAdmin()).toThrow(/FIREBASE_SERVICE_ACCOUNT/);
  });
});
