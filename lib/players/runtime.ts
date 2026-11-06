import "server-only";
import { backend, type Backend } from "@/lib/backend";
import { verifyDevDevice, type DeviceVerifier } from "./identity";
import type { PlayerRepo } from "./repo";
import { firebasePlayers, verifyFirebaseDevice } from "./repo.firebase";
import { MemoryPlayerRepo } from "./repo.memory";

// One in-memory store per server process, shared by every route.
const shared = globalThis as typeof globalThis & { __gmMemoryPlayers?: MemoryPlayerRepo };

/** Dev tokens are only ever accepted when the server runs in memory (S02-AC11). */
export const verifierFor = (kind: Backend): DeviceVerifier =>
  kind === "firebase" ? verifyFirebaseDevice : verifyDevDevice;

export function playersRuntime(): { repo: PlayerRepo; verify: DeviceVerifier } {
  const kind = backend();
  const repo =
    kind === "firebase" ? firebasePlayers() : (shared.__gmMemoryPlayers ??= new MemoryPlayerRepo());
  return { repo, verify: verifierFor(kind) };
}
