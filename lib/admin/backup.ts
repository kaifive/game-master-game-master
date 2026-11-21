import { AppError } from "@/lib/errors";
import type { EventConfig } from "@/lib/events";
import type { PhotoState } from "@/lib/games";
import type { AdminDeps } from "./service";

/**
 * Backing up and clearing an event's files after it (ADR-012): every photo
 * (spec 20) and kept drawing (spec 18), listed for `npm run photos:export`,
 * then deleted from Blob by `npm run photos:prune`, their records kept and
 * marked archived with where the backup is.
 */

export type BackupFile = {
  kind: "photo" | "drawing";
  /** The record's id: the photo's, or the drawing's. */
  id: string;
  gameId: string;
  game: string;
  playerId: string;
  nickname: string;
  /** When it was taken or drawn (epoch ms). */
  at: number;
  /** A photo's rating (0 to 100), a drawing's points; null for an unrated photo. */
  score: number | null;
  url: string;
};

const files = (n: number) => `${String(n)} file${n === 1 ? "" : "s"}`;

export type BackupManifest = { slug: string; count: number; files: BackupFile[] };

/** Every file still in Blob, oldest first. Archived ones are already backed up and gone. */
export async function backupManifest(deps: AdminDeps, event: EventConfig): Promise<BackupManifest> {
  const title = new Map(event.games.map((g) => [g.id, g.title]));
  const photoGames = new Set(
    event.games.filter((g) => g.type === "photo-challenge").map((g) => g.id),
  );
  const [plays, players, drawings] = await Promise.all([
    deps.plays.all(event.slug),
    deps.players.list(event.slug),
    deps.drawings ? deps.drawings.drawings.list(event.slug) : Promise.resolve([]),
  ]);
  const nickname = new Map(players.map((p) => [p.id, p.nickname]));
  const photos = plays.flatMap((p) =>
    photoGames.has(p.gameId)
      ? (p.state as PhotoState).photos
          .filter((x) => !x.archived)
          .map((x): BackupFile => ({
            kind: "photo",
            id: x.id,
            gameId: p.gameId,
            game: title.get(p.gameId) ?? p.gameId,
            playerId: p.playerId,
            nickname: nickname.get(p.playerId) ?? "(removed player)",
            at: x.at,
            score: x.rating,
            url: x.url,
          }))
      : [],
  );
  const kept = drawings
    .filter((d) => !d.archived && d.url.startsWith("https://"))
    .map((d): BackupFile => ({
      kind: "drawing",
      id: d.id,
      gameId: d.gameId,
      game: title.get(d.gameId) ?? d.gameId,
      playerId: d.playerId,
      nickname: nickname.get(d.playerId) ?? "(removed player)",
      at: d.createdAt,
      score: d.points,
      url: d.url,
    }));
  const files = [...photos, ...kept].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return { slug: event.slug, count: files.length, files };
}

/**
 * Deletes the event's files from Blob and marks their records archived with
 * where the backup is (ADR-012). Only once the event has ended, and only when
 * the count matches the backup, so nothing is deleted that wasn't saved.
 */
export async function pruneFiles(
  deps: AdminDeps,
  event: EventConfig,
  body: { backup: string; count: number },
): Promise<{ deleted: number }> {
  if ((await deps.events.status(event.slug)) !== "ended")
    throw new AppError("CONFLICT", "End the event before clearing its photos.");
  const store = deps.drawings?.files;
  if (!store) throw new AppError("UNAVAILABLE", "No Blob store is connected.");
  const backup = body.backup.trim();
  if (backup.length === 0) throw new AppError("BAD_REQUEST", "Say where the backup is.");
  const manifest = await backupManifest(deps, event);
  if (manifest.count !== body.count)
    throw new AppError(
      "CONFLICT",
      `The backup has ${files(body.count)}, but there ${manifest.count === 1 ? "is" : "are"} ${files(manifest.count)} now. Export again first.`,
    );
  if (manifest.count === 0) return { deleted: 0 };
  await store.remove(manifest.files.map((f) => f.url));
  const archived = { at: deps.points.now(), backup };
  // Photos: marked in their plays, one play at a time.
  const byPlay = new Map<string, Set<string>>();
  for (const f of manifest.files.filter((x) => x.kind === "photo")) {
    const key = `${f.gameId}\u0000${f.playerId}`;
    byPlay.set(key, (byPlay.get(key) ?? new Set()).add(f.id));
  }
  for (const [key, ids] of byPlay) {
    const [gameId = "", playerId = ""] = key.split("\u0000");
    await deps.plays.update(event.slug, gameId, playerId, (cur) => {
      if (!cur) return null;
      const state = cur.state as PhotoState;
      return {
        ...cur,
        state: {
          ...state,
          photos: state.photos.map((p) => (ids.has(p.id) ? { ...p, archived } : p)),
        },
      };
    });
  }
  const drawingIds = manifest.files.filter((x) => x.kind === "drawing").map((x) => x.id);
  if (deps.drawings && drawingIds.length > 0)
    await deps.drawings.drawings.archive(event.slug, drawingIds, archived);
  return { deleted: manifest.count };
}
