import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import { MemoryEventRuntimeRepo } from "@/lib/events";
import { MemoryPlayRepo, type PlayRecord } from "@/lib/games";
import { MemoryPlayerRepo } from "@/lib/players";
import { awardGame, donate, MemoryBoardRepo, MemoryPointsRepo } from "@/lib/points";
import { MemoryTeamRepo, MemoryTeamSummaryRepo, makeCaptain } from "@/lib/teams";
import {
  adjustPoints,
  banPlayer,
  changeStatus,
  clearTestData,
  controlsView,
  giveRestart,
  rebuildPoints,
  removePlayer,
  resetGame,
  scoreJar,
  voidPlayerDonation,
  type AdminDeps,
} from "./service";

const event = holiday2026;
const SLUG = event.slug;
let deps: AdminDeps;
let ids = 0;

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return { status: err.status, message: err.message };
}

const play = (playerId: string, best: number): PlayRecord => ({
  gameId: "trivia",
  playerId,
  deviceUid: "x",
  seed: 1,
  state: {},
  status: "finished",
  points: best,
  best,
  runs: 1,
  scored: true,
});

let mai: { id: string; nickname: string };
let bao: { id: string; nickname: string };

beforeEach(async () => {
  ids = 0;
  deps = {
    teams: new MemoryTeamRepo(),
    summary: new MemoryTeamSummaryRepo(),
    events: new MemoryEventRuntimeRepo(),
    players: new MemoryPlayerRepo(),
    plays: new MemoryPlayRepo(),
    points: { points: new MemoryPointsRepo(), board: new MemoryBoardRepo(), now: () => 1 },
    id: () => `id${String(++ids)}`,
  };
  mai = await deps.players.join(SLUG, "phoneA1", { nickname: "Mai", key: "mai" });
  bao = await deps.players.join(SLUG, "phoneB1", { nickname: "Bao", key: "bao" });
});

const total = (id: string) => deps.points.points.total(SLUG, id);
const board = async () =>
  (await deps.points.board.read(SLUG)).players.map((p) => [p.nickname, p.points]);

describe("controls", () => {
  it("S07-AC3: shows the status and every active player, newest first, with points", async () => {
    await awardGame(deps.points, SLUG, mai, {
      gameId: "trivia",
      title: "Trivia",
      run: 1,
      gain: 60,
      replay: false,
    });
    const view = await controlsView(deps, event);
    expect(view.status).toBe("upcoming");
    expect(view.players.map((p) => [p.nickname, p.points, p.restarts])).toEqual([
      ["Bao", 0, 0],
      ["Mai", 60, 0],
    ]);
  });

  it("S07-AC2: Start, End and Reopen move the status, and only from the right one", async () => {
    await changeStatus(deps, event, "start");
    expect(await deps.events.status(SLUG)).toBe("live");
    expect((await failure(changeStatus(deps, event, "start"))).status).toBe(409);
    await changeStatus(deps, event, "end");
    expect(await deps.events.status(SLUG)).toBe("ended");
    await changeStatus(deps, event, "reopen");
    expect(await deps.events.status(SLUG)).toBe("live");
    expect((await failure(changeStatus(deps, event, "reopen"))).status).toBe(409);
  });

  it("S07-AC4: change points adds a manual award with a reason and updates the board", async () => {
    await adjustPoints(deps, event, mai.id, 50, "Best costume");
    await adjustPoints(deps, event, mai.id, -20, "");
    expect(await total(mai.id)).toBe(30);
    expect(await board()).toEqual([["Mai", 30]]);
    const reasons = (await deps.points.points.entries(SLUG)).map((e) => [e.reason, e.createdBy]);
    expect(reasons).toEqual([
      ["Best costume", "admin"],
      ["Taken away by the host", "admin"],
    ]);
    for (const bad of [0, 1.5])
      expect((await failure(adjustPoints(deps, event, mai.id, bad, "x"))).status).toBe(400);
    expect((await failure(adjustPoints(deps, event, "nobody", 5, "x"))).status).toBe(404);
  });

  it("S07-AC5: give another restart lets the phone start over again", async () => {
    const lan = await deps.players.restart(SLUG, "phoneA1", { nickname: "Lan", key: "lan" }, 1);
    await giveRestart(deps, event, lan.id);
    await expect(
      deps.players.restart(SLUG, "phoneA1", { nickname: "Vy", key: "vy" }, 1),
    ).resolves.toBeTruthy();
  });

  it("S07-AC6: reset a game deletes the play and voids the points it gave", async () => {
    await deps.plays.update(SLUG, "trivia", mai.id, () => play(mai.id, 80));
    await awardGame(deps.points, SLUG, mai, {
      gameId: "trivia",
      title: "Trivia",
      run: 1,
      gain: 60,
      replay: false,
    });
    await awardGame(deps.points, SLUG, mai, {
      gameId: "trivia",
      title: "Trivia",
      run: 2,
      gain: 20,
      replay: true,
    });
    await adjustPoints(deps, event, mai.id, 10, "Bonus");
    await resetGame(deps, event, mai.id, "trivia");
    expect(await deps.plays.get(SLUG, "trivia", mai.id)).toBeNull();
    expect(await total(mai.id)).toBe(10); // the bonus stays
    await resetGame(deps, event, mai.id, "trivia"); // twice: nothing more is voided
    expect(await total(mai.id)).toBe(10);
    expect((await failure(resetGame(deps, event, mai.id, "nope"))).status).toBe(404);
  });

  it("S07-AC7: remove takes a player off; ban also stops the phone joining", async () => {
    await adjustPoints(deps, event, mai.id, 50, "x");
    await adjustPoints(deps, event, bao.id, 40, "x");
    await removePlayer(deps, event, mai.id);
    await banPlayer(deps, event, bao.id);
    expect((await controlsView(deps, event)).players).toEqual([]);
    expect(await board()).toEqual([]);
    await expect(
      deps.players.join(SLUG, "phoneA1", { nickname: "Mai", key: "mai" }),
    ).resolves.toBeTruthy();
    expect((await deps.players.device(SLUG, "phoneB1")).banned).toBe(true);
  });

  it("S07-AC8: rebuild points restores awards from finished plays", async () => {
    await deps.plays.update(SLUG, "trivia", mai.id, () => play(mai.id, 70));
    await rebuildPoints(deps, event);
    expect(await total(mai.id)).toBe(70);
    expect(await board()).toEqual([
      ["Mai", 70],
      ["Bao", 0],
    ]);
  });

  it("S03-AC4: Controls shows teams and each player's team; removing a player takes them off their team", async () => {
    await makeCaptain(deps, event, mai.id);
    const view = await controlsView(deps, event);
    expect(view.teams?.teams.map((t) => t.name)).toEqual(["Team Mai"]);
    expect(view.players.find((p) => p.id === mai.id)?.teamId).toBe(view.teams?.teams[0]?.id);
    await removePlayer(deps, event, mai.id);
    expect((await deps.teams.list(SLUG))[0]?.memberIds).toEqual([]);
  });

  it("S03-AC6: Controls lists donations on request, and the host voids one", async () => {
    await makeCaptain(deps, event, mai.id);
    const team = (await controlsView(deps, event)).teams?.teams[0];
    await adjustPoints(deps, event, bao.id, 40, "Bonus");
    await donate(
      deps.points,
      SLUG,
      bao,
      { id: team?.id ?? "", name: "Team Mai", color: 1 },
      30,
      "d1",
    );
    expect((await controlsView(deps, event)).donations).toBeUndefined();
    expect((await controlsView(deps, event, { donations: true })).donations).toEqual([
      { id: "d1", from: "Bao", team: "Team Mai", points: 30, voided: false },
    ]);
    await voidPlayerDonation(deps, event, "d1");
    expect((await controlsView(deps, event, { donations: true })).donations?.[0]?.voided).toBe(
      true,
    );
    expect(await total(bao.id)).toBe(40);
    expect((await failure(voidPlayerDonation(deps, event, "nope"))).status).toBe(404);
  });

  it("S03-AC5: rebuild restores team plays to the team", async () => {
    await makeCaptain(deps, event, mai.id);
    const teamId = (await controlsView(deps, event)).teams?.teams[0]?.id ?? "";
    await deps.plays.update(SLUG, "team-trivia", teamId, () => ({
      ...play(teamId, 55),
      gameId: "team-trivia",
    }));
    await rebuildPoints(deps, event);
    expect(await deps.points.points.teamTotal(SLUG, teamId)).toBe(55);
    expect(await total(mai.id)).toBe(0);
  });

  it("S17-AC3: scoring the jar pays each guess by how close it is, and re-scoring replaces it", async () => {
    const guess = (id: string, value: number) =>
      deps.plays.update(SLUG, "guessing-jar", id, () => ({
        ...play(id, 0),
        gameId: "guessing-jar",
        state: { guess: value, actual: null, points: null, step: 1 },
      }));
    await guess(mai.id, 300);
    await guess(bao.id, 400);
    expect((await controlsView(deps, event, { jars: true })).jars).toEqual([
      {
        gameId: "guessing-jar",
        title: "Guessing Jar",
        guesses: 2,
        actual: null,
        closest: expect.any(Array) as unknown,
      },
    ]);
    await scoreJar(deps, event, "guessing-jar", 300);
    expect(await total(mai.id)).toBe(100);
    expect(await total(bao.id)).toBe(33);
    const jars = (await controlsView(deps, event, { jars: true })).jars;
    expect(jars?.[0]).toMatchObject({ actual: 300 });
    expect(jars?.[0]?.closest.map((c) => c.nickname)).toEqual(["Mai", "Bao"]);
    expect((await deps.plays.get(SLUG, "guessing-jar", mai.id))?.best).toBe(100);
    // The host miscounted: scoring again replaces the old points.
    await scoreJar(deps, event, "guessing-jar", 400);
    expect(await total(mai.id)).toBe(50);
    expect(await total(bao.id)).toBe(100);
    await scoreJar(deps, event, "guessing-jar", 400);
    expect(await total(bao.id)).toBe(100);
    expect((await failure(scoreJar(deps, event, "trivia", 3))).status).toBe(404);
    expect((await failure(scoreJar(deps, event, "guessing-jar", -1))).status).toBe(400);
  });

  it("S07-AC9: clear test data deletes everything, only while upcoming and after typing CLEAR", async () => {
    await deps.plays.update(SLUG, "trivia", mai.id, () => play(mai.id, 70));
    await adjustPoints(deps, event, mai.id, 50, "x");
    expect((await failure(clearTestData(deps, event, "clear it"))).status).toBe(400);
    await clearTestData(deps, event, " CLEAR ");
    expect((await controlsView(deps, event)).players).toEqual([]);
    expect(await deps.plays.all(SLUG)).toEqual([]);
    expect(await deps.points.points.entries(SLUG)).toEqual([]);
    expect(await deps.points.board.read(SLUG)).toEqual({ players: [], teams: [], recent: [] });
    await changeStatus(deps, event, "start");
    expect(await failure(clearTestData(deps, event, "CLEAR"))).toEqual({
      status: 409,
      message: "Test data can only be cleared before the event starts.",
    });
  });
});
