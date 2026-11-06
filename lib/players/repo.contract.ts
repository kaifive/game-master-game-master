import { expect, test } from "vitest";
import { isAppError } from "@/lib/errors";
import type { PlayerRepo } from "./repo";
import { nicknameKey } from "./rules";

type Seed = (data: { banned?: { slug: string; uid: string }[] }) => Promise<PlayerRepo>;

const SLUG = "holiday-2026";
const player = (nickname: string, maxPerDevice = 4) => ({
  nickname,
  key: nicknameKey(nickname),
  maxPerDevice,
});

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!isAppError(err)) throw new Error("expected the call to fail with an AppError");
  return { code: err.code, reason: err.details.reason };
}

/** The same behavior from every PlayerRepo (ADR-016). */
export function playerRepoContract(seed: Seed) {
  test("a new device has no players and isn't banned", async () => {
    const repo = await seed({});
    expect(await repo.device(SLUG, "deviceA1")).toEqual({ banned: false, players: [] });
  });

  test("S02-AC1: a joined player is listed on its device, in join order", async () => {
    const repo = await seed({});
    const mai = await repo.join(SLUG, "deviceA1", player("Mai"));
    const bao = await repo.join(SLUG, "deviceA1", player("Bao"));
    expect(mai.nickname).toBe("Mai");
    expect(await repo.device(SLUG, "deviceA1")).toEqual({ banned: false, players: [mai, bao] });
    expect((await repo.device(SLUG, "deviceB1")).players).toEqual([]);
  });

  test("S02-AC8: the same name again on the same device returns the same player", async () => {
    const repo = await seed({});
    const first = await repo.join(SLUG, "deviceA1", player("Mai"));
    expect(await repo.join(SLUG, "deviceA1", player("mai"))).toEqual(first);
    expect((await repo.device(SLUG, "deviceA1")).players).toHaveLength(1);
  });

  test("S02-AC4: a name another device holds is taken; other events are separate", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", player("Mai"));
    expect(await failure(repo.join(SLUG, "deviceB1", player("MAI")))).toEqual({
      code: "CONFLICT",
      reason: "taken",
    });
    await expect(repo.join("spring-2027", "deviceB1", player("Mai"))).resolves.toBeTruthy();
  });

  test("S02-AC6: a full device can't add another player", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", player("Mai", 2));
    await repo.join(SLUG, "deviceA1", player("Bao", 2));
    expect(await failure(repo.join(SLUG, "deviceA1", player("Lan", 2)))).toEqual({
      code: "CONFLICT",
      reason: "full",
    });
  });

  test("S02-AC9: a banned device can't join", async () => {
    const repo = await seed({ banned: [{ slug: SLUG, uid: "deviceA1" }] });
    expect((await repo.device(SLUG, "deviceA1")).banned).toBe(true);
    expect(await failure(repo.join(SLUG, "deviceA1", player("Mai")))).toEqual({
      code: "FORBIDDEN",
      reason: "banned",
    });
  });

  test("S02-AC12: two devices racing for one name: exactly one gets it", async () => {
    const repo = await seed({});
    const results = await Promise.allSettled(
      ["deviceA1", "deviceB1", "deviceC1"].map((uid) => repo.join(SLUG, uid, player("Mai"))),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const owners = await Promise.all(
      ["deviceA1", "deviceB1", "deviceC1"].map((uid) => repo.device(SLUG, uid)),
    );
    expect(owners.flatMap((d) => d.players)).toHaveLength(1);
  });
}
