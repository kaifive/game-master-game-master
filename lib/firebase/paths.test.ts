import { describe, expect, test } from "vitest";
import { fs, rtdb } from "./paths";

describe("Firestore paths", () => {
  test("build every path in the data model", () => {
    expect(fs.event("holiday-2026")).toBe("events/holiday-2026");
    expect(fs.device("holiday-2026", "uid1")).toBe("events/holiday-2026/devices/uid1");
    expect(fs.player("holiday-2026", "p1")).toBe("events/holiday-2026/players/p1");
    expect(fs.players("holiday-2026")).toBe("events/holiday-2026/players");
    expect(fs.teams("holiday-2026")).toBe("events/holiday-2026/teams");
    expect(fs.photos("holiday-2026")).toBe("events/holiday-2026/photos");
    expect(fs.nickname("holiday-2026", "mai")).toBe("events/holiday-2026/nicknames/mai");
    expect(fs.team("holiday-2026", "t1")).toBe("events/holiday-2026/teams/t1");
    expect(fs.ledgerEntry("holiday-2026", "e1")).toBe("events/holiday-2026/ledger/e1");
    expect(fs.ledger("holiday-2026")).toBe("events/holiday-2026/ledger");
    expect(fs.devices("holiday-2026")).toBe("events/holiday-2026/devices");
    expect(fs.nicknames("holiday-2026")).toBe("events/holiday-2026/nicknames");
    expect(fs.plays("holiday-2026")).toBe("events/holiday-2026/plays");
    expect(fs.play("holiday-2026", "word-1", "p1")).toBe("events/holiday-2026/plays/word-1_p1");
    expect(fs.photo("holiday-2026", "ph1")).toBe("events/holiday-2026/photos/ph1");
    expect(fs.vote("holiday-2026", "photo-1", "pr1", "p1")).toBe(
      "events/holiday-2026/votes/photo-1_pr1_p1",
    );
  });
});

describe("Realtime Database paths", () => {
  test("build every path in the data model", () => {
    expect(rtdb.presence("holiday-2026", "uid1")).toBe("presence/holiday-2026/uid1");
    expect(rtdb.presenceAll("holiday-2026")).toBe("presence/holiday-2026");
    expect(rtdb.buzzes("holiday-2026", "r1")).toBe("live/holiday-2026/buzzes/r1");
    expect(rtdb.leaderboard("holiday-2026")).toBe("leaderboard/holiday-2026");
    expect(rtdb.leaderboardPlayer("holiday-2026", "p1")).toBe(
      "leaderboard/holiday-2026/players/p1",
    );
    expect(rtdb.leaderboardPlayers("holiday-2026")).toBe("leaderboard/holiday-2026/players");
    expect(rtdb.leaderboardRecentEntry("holiday-2026", "e1")).toBe(
      "leaderboard/holiday-2026/recent/e1",
    );
    expect(rtdb.leaderboardRecent("holiday-2026")).toBe("leaderboard/holiday-2026/recent");
    expect(rtdb.liveSession("holiday-2026")).toBe("live/holiday-2026/session");
    expect(rtdb.captain("holiday-2026", "t1")).toBe("live/holiday-2026/captains/t1");
    expect(rtdb.buzz("holiday-2026", "r1", "t1")).toBe("live/holiday-2026/buzzes/r1/t1");
    expect(rtdb.moments("holiday-2026")).toBe("moments/holiday-2026");
  });
});

describe("path safety", () => {
  test("rejects a slug that would escape its path", () => {
    expect(() => fs.player("../admin", "p1")).toThrow(/slug/i);
  });

  test.each(["a/b", "a.b", "", "x$"])("rejects the id %j", (id) => {
    expect(() => fs.player("holiday-2026", id)).toThrow(/id/i);
    expect(() => rtdb.presence("holiday-2026", id)).toThrow(/id/i);
  });
});
