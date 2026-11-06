import { describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import type { EventConfig, EventStatus } from "@/lib/events";
import { MemoryPlayerRepo } from "./repo.memory";
import { MESSAGES } from "./rules";
import { deviceView, joinEvent, type PlayerDeps } from "./service";

const event: EventConfig = { ...holiday2026, restartsPerDevice: 1, blockedNames: ["grinch"] };
const CODE = event.joinCode;

const forfeited: string[] = [];

function setup(status: EventStatus = "upcoming", banned: string[] = [], captains: string[] = []) {
  forfeited.length = 0;
  const players = new MemoryPlayerRepo({
    banned: banned.map((uid) => ({ slug: event.slug, uid })),
  });
  const deps: PlayerDeps = {
    players,
    status: () => Promise.resolve(status),
    isCaptain: (_slug, id) => Promise.resolve(captains.includes(id)),
    onForfeit: (_slug, id) => {
      forfeited.push(id);
      return Promise.resolve();
    },
  };
  return deps;
}

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return { status: err.status, message: err.message };
}

describe("joinEvent", () => {
  it("S02-AC2: joins with the event's join code, in any case", async () => {
    const deps = setup();
    const mai = await joinEvent(deps, event, "deviceA1", { nickname: " Mai ", code: "wush7" });
    expect(mai.nickname).toBe("Mai");
    expect(await deviceView(deps, event, "deviceA1")).toEqual({
      banned: false,
      player: mai,
      restartsLeft: 1,
    });
  });

  it("S02-AC2: a wrong or missing code is refused", async () => {
    const deps = setup();
    for (const code of ["ZZZZZ", undefined])
      expect(
        await failure(
          joinEvent(deps, event, "deviceA1", { nickname: "Mai", ...(code ? { code } : {}) }),
        ),
      ).toEqual({ status: 403, message: MESSAGES.wrongCode });
  });

  it("S02-AC3: a name that breaks the rules is a 400 with its message", async () => {
    expect(
      await failure(joinEvent(setup(), event, "deviceA1", { nickname: "M", code: CODE })),
    ).toEqual({ status: 400, message: MESSAGES.tooShort });
  });

  it("S02-AC5: the event's own blocked words apply on the server", async () => {
    expect(
      await failure(joinEvent(setup(), event, "deviceA1", { nickname: "Gr1nch", code: CODE })),
    ).toEqual({ status: 400, message: MESSAGES.blocked });
  });

  it("S02-AC6: a phone has one player; a second name without starting over is refused", async () => {
    const deps = setup();
    await joinEvent(deps, event, "deviceA1", { nickname: "Mai", code: CODE });
    expect(await failure(joinEvent(deps, event, "deviceA1", { nickname: "Bao" }))).toEqual({
      status: 409,
      message: MESSAGES.hasPlayer,
    });
  });

  it("S02-AC7: starting over needs no code, forfeits the old player and counts against the limit", async () => {
    const deps = setup();
    const mai = await joinEvent(deps, event, "deviceA1", { nickname: "Mai", code: CODE });
    const bao = await joinEvent(deps, event, "deviceA1", { nickname: "Bao", restart: true });
    expect(bao.id).not.toBe(mai.id);
    expect(forfeited).toEqual([mai.id]); // S04-AC5: off the leaderboard
    expect(await deviceView(deps, event, "deviceA1")).toEqual({
      banned: false,
      player: bao,
      restartsLeft: 0,
    });
    expect(
      await failure(joinEvent(deps, event, "deviceA1", { nickname: "Lan", restart: true })),
    ).toEqual({ status: 409, message: MESSAGES.noRestarts });
  });

  it("S02-AC7: a phone with no player has nothing to start over from", async () => {
    expect(
      (await failure(joinEvent(setup(), event, "deviceA1", { nickname: "Mai", restart: true })))
        .status,
    ).toBe(400);
  });

  it("S02-AC13: a team captain can't start over", async () => {
    const deps = setup("live");
    const mai = await joinEvent(deps, event, "deviceA1", { nickname: "Mai", code: CODE });
    const captainDeps = {
      ...deps,
      isCaptain: (_s: string, id: string) => Promise.resolve(id === mai.id),
    };
    expect(
      await failure(joinEvent(captainDeps, event, "deviceA1", { nickname: "Bao", restart: true })),
    ).toEqual({ status: 403, message: MESSAGES.captain });
  });

  it("S02-AC4: a taken name is a 409", async () => {
    const deps = setup();
    await joinEvent(deps, event, "deviceA1", { nickname: "Mai", code: CODE });
    expect(
      await failure(joinEvent(deps, event, "deviceB1", { nickname: "mai", code: CODE })),
    ).toEqual({ status: 409, message: MESSAGES.taken });
  });

  it("S02-AC9: a banned phone is refused, even with the right code", async () => {
    expect(
      await failure(
        joinEvent(setup("live", ["deviceA1"]), event, "deviceA1", { nickname: "Mai", code: CODE }),
      ),
    ).toEqual({ status: 403, message: MESSAGES.banned });
  });

  it("S02-AC10: joining works while live and is refused once ended", async () => {
    await expect(
      joinEvent(setup("live"), event, "deviceA1", { nickname: "Mai", code: CODE }),
    ).resolves.toBeTruthy();
    expect(
      await failure(joinEvent(setup("ended"), event, "deviceA1", { nickname: "Mai", code: CODE })),
    ).toEqual({ status: 403, message: MESSAGES.ended });
  });
});
