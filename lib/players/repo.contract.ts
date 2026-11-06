import { expect, test } from "vitest";
import { isAppError } from "@/lib/errors";
import type { PlayerRepo } from "./repo";
import { nicknameKey } from "./rules";

type Seed = (data: { banned?: { slug: string; uid: string }[] }) => Promise<PlayerRepo>;

const SLUG = "holiday-2026";
const named = (nickname: string) => ({ nickname, key: nicknameKey(nickname) });

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
  test("a new phone has no player, isn't banned and hasn't started over", async () => {
    const repo = await seed({});
    expect(await repo.device(SLUG, "deviceA1")).toEqual({
      banned: false,
      player: null,
      restarts: 0,
    });
  });

  test("S02-AC1: a joined player is the phone's player", async () => {
    const repo = await seed({});
    const mai = await repo.join(SLUG, "deviceA1", named("Mai"));
    expect(mai.nickname).toBe("Mai");
    expect(await repo.device(SLUG, "deviceA1")).toEqual({
      banned: false,
      player: mai,
      restarts: 0,
    });
    expect((await repo.device(SLUG, "deviceB1")).player).toBeNull();
  });

  test("S02-AC8: the same name again on the same phone returns the same player", async () => {
    const repo = await seed({});
    const first = await repo.join(SLUG, "deviceA1", named("Mai"));
    expect(await repo.join(SLUG, "deviceA1", named("mai"))).toEqual(first);
  });

  test("S02-AC6: a phone holds one player; another name needs a restart", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", named("Mai"));
    expect(await failure(repo.join(SLUG, "deviceA1", named("Bao")))).toEqual({
      code: "CONFLICT",
      reason: "has-player",
    });
  });

  test("S02-AC4: a name another phone holds is taken; other events are separate", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", named("Mai"));
    expect(await failure(repo.join(SLUG, "deviceB1", named("MAI")))).toEqual({
      code: "CONFLICT",
      reason: "taken",
    });
    await expect(repo.join("spring-2027", "deviceB1", named("Mai"))).resolves.toBeTruthy();
  });

  test("S02-AC7: starting over forfeits the old player, frees its name and uses a restart", async () => {
    const repo = await seed({});
    const mai = await repo.join(SLUG, "deviceA1", named("Mai"));
    const bao = await repo.restart(SLUG, "deviceA1", named("Bao"), 1);
    expect(bao.id).not.toBe(mai.id);
    expect(await repo.device(SLUG, "deviceA1")).toEqual({
      banned: false,
      player: bao,
      restarts: 1,
    });
    // Mai's name is free again, for anyone.
    await expect(repo.join(SLUG, "deviceB1", named("Mai"))).resolves.toMatchObject({
      nickname: "Mai",
    });
  });

  test("S02-AC7: starting over can keep the same name, as a new player", async () => {
    const repo = await seed({});
    const mai = await repo.join(SLUG, "deviceA1", named("Mai"));
    const again = await repo.restart(SLUG, "deviceA1", named("Mai"), 1);
    expect(again.id).not.toBe(mai.id);
  });

  test("S02-AC7: a phone can't start over past its limit, or onto a taken name", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", named("Mai"));
    await repo.join(SLUG, "deviceB1", named("Kim"));
    expect(await failure(repo.restart(SLUG, "deviceA1", named("Kim"), 1))).toEqual({
      code: "CONFLICT",
      reason: "taken",
    });
    await repo.restart(SLUG, "deviceA1", named("Bao"), 1);
    expect(await failure(repo.restart(SLUG, "deviceA1", named("Lan"), 1))).toEqual({
      code: "CONFLICT",
      reason: "no-restarts",
    });
    expect(await failure(repo.restart(SLUG, "deviceB1", named("Lan"), 0))).toEqual({
      code: "CONFLICT",
      reason: "no-restarts",
    });
  });

  test("S02-AC9: a banned phone can't join or start over", async () => {
    const repo = await seed({ banned: [{ slug: SLUG, uid: "deviceA1" }] });
    expect((await repo.device(SLUG, "deviceA1")).banned).toBe(true);
    expect(await failure(repo.join(SLUG, "deviceA1", named("Mai")))).toEqual({
      code: "FORBIDDEN",
      reason: "banned",
    });
    expect(await failure(repo.restart(SLUG, "deviceA1", named("Mai"), 5))).toEqual({
      code: "FORBIDDEN",
      reason: "banned",
    });
  });

  test("S02-AC12: two phones racing for one name: exactly one gets it", async () => {
    const repo = await seed({});
    const phones = ["deviceA1", "deviceB1", "deviceC1"];
    const results = await Promise.allSettled(
      phones.map((uid) => repo.join(SLUG, uid, named("Mai"))),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const owners = await Promise.all(phones.map((uid) => repo.device(SLUG, uid)));
    expect(owners.filter((d) => d.player)).toHaveLength(1);
  });

  test("S07-AC3: lists active players newest first, with their phone and restarts", async () => {
    const repo = await seed({});
    const mai = await repo.join(SLUG, "deviceA1", named("Mai"));
    const bao = await repo.join(SLUG, "deviceB1", named("Bao"));
    await repo.restart(SLUG, "deviceB1", named("Lan"), 1);
    const list = await repo.list(SLUG);
    expect(list.map((p) => [p.nickname, p.deviceUid, p.restarts])).toEqual([
      ["Lan", "deviceB1", 1],
      ["Mai", "deviceA1", 0],
    ]);
    expect(list.some((p) => p.id === bao.id)).toBe(false);
    expect(list.find((p) => p.id === mai.id)?.joinedAt).toBeTypeOf("number");
  });

  test("S07-AC7: removing a player frees their name and lets their phone join again", async () => {
    const repo = await seed({});
    const mai = await repo.join(SLUG, "deviceA1", named("Mai"));
    await repo.remove(SLUG, mai.id);
    expect(await repo.list(SLUG)).toEqual([]);
    expect((await repo.device(SLUG, "deviceA1")).player).toBeNull();
    await expect(repo.join(SLUG, "deviceB1", named("Mai"))).resolves.toBeTruthy();
    await expect(repo.join(SLUG, "deviceA1", named("Bao"))).resolves.toBeTruthy();
  });

  test("S07-AC7: banning a phone removes its player and stops it joining", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", named("Mai"));
    await repo.ban(SLUG, "deviceA1");
    expect(await repo.list(SLUG)).toEqual([]);
    expect(await repo.device(SLUG, "deviceA1")).toMatchObject({ banned: true, player: null });
    expect(await failure(repo.join(SLUG, "deviceA1", named("Bao")))).toEqual({
      code: "FORBIDDEN",
      reason: "banned",
    });
  });

  test("S07-AC5: giving a restart lets the phone start over once more", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", named("Mai"));
    await repo.restart(SLUG, "deviceA1", named("Bao"), 1);
    await repo.grantRestart(SLUG, "deviceA1");
    expect((await repo.device(SLUG, "deviceA1")).restarts).toBe(0);
    await expect(repo.restart(SLUG, "deviceA1", named("Lan"), 1)).resolves.toBeTruthy();
    await repo.grantRestart(SLUG, "deviceZ9"); // a phone with nothing: no harm
    expect((await repo.device(SLUG, "deviceZ9")).restarts).toBe(0);
  });

  test("S07-AC9: clearing an event deletes its players, phones and names", async () => {
    const repo = await seed({});
    await repo.join(SLUG, "deviceA1", named("Mai"));
    await repo.join("spring-2027", "deviceA1", named("Mai"));
    await repo.clear(SLUG);
    expect(await repo.list(SLUG)).toEqual([]);
    expect(await repo.device(SLUG, "deviceA1")).toEqual({
      banned: false,
      player: null,
      restarts: 0,
    });
    await expect(repo.join(SLUG, "deviceB1", named("Mai"))).resolves.toBeTruthy();
    expect(await repo.list("spring-2027")).toHaveLength(1);
  });
}
