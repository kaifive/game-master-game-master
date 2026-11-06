import "server-only";

export type Backend = "firebase" | "memory";

/**
 * Where server data lives: Firebase when configured; otherwise, outside
 * production (or with GM_ALLOW_NO_FIREBASE=1 for CI builds), in memory.
 * Production with neither refuses to run (S02-AC11).
 */
export function backend(env: Record<string, string | undefined> = process.env): Backend {
  if (env.FIREBASE_SERVICE_ACCOUNT || env.FIRESTORE_EMULATOR_HOST) return "firebase";
  if (env.NODE_ENV !== "production" || env.GM_ALLOW_NO_FIREBASE === "1") return "memory";
  throw new Error(
    "Firebase isn't configured on this server (FIREBASE_SERVICE_ACCOUNT). See docs/setup/README.md.",
  );
}
