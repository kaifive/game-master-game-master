import { describe, expect, test } from "vitest";
import { eventRuntimeContract } from "./repo.contract";
import { MemoryEventRuntimeRepo } from "./repo.memory";
import { parseLeaderboard } from "./rules";

describe("MemoryEventRuntimeRepo", () => {
  eventRuntimeContract((data) =>
    Promise.resolve(new MemoryEventRuntimeRepo(data.status ?? {}, data.leaderboard ?? {})),
  );
});

describe("MemoryEventRuntimeRepo override", () => {
  test("an override, such as a test's status cookie, wins for every event", async () => {
    const repo = new MemoryEventRuntimeRepo({ "holiday-2026": "upcoming" }, {}, () =>
      Promise.resolve("live"),
    );
    expect(await repo.status("holiday-2026")).toBe("live");
    expect(await repo.status("other")).toBe("live");
  });
});

describe("parseLeaderboard", () => {
  test("ignores malformed entries instead of crashing the page", () => {
    expect(
      parseLeaderboard({ teams: { t1: { name: "A", points: "lots" } }, players: "x" }),
    ).toEqual({ teams: [], players: [] });
    expect(parseLeaderboard(null)).toBeNull();
  });
});
