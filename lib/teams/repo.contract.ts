import { expect, test } from "vitest";
import { isAppError } from "@/lib/errors";
import type { TeamRepo } from "./repo";

const SLUG = "holiday-2026";

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!isAppError(err)) throw new Error("expected the call to fail with an AppError");
  return err.details.reason;
}

/** The same behavior from every TeamRepo (ADR-016). `make` seeds players p1–p6. */
export function teamRepoContract(make: () => Promise<TeamRepo>) {
  test("S03-AC2: a captain's team starts with them as its only member, unnamed", async () => {
    const repo = await make();
    const team = await repo.create(SLUG, "p1", 1);
    expect(team).toMatchObject({ name: null, color: 1, captainId: "p1", memberIds: ["p1"] });
    expect((await repo.list(SLUG)).map((t) => t.id)).toEqual([team.id]);
    expect(await failure(repo.create(SLUG, "p1", 2))).toBe("on-team");
  });

  test("S03-AC2: team names are unique per event; a team can rename itself", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    const b = await repo.create(SLUG, "p2", 2);
    await repo.rename(SLUG, a.id, "Dragons", "dragons");
    expect(await failure(repo.rename(SLUG, b.id, "DRAGONS", "dragons"))).toBe("name-taken");
    await repo.rename(SLUG, a.id, "Snow Dragons", "snowdragons");
    await repo.rename(SLUG, b.id, "Dragons", "dragons");
    expect((await repo.list(SLUG)).map((t) => t.name)).toEqual(["Snow Dragons", "Dragons"]);
    expect(await failure(repo.rename(SLUG, "nope", "X", "x"))).toBe("no-team");
  });

  test("S29-AC2: naming a team can set its color, but never one another team holds, even two at once", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    const b = await repo.create(SLUG, "p2", 2);
    const c = await repo.create(SLUG, "p3", 3);
    await repo.rename(SLUG, a.id, "Dragons", "dragons", 6);
    expect(await failure(repo.rename(SLUG, b.id, "Tigers", "tigers", 6))).toBe("color-taken");
    expect(await failure(repo.rename(SLUG, b.id, "Tigers", "tigers", 3))).toBe("color-taken");
    // Two captains racing for Teal (7): exactly one gets it.
    const race = await Promise.allSettled([
      repo.rename(SLUG, b.id, "Tigers", "tigers", 7),
      repo.rename(SLUG, c.id, "Cranes", "cranes", 7),
    ]);
    expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const colors = (await repo.list(SLUG)).map((t) => t.color);
    expect(new Set(colors).size).toBe(3);
    expect(colors).toContain(6);
  });

  test("S31-AC2: a team keeps its selfie and the host's stickers", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    const selfie = { url: "https://blob.test/team-a.jpg", width: 1200, height: 900 };
    await repo.setSelfie(SLUG, a.id, selfie);
    const sticker = {
      id: "s1",
      kind: "santa-hat" as const,
      x: 0.4,
      y: 0.2,
      size: 0.3,
      angle: -12,
      flip: false,
    };
    await repo.setStickers(SLUG, a.id, [sticker]);
    expect((await repo.list(SLUG))[0]).toMatchObject({ selfie, stickers: [sticker] });
    await repo.setSelfie(SLUG, a.id, null);
    expect((await repo.list(SLUG))[0]?.selfie).toBeNull();
    expect(await failure(repo.setStickers(SLUG, "nope", []))).toBe("no-team");
  });

  test("S03-AC3: players join a team with room, once; full teams refuse", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    const b = await repo.create(SLUG, "p2", 2);
    await repo.join(SLUG, a.id, "p3", 2);
    expect(await failure(repo.join(SLUG, a.id, "p4", 2))).toBe("full");
    expect(await failure(repo.join(SLUG, b.id, "p3", 5))).toBe("on-team");
    expect(await failure(repo.join(SLUG, "nope", "p4", 5))).toBe("no-team");
    expect((await repo.list(SLUG)).find((t) => t.id === a.id)?.memberIds).toEqual(["p1", "p3"]);
  });

  test("S03-AC9: two players racing for a team's last spot: exactly one gets it", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    const results = await Promise.allSettled(
      ["p2", "p3", "p4"].map((p) => repo.join(SLUG, a.id, p, 2)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await repo.list(SLUG))[0]?.memberIds).toHaveLength(2);
  });

  test("S03-AC4: the host moves players and changes captains", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    const b = await repo.create(SLUG, "p2", 2);
    await repo.join(SLUG, a.id, "p3", 2);
    await repo.move(SLUG, "p3", b.id);
    await repo.move(SLUG, "p4", b.id); // even onto a team past its size, by the host
    await repo.setCaptain(SLUG, b.id, "p3");
    expect(await failure(repo.setCaptain(SLUG, b.id, "p1"))).toBe("not-member");
    const teams = await repo.list(SLUG);
    expect(teams.find((t) => t.id === a.id)?.memberIds).toEqual(["p1"]);
    expect(teams.find((t) => t.id === b.id)).toMatchObject({
      captainId: "p3",
      memberIds: ["p2", "p3", "p4"],
    });
  });

  test("a dropped player leaves their team; a dropped captain leaves it captainless", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    await repo.join(SLUG, a.id, "p2", 5);
    await repo.drop(SLUG, "p2");
    await repo.drop(SLUG, "p1");
    await repo.drop(SLUG, "p6"); // on no team: no harm
    expect((await repo.list(SLUG))[0]).toMatchObject({ captainId: null, memberIds: [] });
  });

  test("clearing an event deletes its teams and frees their names", async () => {
    const repo = await make();
    const a = await repo.create(SLUG, "p1", 1);
    await repo.rename(SLUG, a.id, "Dragons", "dragons");
    await repo.clear(SLUG);
    expect(await repo.list(SLUG)).toEqual([]);
    const b = await repo.create(SLUG, "p1", 1);
    await expect(repo.rename(SLUG, b.id, "Dragons", "dragons")).resolves.toBeUndefined();
  });
}
