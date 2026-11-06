import { signInAnonymously } from "firebase/auth";
import { firebaseClient } from "./client";

/** Signs the phone in anonymously once (the uid is the device) and returns a fresh ID token. */
export async function firebaseDeviceToken(): Promise<string> {
  const { auth } = firebaseClient();
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return user.getIdToken();
}
