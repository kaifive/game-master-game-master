import { afterAll, beforeEach, describe } from "vitest";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { rtdb } from "@/lib/firebase/paths";
import { liveRepoContract } from "@/lib/live/repo.contract";
import { FirebaseLiveRepo } from "@/lib/live/repo.firebase";

// The real Realtime Database repo against the emulator: same contract as memory (S11-AC8).
const admin = () => firebaseAdmin();

beforeEach(async () => {
  await admin().rtdb.ref(rtdb.live("holiday-2026")).remove();
});

afterAll(() => {
  admin().rtdb.goOffline();
});

describe("FirebaseLiveRepo", () => {
  liveRepoContract(() => Promise.resolve(new FirebaseLiveRepo(admin())));
});
