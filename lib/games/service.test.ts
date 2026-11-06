import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import type { EventConfig, EventStatus } from "@/lib/events";
import { MemoryPlayerRepo } from "@/lib/players";
import { MemoryPlayRepo } from "./repo.memory";
import { hubPlays, instructionsFor, makeMove, startPlay, type GameDeps } from "./service";
import type { TriviaView } from "./trivia/logic";

const event: EventConfig = {
  ...holiday2026,
  // Plain games here; each test turns on replayable or alwaysOpen as it needs.
  replayable: false,
  games: [
    ...holiday2026.games.map((g) => ({ ...g, alwaysOpen: false })),
    {
      id: "own-rules",
      type: "trivia",
      title: "Own rules",
      mode: "solo",
      visibility: "listed",
      content: holiday2026.games[0]?.content,
      scoring: { awardTo: "player" },
      instructions: { title: "Our rules", lines: ["Be quick."] },
    },
  ],
};
const UID = "deviceA1";
let clock = 0;
let status: EventStatus = "live";
let deps: GameDeps;
let playerId: string;

beforeEach(async () => {
  clock = 1_000_000;
  status = "live";
  const players = new MemoryPlayerRepo();
  deps = {
    plays: new MemoryPlayRepo(),
    players,
    status: () => Promise.resolve(status),
    now: () => clock,
    seed: () => 42,
  };
  playerId = (await players.join(event.slug, UID, { nickname: "Mai", key: "mai" })).id;
});

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return { status: err.status, message: err.message };
}

type Asked = Extract<TriviaView, { kind: "question" | "answered" }>;
const start = () => startPlay(deps, event, UID, "trivia", { playerId });
const move = (step: number, m: unknown) =>
  makeMove(deps, event, UID, "trivia", { playerId, step, move: m });

/** Plays every question, answering the first choice; returns the final response. */
async function playThrough() {
  let res = await start();
  while (res.status === "playing") {
    const v = res.view as TriviaView;
    res = await move(
      res.step,
      v.kind === "question" ? { type: "answer", choice: 0 } : { type: "next" },
    );
  }
  return res;
}

describe("game service", () => {
  it("S08-AC2: runs the game on the server; the first view has no answer", async () => {
    const res = await start();
    expect(res).toMatchObject({ status: "playing", points: 0, step: 0 });
    expect((res.view as Asked).kind).toBe("question");
    expect(JSON.stringify(res.view)).not.toMatch(/"(answer|correct)"/);
    const answered = await move(0, { type: "answer", choice: 0 });
    expect((answered.view as Asked).kind).toBe("answered");
  });

  it("S08-AC3: starting again resumes the same play; a finished play shows its result", async () => {
    const first = await start();
    clock += 4000;
    const again = await start();
    expect((again.view as Asked).prompt).toBe((first.view as Asked).prompt);
    expect((again.view as Asked).msLeft).toBe((first.view as Asked).msLeft - 4000);
    const done = await playThrough();
    expect(done.status).toBe("finished");
    expect(await start()).toEqual(done);
  });

  it("S08-AC4: points are fixed once, when the play ends, from soloGamePoints", async () => {
    const done = await playThrough();
    const { right, total } = done.view as Extract<TriviaView, { kind: "done" }>;
    expect(done.points).toBe(Math.round((100 * right) / total));
    const stored = await deps.plays.get(event.slug, "trivia", playerId);
    expect(stored).toMatchObject({ status: "finished", scored: true, points: done.points });
    expect(await move(done.step, { type: "next" })).toEqual(done);
  });

  it("S08-AC5: a move for an old step changes nothing and returns the current view", async () => {
    await start();
    const answered = await move(0, { type: "answer", choice: 0 });
    const repeat = await move(0, { type: "answer", choice: 1 });
    expect(repeat).toEqual(answered);
  });

  it("S08-AC5: time running out mid-move returns the timed-out view", async () => {
    await start();
    clock += 60_000;
    const res = await move(0, { type: "answer", choice: 0 });
    expect(res.view).toMatchObject({ kind: "answered", chosen: null, right: false });
  });

  it("S08-AC6: only while live, only for a game that exists, only for this phone's player", async () => {
    status = "upcoming";
    expect(await failure(start())).toEqual({
      status: 403,
      message: "This game opens when the host starts the party.",
    });
    status = "ended";
    expect(await failure(start())).toEqual({ status: 403, message: "This game has closed." });
    status = "live";
    expect((await failure(startPlay(deps, event, UID, "jeopardy", { playerId }))).status).toBe(404);
    expect((await failure(startPlay(deps, event, UID, "nope", { playerId }))).status).toBe(404);
    expect((await failure(startPlay(deps, event, "deviceB1", "trivia", { playerId }))).status).toBe(
      403,
    );
  });

  it("refuses a move before starting, and an invalid move", async () => {
    expect((await failure(move(0, { type: "next" }))).status).toBe(404);
    await start();
    expect(await failure(move(0, { type: "next" }))).toEqual({
      status: 400,
      message: "Answer the question first.",
    });
  });

  it("S08-AC7: lists the player's plays for the hub", async () => {
    expect(await hubPlays(deps, event, UID, playerId)).toEqual({ plays: {} });
    await start();
    expect(await hubPlays(deps, event, UID, playerId)).toEqual({
      plays: { trivia: { status: "playing", best: 0, runs: 1 } },
    });
    const done = await playThrough();
    expect((await hubPlays(deps, event, UID, playerId)).plays.trivia).toEqual({
      status: "finished",
      best: done.points,
      runs: 1,
    });
    expect((await failure(hubPlays(deps, event, "deviceB1", playerId))).status).toBe(403);
  });

  it("S08-AC12: a replayable game starts a new run on request and keeps the best score", async () => {
    const replay: EventConfig = { ...event, replayable: true };
    const again = () => startPlay(deps, replay, UID, "trivia", { playerId, again: true });
    const done = await playThrough();
    const best = done.best;
    expect(best).toBe(done.points);
    // A second run that scores 0 (every answer timed out) never lowers the best.
    let res = await again();
    expect(res).toMatchObject({ status: "playing", points: 0, best });
    while (res.status === "playing") {
      clock += 60_000;
      res = await makeMove(deps, replay, UID, "trivia", {
        playerId,
        step: res.step,
        move: { type: "next" },
      });
    }
    expect(res).toMatchObject({ status: "finished", points: 0, best });
    expect((await hubPlays(deps, replay, UID, playerId)).plays.trivia).toEqual({
      status: "finished",
      best,
      runs: 2,
    });
    // Without replayable, `again` just shows the result.
    expect((await startPlay(deps, event, UID, "trivia", { playerId, again: true })).status).toBe(
      "finished",
    );
  });

  it("S08-AC13: an alwaysOpen game can be played before the start; every game closes at the end", async () => {
    const open: EventConfig = {
      ...event,
      games: event.games.map((g) => (g.id === "trivia" ? { ...g, alwaysOpen: true } : g)),
    };
    status = "upcoming";
    expect((await startPlay(deps, open, UID, "trivia", { playerId })).status).toBe("playing");
    expect((await failure(startPlay(deps, event, UID, "trivia", { playerId }))).status).toBe(403);
    status = "ended";
    expect(await failure(startPlay(deps, open, UID, "trivia", { playerId }))).toEqual({
      status: 403,
      message: "This game has closed.",
    });
  });

  it("S08-AC9: instructions are the event's own or the game type's", () => {
    expect(instructionsFor(event, "own-rules")).toEqual({
      title: "Our rules",
      lines: ["Be quick."],
    });
    expect(instructionsFor(event, "trivia")?.lines[0]).toBe(
      "5 quick questions. You have 15 seconds for each.",
    );
    expect(instructionsFor(event, "jeopardy")).toBeNull();
  });
});
