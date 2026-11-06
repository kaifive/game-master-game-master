import { FieldValue } from "firebase-admin/firestore";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs, rtdb } from "@/lib/firebase/paths";
import { AppError } from "@/lib/errors";
import {
  RECENT_LIMIT,
  type BoardRow,
  type LedgerEntry,
  type NewAward,
  type RecentAward,
} from "./model";
import type { BoardRepo, PointsRepo } from "./repo";

const points = (v: unknown) => (typeof v === "number" ? v : 0);

/** The ledger in Firestore; each entry and the player's points change in one transaction. */
export class FirebasePointsRepo implements PointsRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  private write(slug: string, entry: LedgerEntry) {
    const db = this.admin.firestore;
    const entryRef = db.doc(fs.ledgerEntry(slug, entry.id));
    const playerRef = db.doc(fs.player(slug, entry.to.id));
    return db.runTransaction(async (tx) => {
      const [existing, player] = await tx.getAll(entryRef, playerRef);
      const current = points(player?.get("points"));
      if (existing?.exists) return { applied: false, total: current };
      if (!player?.exists) throw new AppError("NOT_FOUND", "We couldn't find that player.");
      const total = current + entry.points;
      tx.create(entryRef, { ...entry, createdAt: FieldValue.serverTimestamp() });
      tx.update(playerRef, { points: total });
      return { applied: true, total };
    });
  }

  award(slug: string, award: NewAward) {
    return this.write(slug, { ...award, kind: "award" });
  }

  async voidEntry(
    slug: string,
    entryId: string,
    reason: string,
    createdBy: LedgerEntry["createdBy"],
  ) {
    const original = await this.admin.firestore.doc(fs.ledgerEntry(slug, entryId)).get();
    if (!original.exists) return null;
    const o = original.data() as LedgerEntry;
    const result = await this.write(slug, {
      id: `void_${entryId}`,
      kind: "void",
      points: -o.points,
      to: o.to,
      reason,
      source: o.source,
      voids: entryId,
      createdBy,
    });
    return { ...result, playerId: o.to.id };
  }

  async total(slug: string, playerId: string) {
    return points((await this.admin.firestore.doc(fs.player(slug, playerId)).get()).get("points"));
  }

  async entries(slug: string) {
    const snap = await this.admin.firestore.collection(fs.ledger(slug)).get();
    return snap.docs.map((d) => {
      const entry = d.data() as LedgerEntry & { createdAt?: unknown };
      delete entry.createdAt;
      return entry;
    });
  }

  async setTotal(slug: string, playerId: string, total: number) {
    await this.admin.firestore.doc(fs.player(slug, playerId)).update({ points: total });
  }
}

/** The leaderboard summary in the Realtime Database, one row per write. */
export class FirebaseBoardRepo implements BoardRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  private touch(slug: string) {
    return this.admin.rtdb.ref(`${rtdb.leaderboard(slug)}/updatedAt`).set(Date.now());
  }

  async upsert(slug: string, row: BoardRow) {
    const { id, ...value } = row;
    await this.admin.rtdb.ref(rtdb.leaderboardPlayer(slug, id)).set(value);
    await this.touch(slug);
  }

  async remove(slug: string, playerId: string) {
    await this.admin.rtdb.ref(rtdb.leaderboardPlayer(slug, playerId)).remove();
    await this.touch(slug);
  }

  // Keyed by time then id, so the newest sort last by key: no index (and no rules change) needed.
  async addRecent(slug: string, award: RecentAward) {
    const key = `${String(award.at).padStart(13, "0")}_${award.id}`.slice(0, 64);
    await this.admin.rtdb.ref(rtdb.leaderboardRecentEntry(slug, key)).set(award);
  }

  async read(slug: string) {
    const [players, recent] = await Promise.all([
      this.admin.rtdb.ref(rtdb.leaderboardPlayers(slug)).get(),
      this.admin.rtdb
        .ref(rtdb.leaderboardRecent(slug))
        .orderByKey()
        .limitToLast(RECENT_LIMIT)
        .get(),
    ]);
    const rows = Object.entries((players.val() ?? {}) as Record<string, Omit<BoardRow, "id">>)
      .map(([id, v]) => ({ id, nickname: v.nickname, teamId: v.teamId ?? null, points: v.points }))
      .sort((a, b) => b.points - a.points);
    const awards = Object.values((recent.val() ?? {}) as Record<string, RecentAward>).sort(
      (a, b) => b.at - a.at,
    );
    return { players: rows, recent: awards };
  }

  async replace(slug: string, rows: BoardRow[]) {
    const value = Object.fromEntries(rows.map(({ id, ...v }) => [id, v]));
    await this.admin.rtdb.ref(rtdb.leaderboardPlayers(slug)).set(value);
    await this.touch(slug);
  }
}

export const firebasePoints = () => new FirebasePointsRepo(firebaseAdmin());
export const firebaseBoard = () => new FirebaseBoardRepo(firebaseAdmin());
