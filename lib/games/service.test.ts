import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import type { EventConfig, EventStatus } from "@/lib/events";
import { MemoryPlayerRepo } from "@/lib/players";
import { MemoryPlayRepo } from "./repo.memory";
import { MemoryDrawingFiles } from "@/lib/drawings";
import {
  addPhoto,
  MAX_PHOTO_BYTES,
  hubPlays,
  instructionsFor,
  makeMove,
  startPlay,
  type FinishedRun,
  type GameDeps,
} from "./service";
import type { Seat } from "./model";
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
let bests: FinishedRun[] = [];
let paid: string[] = [];
let seat: Seat = { phase: "individual", team: null, isCaptain: false };
const dragons = { id: "t1", name: "Dragons", color: 1 };

beforeEach(async () => {
  bests = [];
  paid = [];
  seat = { phase: "individual", team: null, isCaptain: false };
  clock = 1_000_000;
  status = "live";
  const players = new MemoryPlayerRepo();
  deps = {
    plays: new MemoryPlayRepo(),
    players,
    status: () => Promise.resolve(status),
    now: () => clock,
    seed: () => 42,
    onBest: (_slug, to, run) => {
      bests.push(run);
      paid.push("kind" in to ? `team:${to.id}` : `player:${to.id}`);
      return Promise.resolve();
    },
    seat: () => Promise.resolve(seat),
    pointsOf: () => Promise.resolve(123),
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
    expect(await hubPlays(deps, event, UID, playerId)).toMatchObject({ plays: {}, total: 123 });
    await start();
    expect(await hubPlays(deps, event, UID, playerId)).toEqual({
      plays: { trivia: { status: "playing", best: 0, runs: 1 } },
      total: 123,
      seat: { phase: "individual", team: null, isCaptain: false },
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

  it("S04-AC1: a finished run with a new best awards the improvement, once", async () => {
    const done = await playThrough();
    if (done.best === 0) return; // every answer wrong: nothing to award
    expect(bests).toEqual([
      { gameId: "trivia", title: "Holiday Trivia", run: 1, gain: done.best, replay: false },
    ]);
    await start(); // reopening a finished play awards nothing more
    expect(bests).toHaveLength(1);
  });

  it("S04-AC1: a replay awards only what it beat the best by, and nothing when worse", async () => {
    const replay: EventConfig = { ...event, replayable: true };
    const run = async (answer: (v: Asked) => unknown) => {
      let res = await startPlay(deps, replay, UID, "trivia", { playerId, again: true });
      while (res.status === "playing") {
        const v = res.view as Asked;
        res = await makeMove(deps, replay, UID, "trivia", {
          playerId,
          step: res.step,
          move: v.kind === "question" ? answer(v) : { type: "next" },
        });
      }
      return res;
    };
    // A first run that times out on every question scores 0: no award.
    await startPlay(deps, replay, UID, "trivia", { playerId });
    let res = await startPlay(deps, replay, UID, "trivia", { playerId });
    while (res.status === "playing") {
      clock += 60_000;
      res = await makeMove(deps, replay, UID, "trivia", {
        playerId,
        step: res.step,
        move: { type: "next" },
      });
    }
    expect(bests).toEqual([]);
    // A replay with every answer right, instantly, scores 100: the gain is 100.
    const content = replay.games[0]?.content as {
      questions: { id: string; prompt: string; answer: number; choices: unknown[] }[];
    };
    const right = (v: Asked) => {
      const q = content.questions.find((x) => x.prompt === v.prompt);
      const want = q?.choices[q.answer];
      // A choice is text, or a picture: match whichever it is.
      const same = (c: { text?: string | undefined; image?: { src: string } | undefined }) =>
        typeof want === "string"
          ? c.text === want
          : c.text === (want as { text?: string }).text &&
            c.image?.src === (want as { image?: { src: string } }).image?.src;
      return { type: "answer", choice: v.choices.findIndex(same) };
    };
    const best = await run(right);
    expect(best.best).toBe(100);
    expect(bests).toEqual([
      { gameId: "trivia", title: "Holiday Trivia", run: 2, gain: 100, replay: true },
    ]);
  });

  it("S04-AC6: a failed award doesn't break the finish; the play is saved", async () => {
    deps.onBest = () => Promise.reject(new Error("realtime database down"));
    const done = await playThrough();
    expect(done.status).toBe("finished");
    expect((await deps.plays.get(event.slug, "trivia", playerId))?.status).toBe("finished");
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
      "5 quick questions. You have 10 seconds for each.",
    );
    expect(instructionsFor(event, "jeopardy")).toBeNull();
  });

  it("S03-AC5: only a captain plays a team game, for their team, in the team phase; it pays the team", async () => {
    const team = (m: unknown, step = 0) =>
      makeMove(deps, event, UID, "team-trivia", { playerId, step, move: m });
    const startTeam = () => startPlay(deps, event, UID, "team-trivia", { playerId });
    expect((await failure(startTeam())).message).toMatch(/team phase/);
    seat = { phase: "team", team: null, isCaptain: false };
    expect((await failure(startTeam())).message).toMatch(/Join a team/);
    seat = { phase: "team", team: dragons, isCaptain: false };
    expect((await failure(startTeam())).message).toBe("Your captain plays this one for the team.");
    seat = { phase: "team", team: dragons, isCaptain: true };
    let res = await startTeam();
    while (res.status === "playing") {
      const v = res.view as TriviaView;
      res = await team(
        v.kind === "question" ? { type: "answer", choice: 0 } : { type: "next" },
        res.step,
      );
    }
    // The play is the team's, and so are its points.
    expect(await deps.plays.get(event.slug, "team-trivia", "t1")).toMatchObject({
      status: "finished",
    });
    expect(await deps.plays.get(event.slug, "team-trivia", playerId)).toBeNull();
    if (res.points > 0) expect(paid).toEqual(["team:t1"]);
    // Members see the team's play in their list; solo games stay theirs.
    const hub = await hubPlays(deps, event, UID, playerId);
    expect(hub.plays["team-trivia"]).toMatchObject({ status: "finished" });
    expect(hub.seat).toEqual(seat);
  });

  it("S17-AC4: Geocache banks each code's share as it's found, with its own award id", async () => {
    const play = (step: number, code: string) =>
      makeMove(deps, event, UID, "geocache", { playerId, step, move: { type: "code", code } });
    let res = await startPlay(deps, event, UID, "geocache", { playerId });
    res = await play(res.step, "SNOW1");
    expect(res).toMatchObject({ status: "playing", best: 33 });
    res = await play(res.step, "SNOW1"); // again: nothing new
    res = await play(res.step, "HOLLY2");
    expect(res.best).toBe(67);
    res = await play(res.step, "GIFT3");
    expect(res).toMatchObject({ status: "finished", best: 100 });
    expect(bests.map((b) => b.gain)).toEqual([33, 34, 33]);
    expect(new Set(bests.map((b) => `${b.key ?? ""}:${String(b.run)}`)).size).toBe(3);
  });

  it("S17-AC2: a jar is one guess, even when the event is replayable", async () => {
    const replay = { ...event, replayable: true };
    const res = await startPlay(deps, replay, UID, "guessing-jar", { playerId });
    const done = await makeMove(deps, replay, UID, "guessing-jar", {
      playerId,
      step: res.step,
      move: { type: "guess", value: 300 },
    });
    expect(done.status).toBe("finished");
    const again = await startPlay(deps, replay, UID, "guessing-jar", { playerId, again: true });
    expect(again).toEqual(done);
    const hub = await hubPlays(deps, replay, UID, playerId);
    expect(hub.plays["guessing-jar"]).toMatchObject({ once: true, waiting: true });
  });
});

describe("kept drawings (ADR-032)", () => {
  const doodle = (keepDrawings: boolean) =>
    ({
      ...event,
      games: [
        {
          id: "doodle",
          type: "draw",
          title: "Doodle",
          mode: "solo",
          visibility: "listed",
          content: {},
          scoring: { awardTo: "player" },
          keepDrawings,
        },
      ],
    }) satisfies EventConfig;
  const strokes = [
    [
      [0.1, 0.1],
      [0.9, 0.9],
    ],
  ];
  const drawOnce = async (e: EventConfig) => {
    const res = await startPlay(deps, e, UID, "doodle", { playerId });
    return makeMove(deps, e, UID, "doodle", {
      playerId,
      step: res.step,
      move: { type: "submit", strokes },
    });
  };

  it("S18-AC7: a game that keeps drawings hands each finished run's drawing over, once", async () => {
    const kept: unknown[] = [];
    deps.keepDrawing = (_slug, d) => Promise.resolve(kept.push(d));
    const res = await drawOnce(doodle(true));
    expect(res.status).toBe("finished");
    expect(kept).toEqual([{ gameId: "doodle", playerId, run: 1, points: res.points, strokes }]);
  });

  it("S18-AC7: a game without the flag keeps nothing", async () => {
    const kept: unknown[] = [];
    deps.keepDrawing = (_slug, d) => Promise.resolve(kept.push(d));
    await drawOnce(doodle(false));
    expect(kept).toEqual([]);
  });

  it("S18-AC7: a failed save doesn't block the score", async () => {
    deps.keepDrawing = () => Promise.reject(new Error("Blob is down"));
    const res = await drawOnce(doodle(true));
    expect(res.status).toBe("finished");
    expect(bests).toHaveLength(res.points > 0 ? 1 : 0);
  });
});

describe("photo uploads (spec 20)", () => {
  const jpeg = (bytes = 1000, type = "image/jpeg") => new Blob([new Uint8Array(bytes)], { type });
  const snipe = { ...event, games: event.games.filter((g) => g.id === "spot-and-snipe") };
  const send = (file: Blob, who = playerId) =>
    addPhoto(deps, snipe, UID, "spot-and-snipe", { playerId: who, file });

  it("S20-AC2: keeps a photo for this phone's player in an open game with room", async () => {
    const files = new MemoryDrawingFiles();
    let n = 0;
    deps.files = files;
    deps.id = () => `ph${String(++n)}`;
    expect((await failure(send(jpeg()))).status).toBe(404); // start the game first
    await startPlay(deps, snipe, UID, "spot-and-snipe", { playerId });
    expect((await failure(send(jpeg(1000, "image/gif")))).status).toBe(400);
    expect((await failure(send(jpeg(MAX_PHOTO_BYTES + 1)))).status).toBe(400);
    expect((await failure(send(jpeg(), "someone-else"))).status).toBe(403);
    const first = await send(jpeg());
    expect(first.status).toBe("playing");
    expect(first.view).toMatchObject({ photos: [{ id: "ph1", rating: null }] });
    expect((first.view as { photos: { url: string }[] }).photos[0]?.url).toMatch(
      /^data:image\/jpeg;base64,/,
    );
    await send(jpeg());
    const third = await send(jpeg());
    // Three photos fill the play: it's over and waits for the host's ratings.
    expect(third).toMatchObject({ status: "finished", points: 0, waiting: true, once: true });
    expect((await failure(send(jpeg()))).status).toBe(400);
    status = "ended";
    expect((await failure(send(jpeg()))).status).toBe(403);
  });

  it("S20-AC2: without a Blob store, photos can't be sent yet", async () => {
    deps.files = null;
    deps.id = () => "x";
    await startPlay(deps, snipe, UID, "spot-and-snipe", { playerId });
    expect(await failure(send(jpeg()))).toEqual({
      status: 503,
      message: "Photos can't be sent yet. Tell the host.",
    });
  });
});
