import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import type { PlayerSummary } from "./model";
import type { AdminPlayer, NewPlayer, PlayerRepo, StoredDevice } from "./repo";
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

  async list(slug: string): Promise<AdminPlayer[]> {
    const db = this.admin.firestore;
    const snap = await db.collection(fs.players(slug)).where("status", "==", "active").get();
    const uids = [...new Set(snap.docs.map((d) => String(d.get("deviceUid"))))];
    const devices = uids.length
      ? await db.getAll(...uids.map((uid) => db.doc(fs.device(slug, uid))))
      : [];
    const restarts = new Map(devices.map((d) => [d.id, Number(d.get("restarts") ?? 0)]));
    return snap.docs
      .map((d) => {
        const joined: unknown = d.get("joinedAt");
        const deviceUid = String(d.get("deviceUid"));
        return {
          id: d.id,
          nickname: String(d.get("nickname")),
          deviceUid,
          restarts: restarts.get(deviceUid) ?? 0,
          joinedAt: joined instanceof Timestamp ? joined.toMillis() : 0,
        };
      })
      .sort((a, b) => b.joinedAt - a.joinedAt);
  }

  /** Inside a transaction: the player leaves, their name is freed, their phone is empty. */
  private async removeIn(tx: Transaction, slug: string, playerId: string) {
    const db = this.admin.firestore;
    const player = await tx.get(db.doc(fs.player(slug, playerId)));
    if (!player.exists) return () => undefined;
    const key: unknown = player.get("nicknameKey");
    const deviceRef = db.doc(fs.device(slug, String(player.get("deviceUid"))));
    const device = await tx.get(deviceRef);
    // Reads come first in a transaction; the writes run afterwards.
    return () => {
      tx.update(player.ref, { status: "removed", removedAt: FieldValue.serverTimestamp() });
      if (typeof key === "string") tx.delete(db.doc(fs.nickname(slug, key)));
      if (device.get("playerId") === playerId)
        tx.update(deviceRef, { playerId: null, playerNickname: FieldValue.delete() });
    };
  }

  async remove(slug: string, playerId: string) {
    await this.admin.firestore.runTransaction(async (tx) => {
      const write = await this.removeIn(tx, slug, playerId);
      write();
    });
  }

  async ban(slug: string, uid: string) {
    const db = this.admin.firestore;
    const ref = db.doc(fs.device(slug, uid));
    await db.runTransaction(async (tx) => {
      const device = await tx.get(ref);
      const playerId: unknown = device.get("playerId");
      const write =
        typeof playerId === "string" ? await this.removeIn(tx, slug, playerId) : () => undefined;
      write();
      tx.set(
        ref,
        { banned: true, playerId: null, playerNickname: FieldValue.delete() },
        { merge: true },
      );
    });
  }

  async grantRestart(slug: string, uid: string) {
    const db = this.admin.firestore;
    const ref = db.doc(fs.device(slug, uid));
    await db.runTransaction(async (tx) => {
      const device = await tx.get(ref);
      if (device.exists)
        tx.update(ref, { restarts: Math.max(0, Number(device.get("restarts") ?? 0) - 1) });
    });
  }

  async clear(slug: string) {
    const db = this.admin.firestore;
    for (const path of [fs.players(slug), fs.devices(slug), fs.nicknames(slug)])
      await db.recursiveDelete(db.collection(path));
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
