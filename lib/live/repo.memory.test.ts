import { describe } from "vitest";
import { liveRepoContract } from "./repo.contract";
import { MemoryLiveRepo } from "./repo.memory";

describe("MemoryLiveRepo", () => {
  liveRepoContract(() => Promise.resolve(new MemoryLiveRepo()));
});
