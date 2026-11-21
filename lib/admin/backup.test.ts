import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { MemoryDrawingFiles, MemoryDrawingRepo } from "@/lib/drawings";
import { isAppError } from "@/lib/errors";
import { MemoryEventRuntimeRepo } from "@/lib/events";
import { MemoryPlayRepo, type PhotoState, type PlayRecord } from "@/lib/games";
import { MemoryPlayerRepo } from "@/lib/players";
import { MemoryBoardRepo, MemoryPointsRepo } from "@/lib/points";
import { MemoryTeamRepo, MemoryTeamSummaryRepo } from "@/lib/teams";
import { backupManifest, pruneFiles } from "./backup";
import type { AdminDeps } from "./service";

const event = holiday2026;
const SLUG = event.slug;
const BACKUP = "Drive: Game Master/holiday-2026";
let deps: AdminDeps;
let files: MemoryDrawingFiles;
let drawings: MemoryDrawingRepo;
let mai: { id: string };

const snapped = (playerId: string, ids: string[]): PlayRecord => ({
  gameId: "spot-and-snipe",
  playerId,
  deviceUid: "x",
  seed: 1,
  state: {
    photos: ids.map((id, i) => ({
      id,
      url: `https://blob.test/${id}.jpg`,
      rating: i === 0 ? 80 : null,
      at: 100 + i,
    })),
    max: 3,
    step: ids.length,
  },
  status: "playing",
  points: 0,
  best: 0,
  runs: 1,
  scored: false,
});

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return { status: err.status, message: err.message };
}

beforeEach(async () => {
  files = new MemoryDrawingFiles();
  drawings = new MemoryDrawingRepo();
  deps = {
    teams: new MemoryTeamRepo(),
    summary: new MemoryTeamSummaryRepo(),
    events: new MemoryEventRuntimeRepo(),
    players: new MemoryPlayerRepo(),
    plays: new MemoryPlayRepo(),
    points: { points: new MemoryPointsRepo(), board: new MemoryBoardRepo(), now: () => 9000 },
    id: () => "x",
    drawings: { drawings, files, now: () => 9000, id: () => "d" },
  };
  mai = await deps.players.join(SLUG, "phoneA1", { nickname: "Mai", key: "mai" });
  await deps.plays.update(SLUG, "spot-and-snipe", mai.id, () => snapped(mai.id, ["m1", "m2"]));
  await drawings.add(SLUG, {
    id: "d1",
    gameId: "quick-draw",
    playerId: mai.id,
    run: 1,
    points: 64,
    url: "https://blob.test/d1.svg",
    createdAt: 50,
  });
});

describe("backing up and clearing files after an event (ADR-012)", () => {
  it("ADR-012: lists every photo and kept drawing still in Blob, with who, when, which game and its score", async () => {
    const m = await backupManifest(deps, event);
    expect(m.count).toBe(3);
    expect(m.files.map((f) => [f.kind, f.id, f.nickname, f.game, f.score])).toEqual([
      ["drawing", "d1", "Mai", "Quick Draw", 64],
      ["photo", "m1", "Mai", "Spot and Snipe", 80],
      ["photo", "m2", "Mai", "Spot and Snipe", null],
    ]);
  });

  it("ADR-012: clearing needs the event ended and the backup's count; then deletes the files and marks the records archived", async () => {
    expect((await failure(pruneFiles(deps, event, { backup: BACKUP, count: 3 }))).status).toBe(409);
    await deps.events.setStatus(SLUG, "ended");
    // A count that doesn't match the backup deletes nothing.
    expect((await failure(pruneFiles(deps, event, { backup: BACKUP, count: 2 }))).message).toMatch(
      /backup has 2 files, but there are 3 files now/,
    );
    expect(files.removed).toEqual([]);
    expect(await pruneFiles(deps, event, { backup: BACKUP, count: 3 })).toEqual({ deleted: 3 });
    expect([...files.removed].sort()).toEqual([
      "https://blob.test/d1.svg",
      "https://blob.test/m1.jpg",
      "https://blob.test/m2.jpg",
    ]);
    const play = await deps.plays.get(SLUG, "spot-and-snipe", mai.id);
    expect((play?.state as PhotoState).photos.map((p) => p.archived)).toEqual([
      { at: 9000, backup: BACKUP },
      { at: 9000, backup: BACKUP },
    ]);
    expect((await drawings.list(SLUG))[0]?.archived).toEqual({ at: 9000, backup: BACKUP });
    // Already archived: nothing left to back up or clear.
    expect((await backupManifest(deps, event)).count).toBe(0);
    expect(await pruneFiles(deps, event, { backup: BACKUP, count: 0 })).toEqual({ deleted: 0 });
  });
});
