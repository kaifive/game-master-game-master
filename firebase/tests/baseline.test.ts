import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";

// Baseline from docs/reference/security-rules.md: anything a feature has not
// opened up is denied. Each feature adds its own rule tests next to this.
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-game-master",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8") },
    database: { rules: readFileSync("firebase/database.rules.json", "utf8") },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearDatabase();
});

afterAll(async () => {
  await env.cleanup();
});

describe("Firestore denies by default", () => {
  test("a signed-out visitor can't read or write", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "anything/at-all")));
    await assertFails(setDoc(doc(db, "anything/at-all"), { x: 1 }));
  });

  test("a signed-in player can't write points to the ledger", async () => {
    const db = env.authenticatedContext("device-1").firestore();
    await assertFails(setDoc(doc(db, "events/holiday-2026/ledger/e1"), { points: 1000 }));
  });
});

describe("Realtime Database denies by default", () => {
  test("a signed-out visitor can't read or write", async () => {
    const db = env.unauthenticatedContext().database();
    await assertFails(get(ref(db, "anything")));
    await assertFails(set(ref(db, "anything"), 1));
  });

  test("a signed-in player can't write the leaderboard", async () => {
    const db = env.authenticatedContext("device-1").database();
    await assertFails(set(ref(db, "leaderboard/holiday-2026"), { hacked: true }));
  });
});
