import { describe, expect, it } from "vitest";
import { wakeAt, type LiveView } from "./view";

const active = (game: unknown, step = "play", serverNow = 1000): LiveView =>
  ({
    active: true,
    serverNow,
    screen: "showdown",
    session: {
      id: "s",
      gameId: "g",
      type: "x",
      title: "X",
      step,
      round: 1,
      rounds: 3,
      revision: 1,
    },
    demo: "",
    teams: [],
    game,
    you: null,
  }) as unknown as LiveView;

describe("when a live screen fetches again (spec 11)", () => {
  it("S11-AC4: a screen fetches again at the round's next start, end of show or close, and not otherwise", () => {
    expect(wakeAt(active({ startsAt: 3000, showEndsAt: 5000, closesAt: 9000 }))).toBe(3000);
    expect(wakeAt(active({ startsAt: 500, showEndsAt: 5000, closesAt: 9000 }))).toBe(5000);
    expect(wakeAt(active({ startsAt: 500, closesAt: 900 }))).toBeNull();
    expect(wakeAt(active({ startsAt: 3000 }, "results"))).toBeNull();
    expect(wakeAt(active(null))).toBeNull();
    expect(wakeAt({ active: false, serverNow: 1, screen: "leaderboard" })).toBeNull();
  });
});
