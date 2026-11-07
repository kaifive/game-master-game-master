import type { EventSettings } from "./model";
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

  async settings(slug: string): Promise<EventSettings> {
    const doc = await this.admin.firestore.doc(fs.event(slug)).get();
    const phase: unknown = doc.get("phase");
    const size: unknown = doc.get("maxTeamSize");
    const phones: unknown = doc.get("boardHiddenOnPhones");
    const tv: unknown = doc.get("boardHiddenOnTv");
    return {
      ...(phase === "individual" || phase === "team" ? { phase } : {}),
      ...(typeof size === "number" ? { maxTeamSize: size } : {}),
      ...(typeof phones === "boolean" ? { boardHiddenOnPhones: phones } : {}),
      ...(typeof tv === "boolean" ? { boardHiddenOnTv: tv } : {}),
    };
  }

  async setSettings(slug: string, settings: EventSettings) {
    await this.admin.firestore.doc(fs.event(slug)).set(settings, { merge: true });
  }

  async setStatus(slug: string, status: string) {
    await this.admin.firestore.doc(fs.event(slug)).set({ status }, { merge: true });
  }

  async finalStandings(slug: string) {
    const snap = await this.admin.rtdb.ref(rtdb.leaderboard(slug)).get();
    return parseLeaderboard(snap.val());
  }
}

/** The runtime repo backed by this server's Firebase Admin. */
export const firebaseEventRuntime = () => new FirebaseEventRuntimeRepo(firebaseAdmin());
