import "server-only";
import { randomUUID } from "node:crypto";
import { backend } from "@/lib/backend";
import { BlobDrawingFiles } from "./blob";
import type { DrawingFiles, DrawingRepo } from "./repo";
import { firebaseDrawings } from "./repo.firebase";
import { MemoryDrawingFiles, MemoryDrawingRepo } from "./repo.memory";
import type { DrawingDeps } from "./service";

const shared = globalThis as typeof globalThis & {
  __gmMemoryDrawings?: MemoryDrawingRepo;
  __gmMemoryDrawingFiles?: MemoryDrawingFiles;
};

export const drawingRepo = (): DrawingRepo =>
  backend() === "firebase"
    ? firebaseDrawings()
    : (shared.__gmMemoryDrawings ??= new MemoryDrawingRepo());

/** Blob when a store is connected; memory locally; nothing on a server with neither. */
export function drawingFiles(env = process.env): DrawingFiles | null {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return new BlobDrawingFiles(token);
  return backend(env) === "memory"
    ? (shared.__gmMemoryDrawingFiles ??= new MemoryDrawingFiles())
    : null;
}

export const drawingDeps = (): DrawingDeps => ({
  drawings: drawingRepo(),
  files: drawingFiles(),
  now: () => Date.now(),
  id: () => randomUUID(),
});
