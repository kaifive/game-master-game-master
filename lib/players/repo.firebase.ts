import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import type { PlayerSummary } from "./model";
import type { NewPlayer, PlayerRepo, StoredDevice } from "./repo";
import { joinErrors } from "./repo.errors";

/** Players in Firestore: device, player and nickname change together in one transaction. */
export class FirebasePlayerRepo implements PlayerRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  private refs(slug: string, uid: string, key: string) {
    const db = this.admin.firestore;
    return { db, device: db.doc(fs.device(slug, uid)), nickname: db.doc(fs.nickname(slug, key)) };
  }

  private async currentPlayer(
    tx: Transaction | null,
    slug: string,
    playerId: unknown,
  ): Promise<PlayerSummary | null> {
    if (typeof playerId !== "string") return null;
    const ref = this.admin.firestore.doc(fs.player(slug, playerId));
    const doc = tx ? await tx.get(ref) : await ref.get();
    return doc.exists && doc.get("status") === "active"
      ? { id: doc.id, nickname: String(doc.get("nickname")) }
      : null;
  }

  async device(slug: string, uid: string): Promise<StoredDevice> {
    const doc = await this.admin.firestore.doc(fs.device(slug, uid)).get();
    const playerId: unknown = doc.get("playerId");
    const nickname: unknown = doc.get("playerNickname");
    // The device keeps its player's name, so most calls need one read, not two (S10-AC13).
    const player =
      typeof playerId === "string" && typeof nickname === "string"
        ? { id: playerId, nickname }
        : await this.currentPlayer(null, slug, playerId);
    return {
      banned: doc.get("banned") === true,
      player,
      restarts: Number(doc.get("restarts") ?? 0),
    };
  }

  private create(
    tx: Transaction,
    slug: string,
    uid: string,
    device: DocumentReference,
    nickname: DocumentReference,
    player: NewPlayer,
    restarts: number,
  ): PlayerSummary {
    const ref = this.admin.firestore.collection(fs.players(slug)).doc();
    tx.create(ref, {
      deviceUid: uid,
      nickname: player.nickname,
      nicknameKey: player.key,
      status: "active",
      teamId: null,
      points: 0,
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.set(nickname, { playerId: ref.id });
    tx.set(
      device,
      {
        banned: false,
        playerId: ref.id,
        playerNickname: player.nickname,
        restarts,
        playerIds: FieldValue.arrayUnion(ref.id),
      },
      { merge: true },
    );
    return { id: ref.id, nickname: player.nickname };
  }

  join(slug: string, uid: string, player: NewPlayer) {
    const { db, device, nickname } = this.refs(slug, uid, player.key);
    return db.runTransaction(async (tx) => {
      const [d, taken] = await tx.getAll(device, nickname);
      if (d?.get("banned") === true) throw joinErrors.banned();
      const mine = await this.currentPlayer(tx, slug, d?.get("playerId"));
      if (mine && taken?.get("playerId") === mine.id) return mine;
      if (mine) throw joinErrors.hasPlayer();
      if (taken?.exists) throw joinErrors.taken();
      return this.create(tx, slug, uid, device, nickname, player, Number(d?.get("restarts") ?? 0));
    });
  }

  restart(slug: string, uid: string, player: NewPlayer, maxRestarts: number) {
    const { db, device, nickname } = this.refs(slug, uid, player.key);
    return db.runTransaction(async (tx) => {
      const [d, taken] = await tx.getAll(device, nickname);
      if (d?.get("banned") === true) throw joinErrors.banned();
      const restarts = Number(d?.get("restarts") ?? 0);
      if (restarts >= maxRestarts) throw joinErrors.noRestarts();
      const oldId: unknown = d?.get("playerId");
      const old = typeof oldId === "string" ? await tx.get(db.doc(fs.player(slug, oldId))) : null;
      if (taken?.exists && taken.get("playerId") !== oldId) throw joinErrors.taken();
      if (old?.exists) {
        tx.update(old.ref, { status: "forfeited", forfeitedAt: FieldValue.serverTimestamp() });
        const oldKey: unknown = old.get("nicknameKey");
        if (typeof oldKey === "string" && oldKey !== player.key)
          tx.delete(db.doc(fs.nickname(slug, oldKey)));
      }
      return this.create(tx, slug, uid, device, nickname, player, restarts + 1);
    });
  }
}

/** Verifies a phone's Firebase ID token; returns its uid, or null if it isn't valid. */
export async function verifyFirebaseDevice(token: string): Promise<string | null> {
  try {
    return (await firebaseAdmin().auth.verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

export const firebasePlayers = () => new FirebasePlayerRepo(firebaseAdmin());
