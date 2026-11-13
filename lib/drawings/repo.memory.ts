import type { DrawingRecord } from "./model";
import type { DrawingFiles, DrawingRepo } from "./repo";

const newestFirst = (a: DrawingRecord, b: DrawingRecord) => b.createdAt - a.createdAt;

/** In-memory drawing records: for tests, and local runs without Firebase. */
export class MemoryDrawingRepo implements DrawingRepo {
  private readonly rows = new Map<string, DrawingRecord[]>();

  add(slug: string, drawing: DrawingRecord) {
    this.rows.set(slug, [...(this.rows.get(slug) ?? []), structuredClone(drawing)]);
    return Promise.resolve();
  }

  list(slug: string) {
    return Promise.resolve([...(this.rows.get(slug) ?? [])].sort(newestFirst));
  }

  clear(slug: string) {
    this.rows.delete(slug);
    return Promise.resolve();
  }
}

/** Keeps each SVG as a data URL, so local runs need no Blob store. */
export class MemoryDrawingFiles implements DrawingFiles {
  readonly removed: string[] = [];

  async put(_path: string, body: string | Blob, contentType = "image/jpeg") {
    if (typeof body === "string") return `data:image/svg+xml;utf8,${encodeURIComponent(body)}`;
    const base64 = Buffer.from(await body.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${base64}`;
  }

  remove(urls: string[]) {
    this.removed.push(...urls);
    return Promise.resolve();
  }
}
