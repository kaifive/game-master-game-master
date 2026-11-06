import "server-only";
import { cookies } from "next/headers";
import { backend } from "@/lib/backend";
import type { EventRuntimeRepo } from "./repo";
import { firebaseEventRuntime } from "./repo.firebase";
import { MemoryEventRuntimeRepo } from "./repo.memory";

/**
 * Sets every event's status, for end-to-end tests and local runs. Only the
 * in-memory backend reads it; with Firebase it is ignored.
 */
export const DEV_STATUS_COOKIE = "gm-dev-status";

async function devStatus(): Promise<string | undefined> {
  try {
    return (await cookies()).get(DEV_STATUS_COOKIE)?.value;
  } catch {
    return undefined; // Outside a request, such as in unit tests.
  }
}

const shared = globalThis as typeof globalThis & { __gmMemoryEvents?: MemoryEventRuntimeRepo };

/** Where event status and standings come from (see `backend()`). One memory store per process. */
export function eventRuntime(): EventRuntimeRepo {
  return backend() === "firebase"
    ? firebaseEventRuntime()
    : (shared.__gmMemoryEvents ??= new MemoryEventRuntimeRepo({}, {}, devStatus));
}
