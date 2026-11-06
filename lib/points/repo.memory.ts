import { AppError } from "@/lib/errors";
import {
  RECENT_LIMIT,
  type BoardRow,
  type LedgerEntry,
  type NewAward,
  type RecentAward,
} from "./model";
import type { BoardRepo, PointsRepo } from "./repo";

/** In-memory ledger: for tests, and local runs without Firebase. */
export class MemoryPointsRepo implements PointsRepo {
  private readonly ledgers = new Map<string, Map<string, LedgerEntry>>();
  private readonly totals = new Map<string, number>();

  constructor(private readonly players: (slug: string, playerId: string) => boolean = () => true) {}

  private ledger(slug: string) {
    let l = this.ledgers.get(slug);
    if (!l) this.ledgers.set(slug, (l = new Map<string, LedgerEntry>()));
    return l;
  }

  private add(slug: string, entry: LedgerEntry) {
    this.ledger(slug).set(entry.id, entry);
    const key = `${slug}/${entry.to.id}`;
    const total = (this.totals.get(key) ?? 0) + entry.points;
    this.totals.set(key, total);
    return total;
  }

  award(slug: string, award: NewAward) {
    if (this.ledger(slug).has(award.id))
      return Promise.resolve({
        applied: false,
        total: this.totals.get(`${slug}/${award.to.id}`) ?? 0,
      });
    if (!this.players(slug, award.to.id))
      return Promise.reject(new AppError("NOT_FOUND", "We couldn't find that player."));
    return Promise.resolve({ applied: true, total: this.add(slug, { ...award, kind: "award" }) });
  }

  voidEntry(slug: string, entryId: string, reason: string, createdBy: LedgerEntry["createdBy"]) {
    const original = this.ledger(slug).get(entryId);
    if (!original) return Promise.resolve(null);
    const id = `void_${entryId}`;
    const playerId = original.to.id;
    if (this.ledger(slug).has(id))
      return Promise.resolve({
        applied: false,
        total: this.totals.get(`${slug}/${playerId}`) ?? 0,
        playerId,
      });
    const total = this.add(slug, {
      id,
      kind: "void",
      points: -original.points,
      to: original.to,
      reason,
      source: original.source,
      voids: entryId,
      createdBy,
    });
    return Promise.resolve({ applied: true, total, playerId });
  }

  total(slug: string, playerId: string) {
    return Promise.resolve(this.totals.get(`${slug}/${playerId}`) ?? 0);
  }

  entries(slug: string) {
    return Promise.resolve([...this.ledger(slug).values()]);
  }

  setTotal(slug: string, playerId: string, total: number) {
    this.totals.set(`${slug}/${playerId}`, total);
    return Promise.resolve();
  }
}

/** In-memory leaderboard summary. */
export class MemoryBoardRepo implements BoardRepo {
  private readonly rows = new Map<string, Map<string, BoardRow>>();
  private readonly recent = new Map<string, RecentAward[]>();

  private board(slug: string) {
    let b = this.rows.get(slug);
    if (!b) this.rows.set(slug, (b = new Map<string, BoardRow>()));
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

  addRecent(slug: string, award: RecentAward) {
    const list = (this.recent.get(slug) ?? []).filter((a) => a.id !== award.id);
    this.recent.set(slug, [...list, award]);
    return Promise.resolve();
  }

  read(slug: string) {
    const players = [...this.board(slug).values()].sort((a, b) => b.points - a.points);
    const recent = [...(this.recent.get(slug) ?? [])]
      .sort((a, b) => b.at - a.at)
      .slice(0, RECENT_LIMIT);
    return Promise.resolve({ players, recent });
  }

  replace(slug: string, rows: BoardRow[]) {
    this.rows.set(slug, new Map(rows.map((r) => [r.id, r])));
    return Promise.resolve();
  }
}
