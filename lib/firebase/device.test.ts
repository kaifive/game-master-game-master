import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  currentUser: null as null | { getIdToken: () => Promise<string> },
  signIns: 0,
}));
const auth = {
  authStateReady: () => Promise.resolve(),
  get currentUser() {
    return state.currentUser;
  },
};
vi.mock("./client", () => ({ firebaseClient: () => ({ auth }) }));
vi.mock("firebase/auth", () => ({
  signInAnonymously: () => {
    state.signIns++;
    state.currentUser = { getIdToken: () => Promise.resolve("token-1") };
    return Promise.resolve({ user: state.currentUser });
  },
}));

beforeEach(() => {
  state.currentUser = null;
  state.signIns = 0;
});

describe("firebaseDeviceToken", () => {
  it("S02-AC1: signs a new phone in anonymously once, then reuses that device", async () => {
    const { firebaseDeviceToken } = await import("./device");
    expect(await firebaseDeviceToken()).toBe("token-1");
    expect(await firebaseDeviceToken()).toBe("token-1");
    expect(state.signIns).toBe(1);
  });
});
