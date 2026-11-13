import "server-only";
import { del, put } from "@vercel/blob";
import type { DrawingFiles } from "./repo";

/**
 * Drawings' files in Vercel Blob (ADR-032): public, with an unguessable suffix.
 * With no token, the Blob SDK signs in with Vercel's OIDC token and
 * BLOB_STORE_ID (ADR-033).
 */
export class BlobDrawingFiles implements DrawingFiles {
  private readonly auth: { token?: string };

  constructor(token: string | null) {
    this.auth = token ? { token } : {};
  }

  async put(path: string, body: string | Blob, contentType?: string) {
    const blob = await put(path, body, {
      access: "public",
      contentType: typeof body === "string" ? "image/svg+xml" : (contentType ?? body.type),
      addRandomSuffix: true,
      ...this.auth,
    });
    return blob.url;
  }

  async remove(urls: string[]) {
    // Only our own Blob URLs: a memory data URL has no file to delete.
    const files = urls.filter((u) => u.startsWith("https://"));
    if (files.length > 0) await del(files, this.auth);
  }
}
