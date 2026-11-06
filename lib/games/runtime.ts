import "server-only";
import { backend } from "@/lib/backend";
import type { PlayRepo } from "./repo";
import { firebasePlays } from "./repo.firebase";
import { MemoryPlayRepo } from "./repo.memory";

const shared = globalThis as typeof globalThis & { __gmMemoryPlays?: MemoryPlayRepo };

/** Where plays live: Firestore, or one in-memory store per server process. */
export const playRepo = (): PlayRepo =>
  backend() === "firebase" ? firebasePlays() : (shared.__gmMemoryPlays ??= new MemoryPlayRepo());
