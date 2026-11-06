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

/** The same behavior from every PointsRepo (ADR-016). `make` seeds players p1 and p2. */
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
      playerId: "p1",
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

  test("S04-AC6: rebuild can set a player's total", async () => {
    const repo = await make();
    await repo.award(SLUG, award("a1", "p1", 80));
    await repo.setTotal(SLUG, "p1", 120);
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

  test("S04-AC5 S04-AC6: rows can be removed, and the whole board replaced", async () => {
    const board = await make();
    await board.upsert(SLUG, { id: "p1", nickname: "Mai", teamId: null, points: 40 });
    await board.remove(SLUG, "p1");
    expect((await board.read(SLUG)).players).toEqual([]);
    await board.replace(SLUG, [{ id: "p2", nickname: "Bao", teamId: null, points: 5 }]);
    expect((await board.read(SLUG)).players.map((p) => p.id)).toEqual(["p2"]);
  });
}
