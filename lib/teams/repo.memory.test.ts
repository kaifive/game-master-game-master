import { describe } from "vitest";
import { teamRepoContract } from "./repo.contract";
import { MemoryTeamRepo } from "./repo.memory";

describe("MemoryTeamRepo", () => {
  teamRepoContract(() => Promise.resolve(new MemoryTeamRepo()));
});
