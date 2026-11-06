import { afterAll, beforeEach, describe } from "vitest";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { playRepoContract } from "@/lib/games/repo.contract";
import { FirebasePlayRepo } from "@/lib/games/repo.firebase";

// The real Firebase repo against the emulators: same contract as the memory repo (S08-AC8).
const admin = () => firebaseAdmin();

beforeEach(async () => {
  const events = await admin().firestore.collection("events").listDocuments();
  await Promise.all(events.map((d) => admin().firestore.recursiveDelete(d)));
});

afterAll(() => {
  admin().rtdb.goOffline();
});

describe("FirebasePlayRepo", () => {
  playRepoContract(() => Promise.resolve(new FirebasePlayRepo(admin())));
});
