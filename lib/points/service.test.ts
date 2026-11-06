import { beforeEach, describe, expect, it } from "vitest";
import { MemoryBoardRepo, MemoryPointsRepo } from "./repo.memory";
import {
  awardGame,
  awardPoints,
  displayStandings,
  donate,
  donations,
  phoneStandings,
  pointsOf,
  rebuild,
  removeFromBoard,
  voidDonation,
  voidDonationsFrom,
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
    await deps.points.setTotal(SLUG, { kind: "player", id: "p1" }, 999); // a total gone wrong
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

describe("team points", () => {
  const dragons = { id: "t1", name: "Dragons", color: 1 };
  const elves = { id: "t2", name: "Elves", color: 2 };
  const teamGame = (gain: number) =>
    awardGame(deps, SLUG, { kind: "team", ...dragons }, trivia(1, gain, false));

  it("S03-AC5: a team game pays the team, never a player, and says so on the TV", async () => {
    await teamGame(70);
    expect(await deps.points.teamTotal(SLUG, "t1")).toBe(70);
    const board = await deps.board.read(SLUG);
    expect(board.players).toEqual([]);
    expect(board.teams).toEqual([{ ...dragons, points: 70 }]);
    expect(board.recent[0]).toMatchObject({ nickname: "Dragons", points: 70 });
  });

  it("S03-AC6: a donation lowers the player, raises the team, and is announced", async () => {
    await awardGame(deps, SLUG, mai, trivia(1, 80, false));
    expect(await donate(deps, SLUG, mai, dragons, 50, "d1")).toEqual({ player: 30, team: 50 });
    const board = await deps.board.read(SLUG);
    expect(board.players[0]).toMatchObject({ id: "p1", points: 30 });
    expect(board.teams[0]).toMatchObject({ id: "t1", points: 50 });
    expect(board.recent[0]).toMatchObject({ nickname: "Dragons", points: 50, from: "Mai" });
    expect((await displayStandings(deps, SLUG)).recent[0]).toMatchObject({ from: "Mai" });
    await expect(donate(deps, SLUG, mai, dragons, 31, "d2")).rejects.toMatchObject({
      message: "You have 30 points to give.",
    });
    await expect(donate(deps, SLUG, bao, dragons, 1, "d3")).rejects.toMatchObject({
      message: "You have no points to give yet. Play a game first.",
    });
    await expect(donate(deps, SLUG, mai, dragons, 2.5, "d4")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("S03-AC6: the host voids a donation: both entries, once", async () => {
    await awardGame(deps, SLUG, mai, trivia(1, 80, false));
    await donate(deps, SLUG, mai, dragons, 50, "d1");
    expect(await voidDonation(deps, SLUG, "d1", "Host", () => mai)).toBe(true);
    expect(await voidDonation(deps, SLUG, "d1", "Host", () => mai)).toBe(true);
    expect(await voidDonation(deps, SLUG, "nope", "Host", () => mai)).toBe(false);
    expect(await pointsOf(deps, SLUG, "p1")).toBe(80);
    expect(await deps.points.teamTotal(SLUG, "t1")).toBe(0);
    expect((await deps.board.read(SLUG)).players[0]?.points).toBe(80);
    expect(await donations(deps, SLUG)).toEqual([
      { id: "d1", playerId: "p1", teamId: "t1", points: 50, voided: true },
    ]);
  });

  it("S03-AC7: starting over voids the player's donations; they stay off the board", async () => {
    await awardGame(deps, SLUG, mai, trivia(1, 80, false));
    await awardGame(deps, SLUG, bao, trivia(1, 60, false));
    await donate(deps, SLUG, mai, dragons, 30, "d1");
    await donate(deps, SLUG, mai, elves, 20, "d2");
    await donate(deps, SLUG, bao, dragons, 10, "d3");
    await removeFromBoard(deps, SLUG, "p1");
    await voidDonationsFrom(deps, SLUG, "p1");
    expect(await deps.points.teamTotal(SLUG, "t1")).toBe(10);
    expect(await deps.points.teamTotal(SLUG, "t2")).toBe(0);
    expect((await deps.board.read(SLUG)).players.map((p) => p.id)).toEqual(["p2"]);
  });

  it("S03-AC8: team score is team awards plus donations; phones and the TV show teams in the team phase", async () => {
    await teamGame(40);
    await awardGame(deps, SLUG, mai, trivia(1, 80, false));
    await donate(deps, SLUG, mai, elves, 60, "d1");
    await deps.board.upsertTeam(SLUG, { ...dragons });
    await deps.board.upsertTeam(SLUG, { ...elves });
    const phone = await phoneStandings(deps, SLUG, "p1", { phase: "team", teamId: "t1" });
    expect(phone.teams.map((t) => [t.name, t.rank, t.points])).toEqual([
      ["Elves", 1, 60],
      ["Dragons", 2, 40],
    ]);
    expect(phone.myTeam).toEqual({ id: "t1", rank: 2, points: 40 });
    expect(phone.me).toEqual({ rank: 1, points: 20 });
    const solo = await phoneStandings(deps, SLUG, "p1");
    expect(solo.teams).toEqual([]);
    expect(solo.myTeam).toBeNull();
    for (const name of ["A", "B", "C", "D", "E", "F"])
      await awardPoints(
        deps,
        SLUG,
        { id: name, nickname: name },
        {
          id: `m${name}`,
          points: 5,
          reason: "Bonus",
          source: { kind: "manual", id: "admin" },
          createdBy: "admin",
        },
      );
    const tv = await displayStandings(deps, SLUG, "team");
    expect(tv.teams.map((t) => t.name)).toEqual(["Elves", "Dragons"]);
    expect(tv.players).toHaveLength(5);
    expect((await displayStandings(deps, SLUG)).teams).toEqual([]);
  });

  it("S03-AC5 S04-AC6: rebuild restores team plays and team totals", async () => {
    await teamGame(40);
    await deps.points.setTotal(SLUG, { kind: "team", id: "t1" }, 999);
    await rebuild(
      deps,
      SLUG,
      [],
      [
        { gameId: "trivia", playerId: "t1", best: 40, title: "Team Trivia", team: true },
        { gameId: "trivia", playerId: "t2", best: 25, title: "Team Trivia", team: true },
      ],
      [dragons, elves],
    );
    expect(await deps.points.teamTotal(SLUG, "t1")).toBe(40);
    expect(await deps.points.teamTotal(SLUG, "t2")).toBe(25);
    expect((await deps.board.read(SLUG)).teams.map((t) => [t.name, t.points])).toEqual([
      ["Dragons", 40],
      ["Elves", 25],
    ]);
  });
});
