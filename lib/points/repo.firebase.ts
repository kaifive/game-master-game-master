import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs, rtdb } from "@/lib/firebase/paths";
import { AppError } from "@/lib/errors";
import {
  donationIds,
  RECENT_LIMIT,
  type BoardRow,
  type EntryTarget,
  type LedgerEntry,
  type NewAward,
  type NewDonation,
  type RecentAward,
  type TeamRow,
} from "./model";
import type { BoardRepo, PointsRepo, TeamRowPatch } from "./repo";
import { donationRefused, recipientMissing } from "./rules";

const points = (v: unknown) => (typeof v === "number" ? v : 0);

/** The ledger in Firestore; each entry and its recipient's points change in one transaction. */
export class FirebasePointsRepo implements PointsRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  private get db() {
    return this.admin.firestore;
  }

  /** Players' and teams' docs carry their running `points`. */
  private ref(slug: string, to: EntryTarget) {
    return this.db.doc(to.kind === "team" ? fs.team(slug, to.id) : fs.player(slug, to.id));
  }

  private write(slug: string, entry: LedgerEntry) {
    const entryRef = this.db.doc(fs.ledgerEntry(slug, entry.id));
    const toRef = this.ref(slug, entry.to);
    return this.db.runTransaction(async (tx) => {
      const [existing, to] = await tx.getAll(entryRef, toRef);
      const current = points(to?.get("points"));
      if (existing?.exists) return { applied: false, total: current };
      if (!to?.exists) throw recipientMissing(entry.to);
      const total = current + entry.points;
      tx.create(entryRef, { ...entry, createdAt: FieldValue.serverTimestamp() });
      tx.update(toRef, { points: total });
      return { applied: true, total };
    });
  }

  award(slug: string, award: NewAward) {
    return this.write(slug, { ...award, kind: "award" });
  }

  donate(slug: string, d: NewDonation) {
    const ids = donationIds(d.id);
    const fromRef = this.db.doc(fs.ledgerEntry(slug, ids.from));
    const toRef = this.db.doc(fs.ledgerEntry(slug, ids.to));
    const playerRef = this.ref(slug, { kind: "player", id: d.playerId });
    const teamRef = this.ref(slug, { kind: "team", id: d.teamId });
    return this.db.runTransaction(async (tx) => {
      const [existing, player, team] = await tx.getAll(fromRef, playerRef, teamRef);
      const has = points(player?.get("points"));
      const teamHas = points(team?.get("points"));
      if (existing?.exists) return { applied: false, player: has, team: teamHas };
      if (!player?.exists) throw recipientMissing({ kind: "player", id: d.playerId });
      if (!team?.exists) throw recipientMissing({ kind: "team", id: d.teamId });
      const refused = donationRefused(has, d.points);
      if (refused) throw new AppError("BAD_REQUEST", refused);
      const common = {
        kind: "award",
        source: { kind: "donation", id: d.id },
        createdBy: "server",
        createdAt: FieldValue.serverTimestamp(),
      };
      tx.create(fromRef, {
        ...common,
        id: ids.from,
        points: -d.points,
        to: { kind: "player", id: d.playerId },
        reason: "Given to a team",
      });
      tx.create(toRef, {
        ...common,
        id: ids.to,
        points: d.points,
        to: { kind: "team", id: d.teamId },
        from: { kind: "player", id: d.playerId },
        reason: "Donation",
      });
      tx.update(playerRef, { points: has - d.points });
      tx.update(teamRef, { points: teamHas + d.points });
      return { applied: true, player: has - d.points, team: teamHas + d.points };
    });
  }

  async voidEntry(
    slug: string,
    entryId: string,
    reason: string,
    createdBy: LedgerEntry["createdBy"],
  ) {
    const original = await this.db.doc(fs.ledgerEntry(slug, entryId)).get();
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
    return { ...result, to: o.to };
  }

  async total(slug: string, playerId: string) {
    return points((await this.ref(slug, { kind: "player", id: playerId }).get()).get("points"));
  }

  async teamTotal(slug: string, teamId: string) {
    return points((await this.ref(slug, { kind: "team", id: teamId }).get()).get("points"));
  }

  private static toEntry(d: QueryDocumentSnapshot) {
    const entry = d.data() as LedgerEntry & { createdAt?: unknown };
    delete entry.createdAt;
    return entry;
  }

  async entries(slug: string) {
    const snap = await this.db.collection(fs.ledger(slug)).get();
    return snap.docs.map((d) => FirebasePointsRepo.toEntry(d));
  }

  async donations(slug: string) {
    const snap = await this.db
      .collection(fs.ledger(slug))
      .where("source.kind", "==", "donation")
      .get();
    return snap.docs.map((d) => FirebasePointsRepo.toEntry(d));
  }

  async setTotal(slug: string, to: EntryTarget, total: number) {
    await this.ref(slug, to).update({ points: total });
  }

  async clear(slug: string) {
    await this.db.recursiveDelete(this.db.collection(fs.ledger(slug)));
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

  async upsertTeam(slug: string, row: TeamRowPatch) {
    const { id, ...value } = row;
    await this.admin.rtdb.ref(rtdb.leaderboardTeam(slug, id)).update(value);
    await this.touch(slug);
  }

  // Keyed by time then id, so the newest sort last by key: no index (and no rules change) needed.
  async addRecent(slug: string, award: RecentAward) {
    const key = `${String(award.at).padStart(13, "0")}_${award.id}`.slice(0, 64);
    await this.admin.rtdb.ref(rtdb.leaderboardRecentEntry(slug, key)).set(award);
  }

  async read(slug: string) {
    const [players, teams, recent] = await Promise.all([
      this.admin.rtdb.ref(rtdb.leaderboardPlayers(slug)).get(),
      this.admin.rtdb.ref(rtdb.leaderboardTeams(slug)).get(),
      this.admin.rtdb
        .ref(rtdb.leaderboardRecent(slug))
        .orderByKey()
        .limitToLast(RECENT_LIMIT)
        .get(),
    ]);
    const rows = Object.entries((players.val() ?? {}) as Record<string, Omit<BoardRow, "id">>)
      .map(([id, v]) => ({ id, nickname: v.nickname, teamId: v.teamId ?? null, points: v.points }))
      .sort((a, b) => b.points - a.points);
    const teamRows = Object.entries(
      (teams.val() ?? {}) as Record<string, Partial<Omit<TeamRow, "id">>>,
    )
      .flatMap(([id, v]) =>
        typeof v.name === "string" && typeof v.color === "number"
          ? [{ id, name: v.name, color: v.color, points: v.points ?? 0 }]
          : [],
      )
      .sort((a, b) => b.points - a.points);
    const awards = Object.values((recent.val() ?? {}) as Record<string, RecentAward>).sort(
      (a, b) => b.at - a.at,
    );
    return { players: rows, teams: teamRows, recent: awards };
  }

  async replace(slug: string, rows: BoardRow[], teams: TeamRowPatch[] = []) {
    const value = Object.fromEntries(rows.map(({ id, ...v }) => [id, v]));
    await this.admin.rtdb.ref(rtdb.leaderboardPlayers(slug)).set(value);
    await Promise.all(
      teams.map(({ id, ...v }) => this.admin.rtdb.ref(rtdb.leaderboardTeam(slug, id)).update(v)),
    );
    await this.touch(slug);
  }

  async clear(slug: string) {
    await this.admin.rtdb.ref(rtdb.leaderboard(slug)).remove();
  }
}

export const firebasePoints = () => new FirebasePointsRepo(firebaseAdmin());
export const firebaseBoard = () => new FirebaseBoardRepo(firebaseAdmin());
