import { describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import type { EventConfig, EventStatus } from "@/lib/events";
import { MemoryPlayerRepo } from "./repo.memory";
import { MESSAGES } from "./rules";
import { deviceView, joinEvent } from "./service";

const event: EventConfig = { ...holiday2026, maxPlayersPerDevice: 2, blockedNames: ["grinch"] };
const CODE = event.joinCode;

function setup(status: EventStatus = "upcoming", banned: string[] = []) {
  const players = new MemoryPlayerRepo({
    banned: banned.map((uid) => ({ slug: event.slug, uid })),
  });
  return { players, status: () => Promise.resolve(status) };
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
    expect((await deviceView(deps, event, "deviceA1")).players).toEqual([mai]);
  });

  it("S02-AC2: a wrong or missing code is refused", async () => {
    const deps = setup();
    for (const code of ["ZZZZZ", undefined])
      expect(
        await failure(
          joinEvent(deps, event, "deviceA1", { nickname: "Mai", ...(code ? { code } : {}) }),
        ),
      ).toEqual({
        status: 403,
        message: MESSAGES.wrongCode,
      });
  });

  it("S02-AC3: a name that breaks the rules is a 400 with its message", async () => {
    expect(
      await failure(joinEvent(setup(), event, "deviceA1", { nickname: "M", code: CODE })),
    ).toEqual({
      status: 400,
      message: MESSAGES.tooShort,
    });
  });

  it("S02-AC5: the event's own blocked words apply on the server", async () => {
    expect(
      await failure(joinEvent(setup(), event, "deviceA1", { nickname: "Gr1nch", code: CODE })),
    ).toEqual({ status: 400, message: MESSAGES.blocked });
  });

  it("S02-AC6: later players on a device need no code, up to the device limit", async () => {
    const deps = setup();
    await joinEvent(deps, event, "deviceA1", { nickname: "Mai", code: CODE });
    await joinEvent(deps, event, "deviceA1", { nickname: "Bao" });
    expect(await failure(joinEvent(deps, event, "deviceA1", { nickname: "Lan" }))).toEqual({
      status: 409,
      message: MESSAGES.full,
    });
  });

  it("S02-AC4: a taken name is a 409", async () => {
    const deps = setup();
    await joinEvent(deps, event, "deviceA1", { nickname: "Mai", code: CODE });
    expect(
      await failure(joinEvent(deps, event, "deviceB1", { nickname: "mai", code: CODE })),
    ).toEqual({
      status: 409,
      message: MESSAGES.taken,
    });
  });

  it("S02-AC9: a banned device is refused, even with the right code", async () => {
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
    ).toEqual({
      status: 403,
      message: MESSAGES.ended,
    });
  });
});
