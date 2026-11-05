import "server-only";
import type { EventRuntimeRepo } from "./repo";
import { firebaseEventRuntime } from "./repo.firebase";
import { MemoryEventRuntimeRepo } from "./repo.memory";

const firebaseConfigured = () =>
  Boolean(process.env.FIREBASE_SERVICE_ACCOUNT ?? process.env.FIRESTORE_EMULATOR_HOST);

/**
 * Where event status and standings come from: Firebase when configured;
 * otherwise, outside production (or with GM_ALLOW_NO_FIREBASE=1 for CI
 * builds), an empty in-memory store where every event is upcoming.
 */
export function eventRuntime(): EventRuntimeRepo {
  if (firebaseConfigured()) return firebaseEventRuntime();
  if (process.env.NODE_ENV !== "production" || process.env.GM_ALLOW_NO_FIREBASE === "1") {
    return new MemoryEventRuntimeRepo();
  }
  throw new Error(
    "Firebase isn't configured on this server (FIREBASE_SERVICE_ACCOUNT). See docs/setup/README.md.",
  );
}
