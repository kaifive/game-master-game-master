import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { firebaseAdmin, type FirebaseAdmin } from "@/lib/firebase/admin";
import { fs, rtdb } from "@/lib/firebase/paths";
import type { Team, TeamsSummary } from "./model";
import type { TeamRepo, TeamSummaryRepo } from "./repo";
import { teamErrors } from "./repo.errors";

function toTeam(d: DocumentSnapshot): Team {
  const created: unknown = d.get("createdAt");
  const name: unknown = d.get("name");
  const captain: unknown = d.get("captainId");
  const members: unknown = d.get("memberIds");
  return {
    id: d.id,
    name: typeof name === "string" ? name : null,
    color: Number(d.get("color") ?? 1),
    captainId: typeof captain === "string" ? captain : null,
    memberIds: Array.isArray(members)
      ? members.filter((m): m is string => typeof m === "string")
      : [],
    createdAt: created instanceof Timestamp ? created.toMillis() : 0,
  };
}

/** Teams in Firestore. Each player's `teamId` changes in the same transaction as the team. */
export class FirebaseTeamRepo implements TeamRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  private get db() {
    return this.admin.firestore;
  }

  async list(slug: string) {
    const snap = await this.db.collection(fs.teams(slug)).get();
    return snap.docs.map(toTeam).sort((a, b) => a.createdAt - b.createdAt);
  }

  create(slug: string, captainId: string, color: number) {
    const playerRef = this.db.doc(fs.player(slug, captainId));
    return this.db.runTransaction(async (tx) => {
      const player = await tx.get(playerRef);
      if (typeof player.get("teamId") === "string") throw teamErrors.onTeam();
      const ref = this.db.collection(fs.teams(slug)).doc();
      tx.create(ref, {
        name: null,
        nameKey: null,
        color,
        captainId,
        memberIds: [captainId],
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(playerRef, { teamId: ref.id }, { merge: true });
      const team: Team = {
        id: ref.id,
        name: null,
        color,
        captainId,
        memberIds: [captainId],
        createdAt: Date.now(),
      };
      return team;
    });
  }

  async rename(slug: string, teamId: string, name: string, key: string) {
    const teamRef = this.db.doc(fs.team(slug, teamId));
    const nameRef = this.db.doc(fs.teamName(slug, key));
    await this.db.runTransaction(async (tx) => {
      const [team, taken] = await tx.getAll(teamRef, nameRef);
      if (!team?.exists) throw teamErrors.noTeam();
      const owner: unknown = taken?.get("teamId");
      if (taken?.exists && owner !== teamId) throw teamErrors.nameTaken();
      const oldKey: unknown = team.get("nameKey");
      if (typeof oldKey === "string" && oldKey !== key)
        tx.delete(this.db.doc(fs.teamName(slug, oldKey)));
      tx.set(nameRef, { teamId });
      tx.update(teamRef, { name, nameKey: key });
    });
  }

  async join(slug: string, teamId: string, playerId: string, maxSize: number) {
    const teamRef = this.db.doc(fs.team(slug, teamId));
    const playerRef = this.db.doc(fs.player(slug, playerId));
    await this.db.runTransaction(async (tx) => {
      const [team, player] = await tx.getAll(teamRef, playerRef);
      if (!team?.exists) throw teamErrors.noTeam();
      if (typeof player?.get("teamId") === "string") throw teamErrors.onTeam();
      if (toTeam(team).memberIds.length >= maxSize) throw teamErrors.full();
      tx.update(teamRef, { memberIds: FieldValue.arrayUnion(playerId) });
      tx.set(playerRef, { teamId }, { merge: true });
    });
  }

  async move(slug: string, playerId: string, teamId: string) {
    const toRef = this.db.doc(fs.team(slug, teamId));
    const playerRef = this.db.doc(fs.player(slug, playerId));
    await this.db.runTransaction(async (tx) => {
      const [to, player] = await tx.getAll(toRef, playerRef);
      if (!to?.exists) throw teamErrors.noTeam();
      const from: unknown = player?.get("teamId");
      if (from === teamId) return;
      const fromTeam =
        typeof from === "string" ? await tx.get(this.db.doc(fs.team(slug, from))) : null;
      if (fromTeam?.exists)
        tx.update(fromTeam.ref, {
          memberIds: FieldValue.arrayRemove(playerId),
          ...(fromTeam.get("captainId") === playerId ? { captainId: null } : {}),
        });
      tx.update(toRef, { memberIds: FieldValue.arrayUnion(playerId) });
      tx.set(playerRef, { teamId }, { merge: true });
    });
  }

  async setCaptain(slug: string, teamId: string, playerId: string) {
    const ref = this.db.doc(fs.team(slug, teamId));
    await this.db.runTransaction(async (tx) => {
      const team = await tx.get(ref);
      if (!team.exists) throw teamErrors.noTeam();
      if (!toTeam(team).memberIds.includes(playerId)) throw teamErrors.notMember();
      tx.update(ref, { captainId: playerId });
    });
  }

  async drop(slug: string, playerId: string) {
    const playerRef = this.db.doc(fs.player(slug, playerId));
    await this.db.runTransaction(async (tx) => {
      const player = await tx.get(playerRef);
      const teamId: unknown = player.get("teamId");
      if (typeof teamId !== "string") return;
      const team = await tx.get(this.db.doc(fs.team(slug, teamId)));
      if (team.exists)
        tx.update(team.ref, {
          memberIds: FieldValue.arrayRemove(playerId),
          ...(team.get("captainId") === playerId ? { captainId: null } : {}),
        });
      tx.set(playerRef, { teamId: null }, { merge: true });
    });
  }

  async clear(slug: string) {
    // Members go back to no team, then the teams and their names go.
    const batch = this.db.batch();
    for (const team of await this.list(slug))
      for (const id of team.memberIds)
        batch.set(this.db.doc(fs.player(slug, id)), { teamId: null }, { merge: true });
    await batch.commit();
    for (const path of [fs.teams(slug), fs.teamNames(slug)])
      await this.db.recursiveDelete(this.db.collection(path));
  }
}

export const firebaseTeams = () => new FirebaseTeamRepo(firebaseAdmin());

/**
 * The teams summary in the Realtime Database, kept as one JSON string so
 * empty lists survive (the database drops empty arrays).
 */
export class FirebaseTeamSummaryRepo implements TeamSummaryRepo {
  constructor(private readonly admin: FirebaseAdmin) {}

  async read(slug: string) {
    const raw: unknown = (await this.admin.rtdb.ref(rtdb.teams(slug)).get()).val();
    if (typeof raw !== "string") return null;
    try {
      return JSON.parse(raw) as TeamsSummary;
    } catch {
      return null;
    }
  }

  async write(slug: string, summary: TeamsSummary) {
    await this.admin.rtdb.ref(rtdb.teams(slug)).set(JSON.stringify(summary));
  }
}

export const firebaseTeamSummary = () => new FirebaseTeamSummaryRepo(firebaseAdmin());
