import type { DrawingRecord } from "./model";

/** Where kept drawings' records live (ADR-032). */
export interface DrawingRepo {
  add(slug: string, drawing: DrawingRecord): Promise<void>;
  /** Every kept drawing in the event, newest first. */
  list(slug: string): Promise<DrawingRecord[]>;
  /** Deletes every record in the event (clear test data). */
  clear(slug: string): Promise<void>;
}

/** Where the drawings' files go: Vercel Blob, or memory for local runs and tests. */
export interface DrawingFiles {
  /** Saves the SVG and returns its URL. */
  put(path: string, svg: string): Promise<string>;
  remove(urls: string[]): Promise<void>;
}
