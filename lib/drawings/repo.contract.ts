import { expect, test } from "vitest";
import type { DrawingRecord } from "./model";
import type { DrawingRepo } from "./repo";

const SLUG = "holiday-2026";
const drawing = (id: string, createdAt: number): DrawingRecord => ({
  id,
  gameId: "quick-draw",
  playerId: "p1",
  run: 1,
  points: 72,
  url: `https://example.test/${id}.svg`,
  createdAt,
});

/** The same behavior from every DrawingRepo (ADR-016). */
export function drawingRepoContract(make: () => Promise<DrawingRepo>) {
  test("S18-AC7: a kept drawing's record is added and listed, newest first", async () => {
    const repo = await make();
    expect(await repo.list(SLUG)).toEqual([]);
    await repo.add(SLUG, drawing("d1", 1000));
    await repo.add(SLUG, drawing("d2", 2000));
    expect(await repo.list(SLUG)).toEqual([drawing("d2", 2000), drawing("d1", 1000)]);
    expect(await repo.list("other-party")).toEqual([]);
  });

  test("S18-AC8: clearing an event deletes its drawings only", async () => {
    const repo = await make();
    await repo.add(SLUG, drawing("d1", 1000));
    await repo.add("other-party", drawing("d9", 1000));
    await repo.clear(SLUG);
    expect(await repo.list(SLUG)).toEqual([]);
    expect(await repo.list("other-party")).toHaveLength(1);
  });
}
