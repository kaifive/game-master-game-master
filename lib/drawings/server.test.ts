import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./repo.firebase", () => ({ firebaseDrawings: () => null }));
import { BlobDrawingFiles } from "./blob";
import { MemoryDrawingFiles } from "./repo.memory";
import { drawingFiles } from "./server";

const live = { NODE_ENV: "production", FIREBASE_SERVICE_ACCOUNT: "{}" };

describe("where drawings' files go (ADR-033)", () => {
  it("S18-AC8: a store connected by OIDC (BLOB_STORE_ID) or a read-write token is used", () => {
    expect(drawingFiles({ ...live, BLOB_STORE_ID: "store_abc" })).toBeInstanceOf(BlobDrawingFiles);
    expect(drawingFiles({ ...live, BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x" })).toBeInstanceOf(
      BlobDrawingFiles,
    );
  });

  it("S18-AC8: a live server with no store keeps nothing; local runs keep them in memory", () => {
    expect(drawingFiles(live)).toBeNull();
    expect(drawingFiles({ NODE_ENV: "development" })).toBeInstanceOf(MemoryDrawingFiles);
  });
});
