import { afterAll, beforeEach, describe } from "vitest";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import { playerRepoContract } from "@/lib/players/repo.contract";
import { FirebasePlayerRepo } from "@/lib/players/repo.firebase";

// The real Firebase repo against the emulators: same contract as the memory repo.
const admin = () => firebaseAdmin();

beforeEach(async () => {
  const events = await admin().firestore.collection("events").listDocuments();
  await Promise.all(events.map((d) => admin().firestore.recursiveDelete(d)));
});

afterAll(() => {
  admin().rtdb.goOffline();
});

// The contract proves S02-AC8 and S02-AC12 (one transaction per join) against Firestore.
describe("FirebasePlayerRepo", () => {
  playerRepoContract(async ({ banned = [] }) => {
    for (const { slug, uid } of banned)
      await admin().firestore.doc(fs.device(slug, uid)).set({ banned: true, playerIds: [] });
    return new FirebasePlayerRepo(admin());
  });
});
