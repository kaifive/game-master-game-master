import { describe } from "vitest";
import { playRepoContract } from "./repo.contract";
import { MemoryPlayRepo } from "./repo.memory";

describe("MemoryPlayRepo", () => {
  playRepoContract(() => Promise.resolve(new MemoryPlayRepo()));
});
