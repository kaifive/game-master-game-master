import { describe } from "vitest";
import { boardRepoContract, pointsRepoContract } from "./repo.contract";
import { MemoryBoardRepo, MemoryPointsRepo } from "./repo.memory";

describe("MemoryPointsRepo", () => {
  pointsRepoContract(() => Promise.resolve(new MemoryPointsRepo()));
});

describe("MemoryBoardRepo", () => {
  boardRepoContract(() => Promise.resolve(new MemoryBoardRepo()));
});
