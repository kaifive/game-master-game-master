import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import type { EventConfig } from "@/lib/events";
import { MemoryBoardRepo, MemoryPointsRepo } from "@/lib/points";
import type { TeamsSummary } from "@/lib/teams";
import { START_LEAD_MS } from "./model";
import { MemoryLiveRepo } from "./repo.memory";
import {
  adminLiveAction,
  adminLiveView,
  phoneLiveView,
  playerLiveAction,
  type LiveDeps,
} from "./service";
import { passShowdown, tapShowdown } from "./testing";

const event: EventConfig = {
  ...holiday2026,
  games: [
    ...holiday2026.games,
    {
      id: "tap-off",
      type: "jeopardy",
      title: "Tap Off",
      mode: "live",
      phase: "team",
      visibility: "listed",
      content: { rounds: 1 },
      scoring: { awardTo: "team" },
    },
    {
      id: "pass-on",
      type: "trivia",
      title: "Pass On",
      mode: "live",
      phase: "team",
      visibility: "listed",
      content: {},
      scoring: { awardTo: "team" },
    },
  ],
};

const summary: TeamsSummary = {
  phase: "team",
  maxTeamSize: 6,
  board: { phones: true, tv: true },
  teams: [
    {
      id: "t1",
      name: "Snow",
      named: true,
      color: 1,
      captain: { id: "c1", nickname: "Cap One" },
      members: [
        { id: "c1", nickname: "Cap One" },
        { id: "m1", nickname: "Mo" },
      ],
      room: 4,
    },
    {
      id: "t2",
      name: "Ice",
      named: true,
      color: 2,
      captain: { id: "c2", nickname: "Cap Two" },
      members: [{ id: "c2", nickname: "Cap Two" }],
      room: 5,
    },
  ],
};

let clock = 0;
let ownsCalls = 0;
let deps: LiveDeps;
let points: MemoryPointsRepo;

beforeEach(() => {
  clock = 1_000_000;
  ownsCalls = 0;
  points = new MemoryPointsRepo();
  deps = {
    live: new MemoryLiveRepo(),
    teams: () => Promise.resolve(summary),
    owns: (_slug, uid, playerId) => {
      ownsCalls++;
      return Promise.resolve(uid === `dev-${playerId}`);
    },
    points: { points, board: new MemoryBoardRepo(), now: () => clock },
    // The stand-ins play the parts of real showdown types here.
    showdown: (type) =>
      type === "jeopardy" ? tapShowdown : type === "trivia" ? passShowdown : undefined,
    now: () => clock,
    id: () => "sess1",
    seed: () => 42,
  };
});

async function failure(p: Promise<unknown>) {
  const err: unknown = await p.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return { status: err.status, message: err.message };
}

describe("live service (spec 11)", () => {
  it("S11-AC1: the host starts a live game, a second start is refused, and End stops it", async () => {
    const view = await adminLiveView(deps, event);
    expect(view.active).toBe(false);
    expect(view.games.map((g) => g.id)).toEqual(["tap-off", "pass-on"]);
    const started = await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    expect(started).toMatchObject({ active: true, next: "Pick players" });
    expect(
      await failure(adminLiveAction(deps, event, { action: "start", gameId: "pass-on" })),
    ).toEqual({
      status: 409,
      message: "A live game is already running. End it first.",
    });
    expect(
      (await failure(adminLiveAction(deps, event, { action: "start", gameId: "trivia" }))).status,
    ).toBe(404);
    const ended = await adminLiveAction(deps, event, { action: "end" });
    expect(ended.active).toBe(false);
  });

  it("S11-AC3 S24-AC3: the TV, a member and a proven captain get their own views; the captain proves their phone once", async () => {
    await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    await adminLiveAction(deps, event, { action: "next" });
    const tv = await phoneLiveView(deps, event, null, null);
    expect(tv.active && tv.you).toBeNull();
    const member = await phoneLiveView(deps, event, "m1", "dev-m1");
    expect(member.active && member.you).toMatchObject({
      teamId: "t1",
      captain: false,
      pickable: [],
    });
    // Someone else's phone claiming to be the captain gets the member view.
    const imposter = await phoneLiveView(deps, event, "c1", "dev-someone");
    expect(imposter.active && imposter.you?.captain).toBe(false);
    const captain = await phoneLiveView(deps, event, "c1", "dev-c1");
    expect(captain.active && captain.you).toMatchObject({
      teamId: "t1",
      captain: true,
      canPick: true,
    });
    const calls = ownsCalls;
    await phoneLiveView(deps, event, "c1", "dev-c1");
    expect(ownsCalls).toBe(calls); // no Firestore read on later polls
    expect(tv.serverNow).toBe(clock);
  });

  it("S11-AC6: only the captain moves, for the current round; an old round changes nothing", async () => {
    await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    await adminLiveAction(deps, event, { action: "next" });
    expect(
      (
        await failure(
          playerLiveAction(deps, event, "dev-m1", {
            action: "pick",
            playerId: "m1",
            round: 1,
            who: "m1",
          }),
        )
      ).status,
    ).toBe(403);
    const picked = await playerLiveAction(deps, event, "dev-c1", {
      action: "pick",
      playerId: "c1",
      round: 1,
      who: "m1",
    });
    expect(picked.active && picked.you?.pickable.find((p) => p.id === "m1")).toMatchObject({
      available: true,
    });
    await adminLiveAction(deps, event, { action: "next" });
    clock += START_LEAD_MS + 100;
    const stale = await playerLiveAction(deps, event, "dev-c1", {
      action: "move",
      playerId: "c1",
      round: 0,
      move: "tap",
    });
    expect(stale.active && (stale.game as { tapped: boolean }).tapped).toBe(false);
    const moved = await playerLiveAction(deps, event, "dev-c1", {
      action: "move",
      playerId: "c1",
      round: 1,
      move: "tap",
    });
    expect(moved.active && (moved.game as { tapped: boolean }).tapped).toBe(true);
    // Outside its window, by the server clock, a move is refused.
    clock += 10_000;
    expect(
      (
        await failure(
          playerLiveAction(deps, event, "dev-c2", {
            action: "move",
            playerId: "c2",
            round: 1,
            move: "tap",
          }),
        )
      ).message,
    ).toBe("Time's up.");
  });

  it("S11-AC7 S24-AC5: round points go to teams through the ledger once, even if results are reached twice", async () => {
    await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    await adminLiveAction(deps, event, { action: "next" });
    await adminLiveAction(deps, event, { action: "next" });
    clock += START_LEAD_MS + 50;
    await playerLiveAction(deps, event, "dev-c2", {
      action: "move",
      playerId: "c2",
      round: 1,
      move: "tap",
    });
    const results = await adminLiveAction(deps, event, { action: "next" });
    expect(results.active && results.teams.map((t) => [t.id, t.roundPoints])).toEqual([
      ["t1", 0],
      ["t2", 20],
    ]);
    const ledger = await points.entries(event.slug);
    expect(ledger.map((e) => [e.id, e.points, e.to])).toEqual([
      ["live_sess1_1_t2", 20, { kind: "team", id: "t2" }],
    ]);
    // Paying the same round again is a no-op in the ledger.
    await deps.points.points.award(event.slug, {
      id: "live_sess1_1_t2",
      points: 20,
      reason: "x",
      source: { kind: "game", id: "tap-off" },
      createdBy: "server",
      to: { kind: "team", id: "t2" },
    });
    expect((await points.entries(event.slug)).length).toBe(1);
  });
});
