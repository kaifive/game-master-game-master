/** Firebase settings from environment variables (docs/setup/README.md, .env.example). */

export type PublicFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  databaseURL: string;
};

/** The emulators' demo project: needs no real credentials and never touches production. */
export const EMULATOR_PROJECT = "demo-game-master";
export const EMULATOR_CONFIG: PublicFirebaseConfig = {
  apiKey: "demo-key",
  authDomain: `${EMULATOR_PROJECT}.firebaseapp.com`,
  projectId: EMULATOR_PROJECT,
  appId: "demo-app",
  databaseURL: `http://127.0.0.1:9000?ns=${EMULATOR_PROJECT}-default-rtdb`,
};

type Env = Record<string, string | undefined>;

/**
 * Next.js only inlines NEXT_PUBLIC_ variables written out in full, so the
 * browser bundle reads them here by name.
 */
const publicEnv = (): Env => ({
  NEXT_PUBLIC_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});

export const usingEmulators = (env: Env = publicEnv()) =>
  env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";

const FIELDS = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
  databaseURL: "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
} as const;

/** The Firebase web config: the demo project with emulators, else the real one. */
export function readPublicConfig(env: Env = publicEnv()): PublicFirebaseConfig {
  if (usingEmulators(env)) return EMULATOR_CONFIG;
  const missing = Object.values(FIELDS).filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase isn't configured. Missing: ${missing.join(", ")}. See docs/setup/README.md.`,
    );
  }
  return Object.fromEntries(
    Object.entries(FIELDS).map(([key, name]) => [key, env[name] ?? ""]),
  ) as PublicFirebaseConfig;
}

export type ServiceAccount = { projectId: string; clientEmail: string; privateKey: string };

/**
 * Reads FIREBASE_SERVICE_ACCOUNT: the downloaded JSON pasted as-is, or
 * base64-encoded. Errors name the problem, never the secret.
 */
export function parseServiceAccount(raw: string): ServiceAccount {
  const trimmed = raw.trim();
  let data: Record<string, unknown>;
  try {
    const text = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8");
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT isn't valid JSON (or base64-encoded JSON).");
  }
  const missing = ["project_id", "client_email", "private_key"].filter(
    (k) => typeof data[k] !== "string" || data[k] === "",
  );
  if (missing.length > 0) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT is missing: ${missing.join(", ")}.`);
  }
  return {
    projectId: data.project_id as string,
    clientEmail: data.client_email as string,
    privateKey: (data.private_key as string).replace(/\\n/g, "\n"),
  };
}
