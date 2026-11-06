import { gameAwardId, type BoardRow, type EntrySource, type LedgerEntry } from "./model";
import type { BoardRepo, PointsRepo } from "./repo";

export type PointsDeps = { points: PointsRepo; board: BoardRepo; now: () => number };

/** Who gets points: enough to update their leaderboard row. */
export type Recipient = { id: string; nickname: string; teamId?: string | null };

const row = (p: Recipient, points: number): BoardRow => ({
  id: p.id,
  nickname: p.nickname,
  teamId: p.teamId ?? null,
  points,
});

/** Writes one award and, if it was new, the player's row and a recent award (S04-AC2, AC4). */
export async function awardPoints(
  deps: PointsDeps,
  slug: string,
  to: Recipient,
  award: {
    id: string;
    points: number;
    reason: string;
    source: EntrySource;
    createdBy: LedgerEntry["createdBy"];
  },
): Promise<number> {
  const result = await deps.points.award(slug, { ...award, to: { kind: "player", id: to.id } });
  if (result.applied) {
    await deps.board.upsert(slug, row(to, result.total));
    await deps.board.addRecent(slug, {
      id: award.id,
      playerId: to.id,
      nickname: to.nickname,
      points: award.points,
      reason: award.reason,
      at: deps.now(),
    });
  }
  return result.total;
}

/**
 * A finished run's award: the improvement on the player's best, once per run
 * (S04-AC1). A replay's award is marked "new best" (S04-AC4).
 */
export async function awardGame(
  deps: PointsDeps,
  slug: string,
  to: Recipient,
  run: { gameId: string; title: string; run: number; gain: number; replay: boolean },
): Promise<void> {
  if (run.gain <= 0) return;
  await awardPoints(deps, slug, to, {
    id: gameAwardId(run.gameId, to.id, run.run),
    points: run.gain,
    reason: run.replay ? `${run.title} · new best` : run.title,
    source: { kind: "game", id: run.gameId },
    createdBy: "server",
  });
}

/** Reverses an entry (S04-AC2) and updates the player's row. */
export async function voidPoints(
  deps: PointsDeps,
  slug: string,
  entryId: string,
  reason: string,
  nicknameOf: (playerId: string) => Recipient,
): Promise<number | null> {
  const result = await deps.points.voidEntry(slug, entryId, reason, "admin");
  if (!result) return null;
  if (result.applied) await deps.board.upsert(slug, row(nicknameOf(result.playerId), result.total));
  return result.total;
}

/** A player who starts over leaves the leaderboard (S04-AC5). */
export const removeFromBoard = (deps: PointsDeps, slug: string, playerId: string) =>
  deps.board.remove(slug, playerId);

/** The player's points from the ledger (S04-AC7). */
export const pointsOf = (deps: PointsDeps, slug: string, playerId: string) =>
  deps.points.total(slug, playerId);

/**
 * Recomputes every active player's points from the ledger, first adding any
 * game award missing for a finished play, then rewrites the board (S04-AC6).
 */
export async function rebuild(
  deps: PointsDeps,
  slug: string,
  players: Recipient[],
  plays: { gameId: string; playerId: string; best: number; title: string }[],
): Promise<void> {
  const entries = await deps.points.entries(slug);
  const fromGame = new Map<string, number>();
  for (const e of entries)
    if (e.source.kind === "game") {
      const key = `${e.to.id}/${e.source.id}`;
      fromGame.set(key, (fromGame.get(key) ?? 0) + e.points);
    }
  for (const p of plays) {
    const missing = p.best - (fromGame.get(`${p.playerId}/${p.gameId}`) ?? 0);
    if (missing > 0)
      await deps.points.award(slug, {
        id: `game_${p.gameId}_${p.playerId}_fix_${String(p.best)}`,
        points: missing,
        to: { kind: "player", id: p.playerId },
        reason: `${p.title} (restored)`,
        source: { kind: "game", id: p.gameId },
        createdBy: "server",
      });
  }
  const totals = new Map<string, number>();
  for (const e of await deps.points.entries(slug))
    totals.set(e.to.id, (totals.get(e.to.id) ?? 0) + e.points);
  for (const p of players) await deps.points.setTotal(slug, p.id, totals.get(p.id) ?? 0);
  await deps.board.replace(
    slug,
    players.map((p) => row(p, totals.get(p.id) ?? 0)),
  );
}
