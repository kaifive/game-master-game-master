import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import type { EventConfig } from "@/lib/events";
import { MemoryBoardRepo, MemoryPointsRepo } from "@/lib/points";
import type { TeamsSummary } from "@/lib/teams";
import { defineShowdown, START_LEAD_MS } from "./model";
import { MemoryLiveRepo } from "./repo.memory";
import {
  adminLiveAction,
  adminLiveView,
  phoneLiveView,
  playerLiveAction,
  type LiveDeps,
} from "./service";
import { buzzer } from "./games/buzzer";
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
      id: "pairs",
      type: "cache",
      title: "Pairs",
      mode: "live",
      phase: "team",
      visibility: "listed",
      content: {},
      scoring: { awardTo: "team" },
    },
    {
      id: "quiz",
      type: "buzzer",
      title: "Quiz",
      mode: "live",
      phase: "team",
      visibility: "listed",
      content: { questions: [{ id: "q1", prompt: "Name the staff", answer: "Gun" }] },
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

const pairsShowdown = defineShowdown({ ...tapShowdown, minTeams: 3 });

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
      type === "jeopardy"
        ? tapShowdown
        : type === "trivia"
          ? passShowdown
          : type === "cache"
            ? pairsShowdown
            : type === "buzzer"
              ? buzzer
              : undefined,
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
    expect(view.games.map((g) => g.id)).toEqual([
      "buzzer-round",
      "tap-off",
      "pairs",
      "quiz",
      "pass-on",
    ]);
    const started = await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    expect(started).toMatchObject({ active: true, next: "Start round 1" });
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
    expect(member.active && member.you).toEqual({ teamId: "t1", captain: false });
    // Someone else's phone claiming to be the captain gets the member view.
    const imposter = await phoneLiveView(deps, event, "c1", "dev-someone");
    expect(imposter.active && imposter.you?.captain).toBe(false);
    const captain = await phoneLiveView(deps, event, "c1", "dev-c1");
    expect(captain.active && captain.you).toEqual({ teamId: "t1", captain: true });
    const calls = ownsCalls;
    await phoneLiveView(deps, event, "c1", "dev-c1");
    expect(ownsCalls).toBe(calls); // no Firestore read on later polls
    expect(tv.serverNow).toBe(clock);
  });

  it("S11-AC6: only the captain moves, for the current round; an old round changes nothing", async () => {
    await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    await adminLiveAction(deps, event, { action: "next" });
    clock += START_LEAD_MS + 100;
    expect(
      (
        await failure(
          playerLiveAction(deps, event, "dev-m1", {
            action: "move",
            playerId: "m1",
            round: 1,
            move: "tap",
          }),
        )
      ).status,
    ).toBe(403);
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

describe("showdown screen and Who's played (spec 24)", () => {
  it("S24-AC9: the host switches the TV between the leaderboard and the showdown; starting a showdown switches to it", async () => {
    expect((await phoneLiveView(deps, event, null, null)).screen).toBe("leaderboard");
    await adminLiveAction(deps, event, { action: "screen", screen: "showdown" });
    expect(await phoneLiveView(deps, event, null, null)).toMatchObject({
      active: false,
      screen: "showdown",
    });
    await adminLiveAction(deps, event, { action: "screen", screen: "leaderboard" });
    const started = await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    expect(started.screen).toBe("showdown");
    // The host can still show the leaderboard mid-game; the game keeps its place.
    const back = await adminLiveAction(deps, event, { action: "screen", screen: "leaderboard" });
    expect(back).toMatchObject({ active: true, screen: "leaderboard" });
    expect((await phoneLiveView(deps, event, null, null)).screen).toBe("leaderboard");
  });

  it("S24-AC9: the menu marks a showdown played once it has shown a round's results, not when it's started and ended at once", async () => {
    await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    let view = await adminLiveAction(deps, event, { action: "end" });
    expect(view.finished).toEqual([]);
    await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    await adminLiveAction(deps, event, { action: "next" });
    await adminLiveAction(deps, event, { action: "next" });
    view = await adminLiveAction(deps, event, { action: "end" });
    expect(view.finished).toEqual(["tap-off"]);
    expect((await phoneLiveView(deps, event, null, null)).finished).toEqual(["tap-off"]);
  });

  it("S24-AC2: Who's played lists joined players and added names per team, and keeps them across showdowns", async () => {
    let view = await adminLiveView(deps, event);
    expect(view.played.map((r) => [r.teamId, r.people.map((p) => p.name)])).toEqual([
      ["t1", ["Cap One", "Mo"]],
      ["t2", ["Cap Two"]],
    ]);
    view = await adminLiveAction(deps, event, { action: "add", teamId: "t2", name: " Grandma " });
    const grandma = view.played[1]?.people[1];
    expect(grandma).toMatchObject({ name: "Grandma", added: true, played: false });
    view = await adminLiveAction(deps, event, {
      action: "played",
      teamId: "t2",
      personId: grandma?.id ?? "",
      played: true,
    });
    view = await adminLiveAction(deps, event, {
      action: "played",
      teamId: "t2",
      personId: "c2",
      played: true,
    });
    expect(view.played[1]).toMatchObject({ done: 2, total: 2, everyone: true });
    // A showdown starting and ending leaves the list alone.
    await adminLiveAction(deps, event, { action: "start", gameId: "tap-off" });
    view = await adminLiveAction(deps, event, { action: "end" });
    expect(view.played[1]?.done).toBe(2);
    view = await adminLiveAction(deps, event, { action: "reset", teamId: "t2" });
    expect(view.played[1]).toMatchObject({ done: 0, total: 2 });
    // Joined players can't be removed; added names can; bad input is refused.
    expect(
      (
        await failure(
          adminLiveAction(deps, event, { action: "remove", teamId: "t2", personId: "c2" }),
        )
      ).message,
    ).toBe("Only names you added can be removed.");
    view = await adminLiveAction(deps, event, {
      action: "remove",
      teamId: "t2",
      personId: grandma?.id ?? "",
    });
    expect(view.played[1]?.total).toBe(1);
    expect(
      (await failure(adminLiveAction(deps, event, { action: "add", teamId: "t2", name: "  " })))
        .message,
    ).toBe("Type a name.");
    expect(
      (await failure(adminLiveAction(deps, event, { action: "add", teamId: "nope", name: "A" })))
        .status,
    ).toBe(404);
  });

  it("S24-AC11: a game needing more teams than are playing can't start, and Controls says why", async () => {
    const view = await adminLiveView(deps, event);
    expect(view.games.find((g) => g.id === "pairs")?.blocked).toBe(
      "This game needs at least 3 teams.",
    );
    expect(view.games.find((g) => g.id === "tap-off")?.blocked).toBeNull();
    expect(
      (await failure(adminLiveAction(deps, event, { action: "start", gameId: "pairs" }))).message,
    ).toBe("This game needs at least 3 teams.");
    // Only teams with a captain play; more than 6 is refused.
    const many: TeamsSummary = {
      ...summary,
      teams: Array.from({ length: 7 }, (_, i) => ({
        ...summary.teams[1],
        id: `t${String(i)}`,
        name: `T${String(i)}`,
        named: true,
        color: 1,
        captain: { id: `c${String(i)}`, nickname: `C${String(i)}` },
        members: [{ id: `c${String(i)}`, nickname: `C${String(i)}` }],
        room: 5,
      })),
    };
    deps.teams = () => Promise.resolve(many);
    expect(
      (await failure(adminLiveAction(deps, event, { action: "start", gameId: "tap-off" }))).message,
    ).toBe("Showdowns are built for up to 6 teams.");
  });
});

describe("buzzer round through the service (spec 12)", () => {
  it("S12-AC1 S12-AC3: the host opens, a captain buzzes, the host marks it right, and Next pays the team", async () => {
    await adminLiveAction(deps, event, { action: "start", gameId: "quiz" });
    let view = await adminLiveAction(deps, event, { action: "next" });
    expect(view.host).toMatchObject({ answer: "Gun", phase: "shown" });
    view = await adminLiveAction(deps, event, { action: "host", act: "open" });
    clock += 300;
    await playerLiveAction(deps, event, "dev-c2", {
      action: "move",
      playerId: "c2",
      round: 1,
      move: { at: clock - 40 },
    });
    view = await adminLiveAction(deps, event, { action: "host", act: "right" });
    expect(view.host).toMatchObject({ winner: "t2" });
    expect(
      (await failure(adminLiveAction(deps, event, { action: "host", act: "open" }))).status,
    ).toBe(409);
    view = await adminLiveAction(deps, event, { action: "next" });
    expect(view.active && view.session.step).toBe("final");
    const ledger = await points.entries(event.slug);
    expect(ledger.map((e) => [e.points, e.to])).toEqual([[100, { kind: "team", id: "t2" }]]);
  });
});
