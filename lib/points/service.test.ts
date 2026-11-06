import { beforeEach, describe, expect, it } from "vitest";
import { MemoryBoardRepo, MemoryPointsRepo } from "./repo.memory";
import {
  awardGame,
  awardPoints,
  pointsOf,
  rebuild,
  removeFromBoard,
  voidPoints,
  type PointsDeps,
} from "./service";

const SLUG = "holiday-2026";
const mai = { id: "p1", nickname: "Mai" };
const bao = { id: "p2", nickname: "Bao" };
let deps: PointsDeps;
let clock = 1000;

beforeEach(() => {
  clock = 1000;
  deps = { points: new MemoryPointsRepo(), board: new MemoryBoardRepo(), now: () => clock++ };
});

const trivia = (run: number, gain: number, replay = run > 1) => ({
  gameId: "trivia",
  title: "Holiday Trivia",
  run,
  gain,
  replay,
});

describe("points service", () => {
  it("S04-AC1: a finished run awards its improvement once; no gain, no award", async () => {
    await awardGame(deps, SLUG, mai, trivia(1, 60));
    await awardGame(deps, SLUG, mai, trivia(1, 60)); // a retry of the same run
    await awardGame(deps, SLUG, mai, trivia(2, 0)); // a worse replay
    await awardGame(deps, SLUG, mai, trivia(3, 20)); // a better replay: only the gain
    expect(await pointsOf(deps, SLUG, "p1")).toBe(80);
    expect(await deps.points.entries(SLUG)).toHaveLength(2);
  });

  it("S04-AC4: each award updates the row and the recent awards; replays say new best", async () => {
    await awardGame(deps, SLUG, mai, trivia(1, 60, false));
    await awardGame(deps, SLUG, mai, trivia(2, 20));
    await awardGame(deps, SLUG, bao, trivia(1, 90, false));
    const board = await deps.board.read(SLUG);
    expect(board.players.map((p) => [p.nickname, p.points])).toEqual([
      ["Bao", 90],
      ["Mai", 80],
    ]);
    expect(board.recent.map((r) => [r.nickname, r.points, r.reason])).toEqual([
      ["Bao", 90, "Holiday Trivia"],
      ["Mai", 20, "Holiday Trivia · new best"],
      ["Mai", 60, "Holiday Trivia"],
    ]);
  });

  it("S04-AC2 S04-AC3: manual awards, deductions and voids keep points equal to the ledger", async () => {
    await awardPoints(deps, SLUG, mai, {
      id: "m1",
      points: 50,
      reason: "Best costume",
      source: { kind: "manual", id: "admin" },
      createdBy: "admin",
    });
    await awardPoints(deps, SLUG, mai, {
      id: "m2",
      points: -20,
      reason: "Fix",
      source: { kind: "manual", id: "admin" },
      createdBy: "admin",
    });
    expect(await voidPoints(deps, SLUG, "m1", "Wrong player", () => mai)).toBe(-20);
    expect(await voidPoints(deps, SLUG, "nope", "x", () => mai)).toBeNull();
    const sum = (await deps.points.entries(SLUG)).reduce((t, e) => t + e.points, 0);
    expect(await pointsOf(deps, SLUG, "p1")).toBe(sum);
    expect((await deps.board.read(SLUG)).players[0]?.points).toBe(-20);
  });

  it("S04-AC5: a player who starts over leaves the leaderboard", async () => {
    await awardGame(deps, SLUG, mai, trivia(1, 60, false));
    await removeFromBoard(deps, SLUG, "p1");
    expect((await deps.board.read(SLUG)).players).toEqual([]);
  });

  it("S04-AC6: rebuild restores missing game awards and recomputes points and the board", async () => {
    await awardGame(deps, SLUG, mai, trivia(1, 60, false));
    await deps.points.setTotal(SLUG, "p1", 999); // a total gone wrong
    await rebuild(
      deps,
      SLUG,
      [mai, bao],
      [
        { gameId: "trivia", playerId: "p1", best: 60, title: "Holiday Trivia" },
        { gameId: "trivia", playerId: "p2", best: 45, title: "Holiday Trivia" }, // award never written
      ],
    );
    expect(await pointsOf(deps, SLUG, "p1")).toBe(60);
    expect(await pointsOf(deps, SLUG, "p2")).toBe(45);
    expect((await deps.board.read(SLUG)).players.map((p) => [p.nickname, p.points])).toEqual([
      ["Mai", 60],
      ["Bao", 45],
    ]);
    // Running it again changes nothing.
    await rebuild(
      deps,
      SLUG,
      [mai, bao],
      [{ gameId: "trivia", playerId: "p2", best: 45, title: "Holiday Trivia" }],
    );
    expect(await pointsOf(deps, SLUG, "p2")).toBe(45);
  });
});
