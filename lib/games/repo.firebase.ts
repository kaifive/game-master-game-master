import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import type { PlayChange, PlayRecord, PlayRepo } from "./repo";

function toRecord(doc: DocumentSnapshot): PlayRecord | null {
  if (!doc.exists) return null;
  const d = doc.data() ?? {};
  return {
    gameId: String(d.gameId),
    playerId: String(d.playerId),
    deviceUid: String(d.deviceUid),
    seed: Number(d.seed),
    state: JSON.parse(String(d.state)) as unknown,
    status: d.status === "finished" ? "finished" : "playing",
    points: Number(d.points ?? 0),
    best: Number(d.best ?? 0),
    runs: Number(d.runs ?? 1),
    scored: d.scored === true,
  };
}

/** Plays in Firestore; every change is one transaction on the play document. */
export class FirebasePlayRepo implements PlayRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  async get(slug: string, gameId: string, playerId: string) {
    return toRecord(await this.admin.firestore.doc(fs.play(slug, gameId, playerId)).get());
  }

  async forPlayer(slug: string, playerId: string) {
    const snap = await this.admin.firestore
      .collection(`${fs.event(slug)}/plays`)
      .where("playerId", "==", playerId)
      .get();
    return snap.docs.flatMap((d) => toRecord(d) ?? []);
  }

  update(slug: string, gameId: string, playerId: string, change: PlayChange) {
    const db = this.admin.firestore;
    const ref = db.doc(fs.play(slug, gameId, playerId));
    return db.runTransaction(async (tx) => {
      const current = toRecord(await tx.get(ref));
      const next = change(current);
      if (!next) return current;
      tx.set(
        ref,
        {
          ...next,
          // Stored as text: game state can nest arrays, which Firestore won't hold.
          state: JSON.stringify(next.state),
          ...(current ? {} : { startedAt: FieldValue.serverTimestamp() }),
          ...(next.status === "finished" && current?.status !== "finished"
            ? { finishedAt: FieldValue.serverTimestamp() }
            : {}),
        },
        { merge: true },
      );
      return next;
    });
  }
}

export const firebasePlays = () => new FirebasePlayRepo(firebaseAdmin());
