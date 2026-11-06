import { afterAll, beforeEach, describe } from "vitest";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import { boardRepoContract, pointsRepoContract } from "@/lib/points/repo.contract";
import { FirebaseBoardRepo, FirebasePointsRepo } from "@/lib/points/repo.firebase";

// The real Firebase repos against the emulators: same contracts as the memory repos (S04-AC8).
const admin = () => firebaseAdmin();

beforeEach(async () => {
  await admin().rtdb.ref("/").set(null);
  const events = await admin().firestore.collection("events").listDocuments();
  await Promise.all(events.map((d) => admin().firestore.recursiveDelete(d)));
  for (const id of ["p1", "p2"])
    await admin()
      .firestore.doc(fs.player("holiday-2026", id))
      .set({ nickname: id, status: "active", points: 0 });
  await admin()
    .firestore.doc(fs.team("holiday-2026", "t1"))
    .set({ name: null, color: 1, memberIds: [] });
});

afterAll(() => {
  admin().rtdb.goOffline();
});

describe("FirebasePointsRepo", () => {
  pointsRepoContract(() => Promise.resolve(new FirebasePointsRepo(admin())));
});

describe("FirebaseBoardRepo", () => {
  boardRepoContract(() => Promise.resolve(new FirebaseBoardRepo(admin())));
});
