import { describe } from "vitest";
import { playerRepoContract } from "./repo.contract";
import { MemoryPlayerRepo } from "./repo.memory";

// The contract proves S02-AC4, S02-AC6, S02-AC8, S02-AC9 and S02-AC12 for this repo.
describe("MemoryPlayerRepo", () => {
  playerRepoContract((seed) => Promise.resolve(new MemoryPlayerRepo(seed)));
});
