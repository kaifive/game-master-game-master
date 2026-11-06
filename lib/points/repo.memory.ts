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

const player = (id: string): EntryTarget => ({ kind: "player", id });
const team = (id: string): EntryTarget => ({ kind: "team", id });

/** In-memory ledger: for tests, and local runs without Firebase. */
export class MemoryPointsRepo implements PointsRepo {
  private readonly ledgers = new Map<string, Map<string, LedgerEntry>>();
  private readonly totals = new Map<string, number>();

  constructor(private readonly exists: (slug: string, to: EntryTarget) => boolean = () => true) {}

  private ledger(slug: string) {
    let l = this.ledgers.get(slug);
    if (!l) this.ledgers.set(slug, (l = new Map<string, LedgerEntry>()));
    return l;
  }

  private key = (slug: string, to: EntryTarget) => `${slug}/${to.kind}/${to.id}`;

  private sum(slug: string, to: EntryTarget) {
    return this.totals.get(this.key(slug, to)) ?? 0;
  }

  private add(slug: string, entry: LedgerEntry) {
    this.ledger(slug).set(entry.id, entry);
    const total = this.sum(slug, entry.to) + entry.points;
    this.totals.set(this.key(slug, entry.to), total);
    return total;
  }

  award(slug: string, award: NewAward) {
    if (this.ledger(slug).has(award.id))
      return Promise.resolve({ applied: false, total: this.sum(slug, award.to) });
    if (!this.exists(slug, award.to)) return Promise.reject(recipientMissing(award.to));
    return Promise.resolve({ applied: true, total: this.add(slug, { ...award, kind: "award" }) });
  }

  donate(slug: string, d: NewDonation) {
    const ids = donationIds(d.id);
    const from = player(d.playerId);
    const to = team(d.teamId);
    if (this.ledger(slug).has(ids.from))
      return Promise.resolve({
        applied: false,
        player: this.sum(slug, from),
        team: this.sum(slug, to),
      });
    if (!this.exists(slug, from)) return Promise.reject(recipientMissing(from));
    if (!this.exists(slug, to)) return Promise.reject(recipientMissing(to));
    const refused = donationRefused(this.sum(slug, from), d.points);
    if (refused) return Promise.reject(new AppError("BAD_REQUEST", refused));
    const common = {
      kind: "award" as const,
      source: { kind: "donation" as const, id: d.id },
      createdBy: "server" as const,
    };
    const playerTotal = this.add(slug, {
      ...common,
      id: ids.from,
      points: -d.points,
      to: from,
      reason: "Given to a team",
    });
    const teamTotal = this.add(slug, {
      ...common,
      id: ids.to,
      points: d.points,
      to,
      from: { kind: "player", id: d.playerId },
      reason: "Donation",
    });
    return Promise.resolve({ applied: true, player: playerTotal, team: teamTotal });
  }

  voidEntry(slug: string, entryId: string, reason: string, createdBy: LedgerEntry["createdBy"]) {
    const original = this.ledger(slug).get(entryId);
    if (!original) return Promise.resolve(null);
    const id = `void_${entryId}`;
    const to = original.to;
    if (this.ledger(slug).has(id))
      return Promise.resolve({ applied: false, total: this.sum(slug, to), to });
    const total = this.add(slug, {
      id,
      kind: "void",
      points: -original.points,
      to,
      reason,
      source: original.source,
      voids: entryId,
      createdBy,
    });
    return Promise.resolve({ applied: true, total, to });
  }

  total(slug: string, playerId: string) {
    return Promise.resolve(this.sum(slug, player(playerId)));
  }

  teamTotal(slug: string, teamId: string) {
    return Promise.resolve(this.sum(slug, team(teamId)));
  }

  entries(slug: string) {
    return Promise.resolve([...this.ledger(slug).values()]);
  }

  donations(slug: string) {
    return Promise.resolve(
      [...this.ledger(slug).values()].filter((e) => e.source.kind === "donation"),
    );
  }

  setTotal(slug: string, to: EntryTarget, total: number) {
    this.totals.set(this.key(slug, to), total);
    return Promise.resolve();
  }

  clear(slug: string) {
    this.ledgers.delete(slug);
    for (const k of [...this.totals.keys()]) if (k.startsWith(`${slug}/`)) this.totals.delete(k);
    return Promise.resolve();
  }
}

const named = (
  t: Partial<TeamRow>,
): t is Partial<TeamRow> & Pick<TeamRow, "id" | "name" | "color"> =>
  typeof t.name === "string" && typeof t.color === "number";

/** In-memory leaderboard summary. */
export class MemoryBoardRepo implements BoardRepo {
  private readonly rows = new Map<string, Map<string, BoardRow>>();
  private readonly teams = new Map<string, Map<string, Partial<TeamRow>>>();
  private readonly recent = new Map<string, RecentAward[]>();

  private board(slug: string) {
    let b = this.rows.get(slug);
    if (!b) this.rows.set(slug, (b = new Map<string, BoardRow>()));
    return b;
  }

  private teamBoard(slug: string) {
    let b = this.teams.get(slug);
    if (!b) this.teams.set(slug, (b = new Map<string, Partial<TeamRow>>()));
    return b;
  }

  upsert(slug: string, row: BoardRow) {
    this.board(slug).set(row.id, row);
    return Promise.resolve();
  }

  remove(slug: string, playerId: string) {
    this.board(slug).delete(playerId);
    return Promise.resolve();
  }

  upsertTeam(slug: string, row: TeamRowPatch) {
    const b = this.teamBoard(slug);
    b.set(row.id, { ...b.get(row.id), ...row });
    return Promise.resolve();
  }

  addRecent(slug: string, award: RecentAward) {
    const list = (this.recent.get(slug) ?? []).filter((a) => a.id !== award.id);
    this.recent.set(slug, [...list, award]);
    return Promise.resolve();
  }

  read(slug: string) {
    const players = [...this.board(slug).values()].sort((a, b) => b.points - a.points);
    const teams = [...this.teamBoard(slug).values()]
      .filter(named)
      .map((t) => ({ id: t.id, name: t.name, color: t.color, points: t.points ?? 0 }))
      .sort((a, b) => b.points - a.points);
    const recent = [...(this.recent.get(slug) ?? [])]
      .sort((a, b) => b.at - a.at)
      .slice(0, RECENT_LIMIT);
    return Promise.resolve({ players, teams, recent });
  }

  replace(slug: string, rows: BoardRow[], teams: TeamRowPatch[] = []) {
    this.rows.set(slug, new Map(rows.map((r) => [r.id, r])));
    for (const t of teams) void this.upsertTeam(slug, t);
    return Promise.resolve();
  }

  clear(slug: string) {
    this.rows.delete(slug);
    this.teams.delete(slug);
    this.recent.delete(slug);
    return Promise.resolve();
  }
}
