import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { readPublicConfig, usingEmulators } from "./config";

export type FirebaseClient = { app: FirebaseApp; auth: Auth; firestore: Firestore; rtdb: Database };

let client: FirebaseClient | undefined;

/** The browser's Firebase: created once, pointed at the emulators in development. */
export function firebaseClient(): FirebaseClient {
  if (client) return client;
  const config = readPublicConfig();
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const rtdb = getDatabase(app, config.databaseURL);
  if (usingEmulators()) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    connectDatabaseEmulator(rtdb, "127.0.0.1", 9000);
  }
  client = { app, auth, firestore, rtdb };
  return client;
}
