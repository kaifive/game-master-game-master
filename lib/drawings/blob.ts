import "server-only";
import { del, put } from "@vercel/blob";
import type { DrawingFiles } from "./repo";

/** Drawings' files in Vercel Blob (ADR-032): public, with an unguessable suffix. */
export class BlobDrawingFiles implements DrawingFiles {
  constructor(private readonly token: string) {}

  async put(path: string, svg: string) {
    const blob = await put(path, svg, {
      access: "public",
      contentType: "image/svg+xml",
      addRandomSuffix: true,
      token: this.token,
    });
    return blob.url;
  }

  async remove(urls: string[]) {
    // Only our own Blob URLs: a memory data URL has no file to delete.
    const files = urls.filter((u) => u.startsWith("https://"));
    if (files.length > 0) await del(files, { token: this.token });
  }
}
