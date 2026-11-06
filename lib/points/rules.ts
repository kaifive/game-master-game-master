import type { BoardRow, RecentAward } from "./model";

/** A leaderboard row with its rank, as phones and the display see it (no team yet). */
export type Ranked = { id: string; rank: number; nickname: string; points: number };

export const TOP = 10;

/** Highest first; ties share a rank: 1, 2, 2, 4 (S05-AC1). Same-score rows keep name order. */
export function rank(rows: BoardRow[]): Ranked[] {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname),
  );
  let last: { points: number; rank: number } | null = null;
  return sorted.map((r, i) => {
    const place = last && last.points === r.points ? last.rank : i + 1;
    last = { points: r.points, rank: place };
    return { id: r.id, rank: place, nickname: r.nickname, points: r.points };
  });
}

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
export function leadChange(
  previousLeader: string | null | undefined,
  next: Ranked[],
): Ranked | null {
  const leader = next[0];
  if (previousLeader === undefined || !leader || leader.points <= 0) return null;
  return leader.id !== previousLeader ? leader : null;
}
