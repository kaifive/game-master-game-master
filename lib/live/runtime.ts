import "server-only";
import { backend } from "@/lib/backend";
import type { LiveRepo } from "./repo";
import { firebaseLive } from "./repo.firebase";
import { MemoryLiveRepo } from "./repo.memory";

const shared = globalThis as typeof globalThis & { __gmMemoryLive?: MemoryLiveRepo };

/** Where live state lives: the Realtime Database, or one in-memory store per server process. */
export const liveRepo = (): LiveRepo =>
  backend() === "firebase" ? firebaseLive() : (shared.__gmMemoryLive ??= new MemoryLiveRepo());
