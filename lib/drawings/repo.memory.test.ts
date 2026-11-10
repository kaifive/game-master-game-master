import { describe } from "vitest";
import { drawingRepoContract } from "./repo.contract";
import { MemoryDrawingRepo } from "./repo.memory";

describe("MemoryDrawingRepo", () => {
  drawingRepoContract(() => Promise.resolve(new MemoryDrawingRepo()));
});
