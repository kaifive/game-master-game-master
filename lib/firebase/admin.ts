import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { EMULATOR_CONFIG, EMULATOR_PROJECT, parseServiceAccount } from "./config";

export type FirebaseAdmin = { app: App; auth: Auth; firestore: Firestore; rtdb: Database };

let admin: FirebaseAdmin | undefined;

const onEmulators = () =>
  Boolean(process.env.FIRESTORE_EMULATOR_HOST ?? process.env.FIREBASE_AUTH_EMULATOR_HOST);

/**
 * Firebase Admin for route handlers (trusted writes: points, joins, admin
 * actions). Uses FIREBASE_SERVICE_ACCOUNT, or the demo project on emulators.
 */
export function firebaseAdmin(): FirebaseAdmin {
  if (admin) return admin;
  let app: App;
  if (onEmulators()) {
    app =
      getApps()[0] ??
      initializeApp({ projectId: EMULATOR_PROJECT, databaseURL: EMULATOR_CONFIG.databaseURL });
  } else {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw)
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT isn't set on this server. See docs/setup/README.md.",
      );
    const account = parseServiceAccount(raw);
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert(account),
        projectId: account.projectId,
        databaseURL:
          process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
          `https://${account.projectId}-default-rtdb.firebaseio.com`,
      });
  }
  admin = { app, auth: getAuth(app), firestore: getFirestore(app), rtdb: getDatabase(app) };
  return admin;
}
