import { afterAll, beforeEach, describe } from "vitest";
import { firebaseAdmin } from "@/lib/firebase/admin";
import { drawingRepoContract } from "@/lib/drawings/repo.contract";
import { FirebaseDrawingRepo } from "@/lib/drawings/repo.firebase";

// The real Firebase repo against the emulators: same contract as the memory repo (ADR-032).
const admin = () => firebaseAdmin();

beforeEach(async () => {
  const events = await admin().firestore.collection("events").listDocuments();
  await Promise.all(events.map((d) => admin().firestore.recursiveDelete(d)));
});

afterAll(() => {
  admin().rtdb.goOffline();
});

describe("FirebaseDrawingRepo", () => {
  drawingRepoContract(() => Promise.resolve(new FirebaseDrawingRepo(admin())));
});
