import { afterAll, beforeEach, describe } from "vitest";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { fs, rtdb } from "@/lib/firebase/paths";
import { eventRuntimeContract } from "@/lib/events/repo.contract";
import { FirebaseEventRuntimeRepo } from "@/lib/events/repo.firebase";

// The real Firebase repo against the emulators: same contract as the memory repo.
const admin = () => firebaseAdmin();

beforeEach(async () => {
  await admin().rtdb.ref("/").set(null);
  const docs = await admin().firestore.collection("events").listDocuments();
  await Promise.all(docs.map((d) => d.delete()));
});

afterAll(() => {
  admin().rtdb.goOffline();
});

describe("FirebaseEventRuntimeRepo", () => {
  eventRuntimeContract(async ({ status = {}, leaderboard = {} }) => {
    for (const [slug, value] of Object.entries(status))
      await admin().firestore.doc(fs.event(slug)).set({ status: value });
    for (const [slug, value] of Object.entries(leaderboard))
      await admin().rtdb.ref(rtdb.leaderboard(slug)).set(value);
    return new FirebaseEventRuntimeRepo(admin());
  });
});
