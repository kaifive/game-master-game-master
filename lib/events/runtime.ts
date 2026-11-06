import "server-only";
import { backend } from "@/lib/backend";
import type { EventRuntimeRepo } from "./repo";
import { firebaseEventRuntime } from "./repo.firebase";
import { MemoryEventRuntimeRepo } from "./repo.memory";

/** Where event status and standings come from (see `backend()`). */
export function eventRuntime(): EventRuntimeRepo {
  return backend() === "firebase" ? firebaseEventRuntime() : new MemoryEventRuntimeRepo();
}
