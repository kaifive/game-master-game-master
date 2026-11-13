import type { DrawingRecord } from "./model";

/** Where kept drawings' records live (ADR-032). */
export interface DrawingRepo {
  add(slug: string, drawing: DrawingRecord): Promise<void>;
  /** Every kept drawing in the event, newest first. */
  list(slug: string): Promise<DrawingRecord[]>;
  /** Deletes every record in the event (clear test data). */
  clear(slug: string): Promise<void>;
}

/**
 * Where kept files go (drawings, ADR-032; photos, ADR-034): Vercel Blob, or
 * memory for local runs and tests.
 */
export interface DrawingFiles {
  /** Saves a file and returns its URL. A string is an SVG drawing. */
  put(path: string, body: string | Blob, contentType?: string): Promise<string>;
  remove(urls: string[]): Promise<void>;
}
