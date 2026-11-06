import { AppError } from "@/lib/errors";
import type { BoardRow, EntryTarget, LedgerEntry, RecentAward, TeamRow } from "./model";

/** A leaderboard row with its rank, as phones and the display see it. */
export type Ranked = { id: string; rank: number; nickname: string; points: number };

/** A team's row with its rank (spec 03). */
export type RankedTeam = { id: string; rank: number; name: string; color: number; points: number };

export const TOP = 10;

/** Highest first; ties share a rank: 1, 2, 2, 4. Same-score rows keep name order. */
function places<T extends { points: number }>(rows: T[], name: (r: T) => string) {
  const sorted = [...rows].sort((a, b) => b.points - a.points || name(a).localeCompare(name(b)));
  let last: { points: number; rank: number } | null = null;
  return sorted.map((r, i) => {
    const place = last && last.points === r.points ? last.rank : i + 1;
    last = { points: r.points, rank: place };
    return { row: r, rank: place };
  });
}

/** Highest first; ties share a rank: 1, 2, 2, 4 (S05-AC1). Same-score rows keep name order. */
export const rank = (rows: BoardRow[]): Ranked[] =>
  places(rows, (r) => r.nickname).map(({ row, rank }) => ({
    id: row.id,
    rank,
    nickname: row.nickname,
    points: row.points,
  }));

/** Teams ranked the same way (S03-AC8). */
export const rankTeams = (rows: TeamRow[]): RankedTeam[] =>
  places(rows, (r) => r.name).map(({ row, rank }) => ({ ...row, rank }));

/** The phone's view: the top 10, and the player's own place wherever it is (S05-AC2). */
export function standingsFor(rows: BoardRow[], playerId: string | null) {
  const ranked = rank(rows);
  const mine = playerId ? ranked.find((r) => r.id === playerId) : undefined;
  return { top: ranked.slice(0, TOP), me: mine ? { rank: mine.rank, points: mine.points } : null };
}

/** Awards that weren't in the last update. The first update has none to announce (S05-AC5). */
export function newAwards<A extends Pick<RecentAward, "id" | "at">>(
  previous: A[] | null,
  next: A[],
): A[] {
  if (!previous) return [];
  const seen = new Set(previous.map((a) => a.id));
  return next.filter((a) => !seen.has(a.id)).sort((a, b) => a.at - b.at);
}

/** The new leader, if first place changed hands since the last update (S05-AC6). */
export function leadChange<R extends { id: string; points: number }>(
  previousLeader: string | null | undefined,
  next: R[],
): R | null {
  const leader = next[0];
  if (previousLeader === undefined || !leader || leader.points <= 0) return null;
  return leader.id !== previousLeader ? leader : null;
}

/** Why a donation can't go through, or null when it can (S03-AC6). */
export function donationRefused(has: number, points: number): string | null {
  if (!Number.isInteger(points) || points < 1) return "Give a whole number of points, 1 or more.";
  if (points > has)
    return has > 0
      ? `You have ${String(has)} points to give.`
      : "You have no points to give yet. Play a game first.";
  return null;
}

export const recipientMissing = (to: EntryTarget) =>
  new AppError(
    "NOT_FOUND",
    to.kind === "team" ? "We couldn't find that team." : "We couldn't find that player.",
  );

/** One donation for Controls: who gave how much to which team, and whether it was voided. */
export type Donation = {
  id: string;
  playerId: string;
  teamId: string;
  points: number;
  voided: boolean;
};

/** The donations in a ledger (S03-AC6). */
export function donationsIn(entries: LedgerEntry[]): Donation[] {
  const voided = new Set(entries.flatMap((e) => (e.voids ? [e.voids] : [])));
  return entries.flatMap((e) =>
    e.kind === "award" && e.source.kind === "donation" && e.to.kind === "team" && e.from
      ? [
          {
            id: e.source.id,
            playerId: e.from.id,
            teamId: e.to.id,
            points: e.points,
            voided: voided.has(e.id),
          },
        ]
      : [],
  );
}
