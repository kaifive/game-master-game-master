import { afterAll, beforeEach, describe } from "vitest";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import { teamRepoContract } from "@/lib/teams/repo.contract";
import { FirebaseTeamRepo } from "@/lib/teams/repo.firebase";

// The real Firebase repo against the emulators: same contract as the memory repo (S03-AC9).
const admin = () => firebaseAdmin();

beforeEach(async () => {
  const events = await admin().firestore.collection("events").listDocuments();
  await Promise.all(events.map((d) => admin().firestore.recursiveDelete(d)));
  for (const id of ["p1", "p2", "p3", "p4", "p5", "p6"])
    await admin()
      .firestore.doc(fs.player("holiday-2026", id))
      .set({ nickname: id, status: "active", teamId: null });
});

afterAll(() => {
  admin().rtdb.goOffline();
});

describe("FirebaseTeamRepo", () => {
  teamRepoContract(() => Promise.resolve(new FirebaseTeamRepo(admin())));
});
