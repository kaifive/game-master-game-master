import {
  donationIds,
  gameAwardId,
  type BoardRow,
  type EntrySource,
  type EntryTarget,
  type LedgerEntry,
} from "./model";
import type { BoardRepo, PointsRepo, TeamRowPatch } from "./repo";
import { donationsIn, rank, rankTeams, standingsFor, TOP } from "./rules";

export type PointsDeps = { points: PointsRepo; board: BoardRepo; now: () => number };

/** Who gets points: enough to update their leaderboard row. */
export type Recipient = { id: string; nickname: string; teamId?: string | null };

/** A team that gets points: enough to update its leaderboard row (spec 03). */
export type TeamRecipient = { id: string; name: string; color: number };

/** A team playing a team game, as one player (S03-AC5). */
export type TeamCompetitor = { kind: "team" } & TeamRecipient;

type Award = {
  id: string;
  points: number;
  reason: string;
  source: EntrySource;
  createdBy: LedgerEntry["createdBy"];
};

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
  award: Award,
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

/** Writes one award to a team and, if it was new, the team's row and a recent award (S03-AC5). */
export async function awardTeam(
  deps: PointsDeps,
  slug: string,
  team: TeamRecipient,
  award: Award,
): Promise<number> {
  const result = await deps.points.award(slug, { ...award, to: { kind: "team", id: team.id } });
  if (result.applied) {
    await deps.board.upsertTeam(slug, { ...team, points: result.total });
    await deps.board.addRecent(slug, {
      id: award.id,
      playerId: team.id,
      nickname: team.name,
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
  to: Recipient | TeamCompetitor,
  run: { gameId: string; title: string; run: number; gain: number; replay: boolean; key?: string },
): Promise<void> {
  if (run.gain <= 0) return;
  const award: Award = {
    id: run.key
      ? `game_${run.gameId}_${to.id}_${run.key}`
      : gameAwardId(run.gameId, to.id, run.run),
    points: run.gain,
    reason: run.replay ? `${run.title} · new best` : run.title,
    source: { kind: "game", id: run.gameId },
    createdBy: "server",
  };
  // A team game pays the team, never a player (S03-AC5).
  if ("kind" in to) await awardTeam(deps, slug, to, award);
  else await awardPoints(deps, slug, to, award);
}

/**
 * Moves whole points from a player to a team in one transaction (S03-AC6),
 * then updates both rows and announces it ("Mai gave 50 to Team Dragon").
 */
export async function donate(
  deps: PointsDeps,
  slug: string,
  from: Recipient,
  team: TeamRecipient,
  points: number,
  id: string,
): Promise<{ player: number; team: number }> {
  const result = await deps.points.donate(slug, {
    id,
    playerId: from.id,
    teamId: team.id,
    points,
  });
  if (result.applied) {
    await deps.board.upsert(slug, row(from, result.player));
    await deps.board.upsertTeam(slug, { ...team, points: result.team });
    await deps.board.addRecent(slug, {
      id: donationIds(id).to,
      playerId: team.id,
      nickname: team.name,
      points,
      reason: "Donation",
      from: from.nickname,
      at: deps.now(),
    });
  }
  return { player: result.player, team: result.team };
}

/**
 * Voids both entries of a donation (S03-AC6). `active` gives the giver's row
 * while they're still playing; a forfeited player stays off the board.
 */
export async function voidDonation(
  deps: PointsDeps,
  slug: string,
  donationId: string,
  reason: string,
  active: (playerId: string) => Recipient | null,
): Promise<boolean> {
  const ids = donationIds(donationId);
  const [player, team] = await Promise.all([
    deps.points.voidEntry(slug, ids.from, reason, "admin"),
    deps.points.voidEntry(slug, ids.to, reason, "admin"),
  ]);
  if (!player || !team) return false;
  const giver = active(player.to.id);
  if (player.applied && giver) await deps.board.upsert(slug, row(giver, player.total));
  if (team.applied) await deps.board.upsertTeam(slug, { id: team.to.id, points: team.total });
  return true;
}

/** Every donation in the event, for Controls (S03-AC6). */
export const donations = async (deps: PointsDeps, slug: string) =>
  donationsIn(await deps.points.donations(slug));

/** A player who starts over takes back every donation they made (S03-AC7). */
export async function voidDonationsFrom(deps: PointsDeps, slug: string, playerId: string) {
  for (const d of await donations(deps, slug))
    if (d.playerId === playerId && !d.voided)
      await voidDonation(deps, slug, d.id, "Player started over", () => null);
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
  if (result.applied && result.to.kind === "player")
    await deps.board.upsert(slug, row(nicknameOf(result.to.id), result.total));
  if (result.applied && result.to.kind === "team")
    await deps.board.upsertTeam(slug, { id: result.to.id, points: result.total });
  return result.total;
}

/** A player who starts over leaves the leaderboard (S04-AC5). */
export const removeFromBoard = (deps: PointsDeps, slug: string, playerId: string) =>
  deps.board.remove(slug, playerId);

/** The player's points from the ledger (S04-AC7). */
export const pointsOf = (deps: PointsDeps, slug: string, playerId: string) =>
  deps.points.total(slug, playerId);

const keyOf = (to: EntryTarget) => `${to.kind}/${to.id}`;

/**
 * Recomputes every active player's and team's points from the ledger, first
 * adding any game award missing for a finished play, then rewrites the board
 * (S04-AC6). A team game's play is the team's (`team: true`, S03-AC5).
 */
export async function rebuild(
  deps: PointsDeps,
  slug: string,
  players: Recipient[],
  plays: { gameId: string; playerId: string; best: number; title: string; team?: boolean }[],
  teams: TeamRecipient[] = [],
): Promise<void> {
  const entries = await deps.points.entries(slug);
  const fromGame = new Map<string, number>();
  for (const e of entries)
    if (e.source.kind === "game") {
      const key = `${keyOf(e.to)}/${e.source.id}`;
      fromGame.set(key, (fromGame.get(key) ?? 0) + e.points);
    }
  for (const p of plays) {
    const to: EntryTarget = { kind: p.team ? "team" : "player", id: p.playerId };
    const missing = p.best - (fromGame.get(`${keyOf(to)}/${p.gameId}`) ?? 0);
    if (missing > 0)
      await deps.points.award(slug, {
        id: `game_${p.gameId}_${p.playerId}_fix_${String(p.best)}`,
        points: missing,
        to,
        reason: `${p.title} (restored)`,
        source: { kind: "game", id: p.gameId },
        createdBy: "server",
      });
  }
  const totals = new Map<string, number>();
  for (const e of await deps.points.entries(slug))
    totals.set(keyOf(e.to), (totals.get(keyOf(e.to)) ?? 0) + e.points);
  const sum = (kind: EntryTarget["kind"], id: string) => totals.get(keyOf({ kind, id })) ?? 0;
  for (const p of players)
    await deps.points.setTotal(slug, { kind: "player", id: p.id }, sum("player", p.id));
  for (const t of teams)
    await deps.points.setTotal(slug, { kind: "team", id: t.id }, sum("team", t.id));
  const teamRows: TeamRowPatch[] = teams.map((t) => ({ ...t, points: sum("team", t.id) }));
  await deps.board.replace(
    slug,
    players.map((p) => row(p, sum("player", p.id))),
    teamRows,
  );
}

/** Top players beside the team bars on the TV in the team phase (S03-AC8). */
export const TEAM_PHASE_TOP = 5;

/**
 * The phone's leaderboard: top 10 and the player's own place (S05-AC2), and
 * in the team phase the teams and the player's team's place (S03-AC8).
 */
export async function phoneStandings(
  deps: PointsDeps,
  slug: string,
  playerId: string | null,
  team: { phase: "individual" | "team"; teamId: string | null } = {
    phase: "individual",
    teamId: null,
  },
) {
  const board = await deps.board.read(slug);
  const teams = team.phase === "team" ? rankTeams(board.teams) : [];
  const mine = team.teamId ? teams.find((t) => t.id === team.teamId) : undefined;
  return {
    ...standingsFor(board.players, playerId),
    phase: team.phase,
    teams,
    myTeam: mine ? { id: mine.id, rank: mine.rank, points: mine.points } : null,
  };
}

/** The display's leaderboard and the latest awards (S05-AC4, AC5); teams first in the team phase (S03-AC8). */
export async function displayStandings(
  deps: PointsDeps,
  slug: string,
  phase: "individual" | "team" = "individual",
) {
  const board = await deps.board.read(slug);
  return {
    phase,
    players: rank(board.players).slice(0, phase === "team" ? TEAM_PHASE_TOP : TOP),
    teams: phase === "team" ? rankTeams(board.teams) : [],
    recent: board.recent.map(({ id, nickname, points, reason, at, from }) => ({
      id,
      nickname,
      points,
      reason,
      at,
      ...(from ? { from } : {}),
    })),
  };
}
