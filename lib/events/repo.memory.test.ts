import { describe, expect, test } from "vitest";
import { eventRuntimeContract } from "./repo.contract";
import { MemoryEventRuntimeRepo } from "./repo.memory";
import { parseLeaderboard } from "./rules";

describe("MemoryEventRuntimeRepo", () => {
  eventRuntimeContract((data) =>
    Promise.resolve(new MemoryEventRuntimeRepo(data.status ?? {}, data.leaderboard ?? {})),
  );
});

describe("parseLeaderboard", () => {
  test("ignores malformed entries instead of crashing the page", () => {
    expect(
      parseLeaderboard({ teams: { t1: { name: "A", points: "lots" } }, players: "x" }),
    ).toEqual({ teams: [], players: [] });
    expect(parseLeaderboard(null)).toBeNull();
  });
});
