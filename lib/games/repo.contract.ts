import { expect, test } from "vitest";
import type { PlayRecord, PlayRepo } from "./repo";

const SLUG = "holiday-2026";
const record = (gameId: string, playerId: string, state: unknown = { n: 0 }): PlayRecord => ({
  gameId,
  playerId,
  deviceUid: "deviceA1",
  seed: 7,
  state,
  status: "playing",
  points: 0,
  best: 0,
  runs: 1,
  scored: false,
});

/** The same behavior from every PlayRepo (ADR-016). */
export function playRepoContract(make: () => Promise<PlayRepo>) {
  test("S08-AC8: a play is created, read back and changed", async () => {
    const repo = await make();
    expect(await repo.get(SLUG, "trivia", "p1")).toBeNull();
    const created = await repo.update(SLUG, "trivia", "p1", (cur) => cur ?? record("trivia", "p1"));
    expect(created).toEqual(record("trivia", "p1"));
    expect(await repo.get(SLUG, "trivia", "p1")).toEqual(record("trivia", "p1"));
    const finished = {
      ...record("trivia", "p1", { n: 1 }),
      status: "finished" as const,
      points: 80,
      best: 80,
      scored: true,
    };
    await repo.update(SLUG, "trivia", "p1", () => finished);
    expect(await repo.get(SLUG, "trivia", "p1")).toEqual(finished);
  });

  test("S08-AC8: a change that returns null leaves the play and returns it", async () => {
    const repo = await make();
    await repo.update(SLUG, "trivia", "p1", () => record("trivia", "p1"));
    expect(await repo.update(SLUG, "trivia", "p1", () => null)).toEqual(record("trivia", "p1"));
    expect(await repo.update(SLUG, "other", "p1", () => null)).toBeNull();
  });

  test("S08-AC8: a change that throws writes nothing", async () => {
    const repo = await make();
    await expect(
      repo.update(SLUG, "trivia", "p1", () => {
        throw new Error("nope");
      }),
    ).rejects.toThrow("nope");
    expect(await repo.get(SLUG, "trivia", "p1")).toBeNull();
  });

  test("S08-AC8: lists one player's plays in one event", async () => {
    const repo = await make();
    await repo.update(SLUG, "trivia", "p1", () => record("trivia", "p1"));
    await repo.update(SLUG, "photo", "p1", () => record("photo", "p1"));
    await repo.update(SLUG, "trivia", "p2", () => record("trivia", "p2"));
    await repo.update("spring-2027", "trivia", "p1", () => record("trivia", "p1"));
    const games = (await repo.forPlayer(SLUG, "p1")).map((p) => p.gameId).sort();
    expect(games).toEqual(["photo", "trivia"]);
  });

  test("S08-AC5 S08-AC8: changes to one play never overlap", async () => {
    const repo = await make();
    await repo.update(SLUG, "trivia", "p1", () => record("trivia", "p1"));
    await Promise.all(
      Array.from({ length: 5 }, () =>
        repo.update(SLUG, "trivia", "p1", (cur) =>
          cur ? { ...cur, state: { n: (cur.state as { n: number }).n + 1 } } : null,
        ),
      ),
    );
    expect((await repo.get(SLUG, "trivia", "p1"))?.state).toEqual({ n: 5 });
  });

  test("S07-AC6 S07-AC8 S07-AC9: lists every play, removes one, and clears an event", async () => {
    const repo = await make();
    await repo.update(SLUG, "trivia", "p1", () => record("trivia", "p1"));
    await repo.update(SLUG, "trivia", "p2", () => record("trivia", "p2"));
    await repo.update("spring-2027", "trivia", "p1", () => record("trivia", "p1"));
    expect((await repo.all(SLUG)).map((p) => p.playerId).sort()).toEqual(["p1", "p2"]);
    await repo.remove(SLUG, "trivia", "p1");
    expect(await repo.get(SLUG, "trivia", "p1")).toBeNull();
    await repo.clear(SLUG);
    expect(await repo.all(SLUG)).toEqual([]);
    expect(await repo.all("spring-2027")).toHaveLength(1);
  });
}
