import { expect, test } from "vitest";
import type { NewAward } from "./model";
import type { BoardRepo, PointsRepo } from "./repo";

const SLUG = "holiday-2026";
const award = (id: string, playerId: string, points: number): NewAward => ({
  id,
  points,
  to: { kind: "player", id: playerId },
  reason: "Holiday Trivia",
  source: { kind: "game", id: "trivia" },
  createdBy: "server",
});

/** The same behavior from every PointsRepo (ADR-016). `make` seeds players p1 and p2, and team t1. */
export function pointsRepoContract(make: () => Promise<PointsRepo>) {
  test("S04-AC1 S04-AC3: an award adds to the player's points, once per id", async () => {
    const repo = await make();
    expect(await repo.award(SLUG, award("a1", "p1", 80))).toEqual({ applied: true, total: 80 });
    expect(await repo.award(SLUG, award("a1", "p1", 80))).toEqual({ applied: false, total: 80 });
    expect(await repo.award(SLUG, award("a2", "p1", -30))).toEqual({ applied: true, total: 50 });
    expect(await repo.total(SLUG, "p1")).toBe(50);
    expect(await repo.total(SLUG, "p2")).toBe(0);
  });

  test("S04-AC2: a void reverses an entry once and keeps the original", async () => {
    const repo = await make();
    await repo.award(SLUG, award("a1", "p1", 80));
    expect(await repo.voidEntry(SLUG, "a1", "Mistake", "admin")).toEqual({
      applied: true,
      total: 0,
      to: { kind: "player", id: "p1" },
    });
    expect(await repo.voidEntry(SLUG, "a1", "Mistake", "admin")).toMatchObject({ applied: false });
    expect(await repo.voidEntry(SLUG, "nope", "Mistake", "admin")).toBeNull();
    const entries = await repo.entries(SLUG);
    expect(entries.map((e) => [e.id, e.kind, e.points]).sort()).toEqual([
      ["a1", "award", 80],
      ["void_a1", "void", -80],
    ]);
  });

  test("S04-AC8: concurrent awards to one player all count", async () => {
    const repo = await make();
    await Promise.all(
      Array.from({ length: 5 }, (_, i) => repo.award(SLUG, award(`c${String(i)}`, "p1", 10))),
    );
    expect(await repo.total(SLUG, "p1")).toBe(50);
  });

  test("S07-AC9: clearing deletes the event's ledger", async () => {
    const repo = await make();
    await repo.award(SLUG, award("a1", "p1", 80));
    await repo.clear(SLUG);
    expect(await repo.entries(SLUG)).toEqual([]);
  });

  test("S03-AC5: a team award pays the team, never a player", async () => {
    const repo = await make();
    const toTeam: NewAward = { ...award("g1", "t1", 70), to: { kind: "team", id: "t1" } };
    expect(await repo.award(SLUG, toTeam)).toEqual({ applied: true, total: 70 });
    expect(await repo.teamTotal(SLUG, "t1")).toBe(70);
    expect(await repo.total(SLUG, "p1")).toBe(0);
  });

  test("S03-AC6: a donation moves whole points to a team once, up to the player's points", async () => {
    const repo = await make();
    await repo.award(SLUG, award("a1", "p1", 80));
    const gift = { id: "d1", playerId: "p1", teamId: "t1", points: 50 };
    expect(await repo.donate(SLUG, gift)).toEqual({ applied: true, player: 30, team: 50 });
    expect(await repo.donate(SLUG, gift)).toEqual({ applied: false, player: 30, team: 50 });
    await expect(repo.donate(SLUG, { ...gift, id: "d2", points: 31 })).rejects.toMatchObject({
      status: 400,
    });
    expect(await repo.total(SLUG, "p1")).toBe(30);
    expect(await repo.teamTotal(SLUG, "t1")).toBe(50);
    const donations = await repo.donations(SLUG);
    expect(donations.map((e) => [e.id, e.to.kind, e.points, e.from?.id]).sort()).toEqual([
      ["donation_d1", "player", -50, undefined],
      ["donation_d1_team", "team", 50, "p1"],
    ]);
    expect(await repo.voidEntry(SLUG, "donation_d1_team", "Host", "admin")).toEqual({
      applied: true,
      total: 0,
      to: { kind: "team", id: "t1" },
    });
  });

  test("S03-AC6: two donations racing for the same points can't both go through", async () => {
    const repo = await make();
    await repo.award(SLUG, award("a1", "p1", 50));
    const results = await Promise.allSettled(
      ["d1", "d2"].map((id) => repo.donate(SLUG, { id, playerId: "p1", teamId: "t1", points: 40 })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await repo.total(SLUG, "p1")).toBe(10);
    expect(await repo.teamTotal(SLUG, "t1")).toBe(40);
  });

  test("S04-AC6: rebuild can set a player's total", async () => {
    const repo = await make();
    await repo.award(SLUG, award("a1", "p1", 80));
    await repo.setTotal(SLUG, { kind: "player", id: "p1" }, 120);
    expect(await repo.total(SLUG, "p1")).toBe(120);
  });
}

/** The same behavior from every BoardRepo (ADR-016). */
export function boardRepoContract(make: () => Promise<BoardRepo>) {
  test("S04-AC4: rows are kept per player, highest first; recent awards newest first", async () => {
    const board = await make();
    await board.upsert(SLUG, { id: "p1", nickname: "Mai", teamId: null, points: 40 });
    await board.upsert(SLUG, { id: "p2", nickname: "Bao", teamId: null, points: 90 });
    await board.upsert(SLUG, { id: "p1", nickname: "Mai", teamId: null, points: 120 });
    await board.addRecent(SLUG, {
      id: "a1",
      playerId: "p1",
      nickname: "Mai",
      points: 40,
      reason: "Trivia",
      at: 1,
    });
    await board.addRecent(SLUG, {
      id: "a2",
      playerId: "p2",
      nickname: "Bao",
      points: 90,
      reason: "Trivia",
      at: 2,
    });
    const read = await board.read(SLUG);
    expect(read.players.map((p) => [p.nickname, p.points])).toEqual([
      ["Mai", 120],
      ["Bao", 90],
    ]);
    expect(read.recent.map((r) => r.id)).toEqual(["a2", "a1"]);
    expect((await board.read("spring-2027")).players).toEqual([]);
  });

  test("S07-AC9: clearing deletes the whole summary", async () => {
    const board = await make();
    await board.upsert(SLUG, { id: "p1", nickname: "Mai", teamId: null, points: 40 });
    await board.addRecent(SLUG, {
      id: "a1",
      playerId: "p1",
      nickname: "Mai",
      points: 40,
      reason: "Trivia",
      at: 1,
    });
    await board.clear(SLUG);
    expect(await board.read(SLUG)).toEqual({ players: [], teams: [], recent: [] });
  });

  test("S03-AC8: team rows merge points with name and color; unnamed rows stay hidden", async () => {
    const board = await make();
    await board.upsertTeam(SLUG, { id: "t1", points: 30 });
    expect((await board.read(SLUG)).teams).toEqual([]);
    await board.upsertTeam(SLUG, { id: "t1", name: "Dragons", color: 2 });
    await board.upsertTeam(SLUG, { id: "t2", name: "Elves", color: 1, points: 50 });
    expect((await board.read(SLUG)).teams).toEqual([
      { id: "t2", name: "Elves", color: 1, points: 50 },
      { id: "t1", name: "Dragons", color: 2, points: 30 },
    ]);
    await board.replace(SLUG, [], [{ id: "t1", points: 90 }]);
    expect((await board.read(SLUG)).teams[0]).toEqual({
      id: "t1",
      name: "Dragons",
      color: 2,
      points: 90,
    });
  });

  test("S04-AC5 S04-AC6: rows can be removed, and the whole board replaced", async () => {
    const board = await make();
    await board.upsert(SLUG, { id: "p1", nickname: "Mai", teamId: null, points: 40 });
    await board.remove(SLUG, "p1");
    expect((await board.read(SLUG)).players).toEqual([]);
    await board.replace(SLUG, [{ id: "p2", nickname: "Bao", teamId: null, points: 5 }]);
    expect((await board.read(SLUG)).players.map((p) => p.id)).toEqual(["p2"]);
  });
}
