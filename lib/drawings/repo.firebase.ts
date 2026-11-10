import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import type { DrawingRecord } from "./model";
import type { DrawingRepo } from "./repo";

/** Kept drawings' records in Firestore, one document each (ADR-032). */
export class FirebaseDrawingRepo implements DrawingRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  async add(slug: string, drawing: DrawingRecord) {
    await this.admin.firestore.doc(fs.drawing(slug, drawing.id)).set(drawing);
  }

  async list(slug: string) {
    const snap = await this.admin.firestore
      .collection(fs.drawings(slug))
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        gameId: String(v.gameId),
        playerId: String(v.playerId),
        run: Number(v.run ?? 1),
        points: Number(v.points ?? 0),
        url: String(v.url),
        createdAt: Number(v.createdAt ?? 0),
      };
    });
  }

  async clear(slug: string) {
    await this.admin.firestore.recursiveDelete(this.admin.firestore.collection(fs.drawings(slug)));
  }
}

/** The Firestore repo on the server's Firebase app. */
export const firebaseDrawings = (): DrawingRepo => new FirebaseDrawingRepo(firebaseAdmin());
