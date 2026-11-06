import { FieldValue } from "firebase-admin/firestore";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs } from "@/lib/firebase/paths";
import type { DeviceView, PlayerSummary } from "./model";
import type { NewPlayer, PlayerRepo } from "./repo";
import { joinErrors } from "./repo.errors";

const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/** Players in Firestore: devices, players and nicknames, joined in one transaction. */
export class FirebasePlayerRepo implements PlayerRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  async device(slug: string, uid: string): Promise<DeviceView> {
    const db = this.admin.firestore;
    const device = await db.doc(fs.device(slug, uid)).get();
    const playerIds = ids(device.get("playerIds"));
    const docs = playerIds.length
      ? await db.getAll(...playerIds.map((id) => db.doc(fs.player(slug, id))))
      : [];
    const players = docs
      .filter((d) => d.exists && d.get("status") === "active")
      .map((d) => ({ id: d.id, nickname: String(d.get("nickname")) }));
    return { banned: device.get("banned") === true, players };
  }

  join(slug: string, uid: string, { nickname, key, maxPerDevice }: NewPlayer) {
    const db = this.admin.firestore;
    return db.runTransaction(async (tx): Promise<PlayerSummary> => {
      const deviceRef = db.doc(fs.device(slug, uid));
      const nicknameRef = db.doc(fs.nickname(slug, key));
      const [device, taken] = await tx.getAll(deviceRef, nicknameRef);
      if (device?.get("banned") === true) throw joinErrors.banned();
      const playerIds = ids(device?.get("playerIds"));
      if (taken?.exists) {
        const owner = String(taken.get("playerId"));
        if (!playerIds.includes(owner)) throw joinErrors.taken();
        const mine = await tx.get(db.doc(fs.player(slug, owner)));
        return { id: owner, nickname: String(mine.get("nickname")) };
      }
      if (playerIds.length >= maxPerDevice) throw joinErrors.full();
      const ref = db.collection(fs.players(slug)).doc();
      tx.create(ref, {
        deviceUid: uid,
        nickname,
        nicknameKey: key,
        status: "active",
        teamId: null,
        points: 0,
        joinedAt: FieldValue.serverTimestamp(),
      });
      tx.create(nicknameRef, { playerId: ref.id });
      tx.set(
        deviceRef,
        { banned: false, playerIds: FieldValue.arrayUnion(ref.id) },
        { merge: true },
      );
      return { id: ref.id, nickname };
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
