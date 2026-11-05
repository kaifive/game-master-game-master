import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs, rtdb } from "@/lib/firebase/paths";
import type { EventRuntimeRepo } from "./repo";
import { eventStatus, parseLeaderboard } from "./rules";

/** Status from Firestore (events/{slug}), standings from the RTDB leaderboard summary. */
export class FirebaseEventRuntimeRepo implements EventRuntimeRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  async status(slug: string) {
    const snap = await this.admin.firestore.doc(fs.event(slug)).get();
    return eventStatus(snap.get("status"));
  }

  async finalStandings(slug: string) {
    const snap = await this.admin.rtdb.ref(rtdb.leaderboard(slug)).get();
    return parseLeaderboard(snap.val());
  }
}

/** The runtime repo backed by this server's Firebase Admin. */
export const firebaseEventRuntime = () => new FirebaseEventRuntimeRepo(firebaseAdmin());
