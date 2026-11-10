import { log } from "@/lib/log";
import type { DrawingRecord, Stroke } from "./model";
import type { DrawingFiles, DrawingRepo } from "./repo";
import { drawingSvg } from "./svg";

export type DrawingDeps = {
  drawings: DrawingRepo;
  /** Null when no Blob store is connected: nothing is kept (ADR-032). */
  files: DrawingFiles | null;
  now: () => number;
  id: () => string;
};

export type FinishedDrawing = {
  gameId: string;
  playerId: string;
  run: number;
  points: number;
  strokes: Stroke[];
};

/**
 * Keeps a finished run's drawing: the SVG in Blob, then its record
 * (S18-AC7). Returns null when there's nowhere to keep it.
 */
export async function keepDrawing(
  deps: DrawingDeps,
  slug: string,
  d: FinishedDrawing,
): Promise<DrawingRecord | null> {
  if (!deps.files || d.strokes.length === 0) return null;
  const path = `events/${slug}/drawings/${d.gameId}/${d.playerId}-${String(d.run)}.svg`;
  const url = await deps.files.put(path, drawingSvg(d.strokes));
  const record: DrawingRecord = {
    id: deps.id(),
    gameId: d.gameId,
    playerId: d.playerId,
    run: d.run,
    points: d.points,
    url,
    createdAt: deps.now(),
  };
  await deps.drawings.add(slug, record);
  return record;
}

/** Deletes every kept drawing in the event, files then records (S18-AC8). */
export async function clearDrawings(deps: DrawingDeps, slug: string): Promise<void> {
  const all = await deps.drawings.list(slug);
  if (deps.files && all.length > 0)
    await deps.files.remove(all.map((d) => d.url)).catch((err: unknown) => {
      log.error("drawing files not deleted", { slug, err });
    });
  await deps.drawings.clear(slug);
}
