import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import { EMPTY_GUESTS, pool, ticketsOf, type Guest } from "./model";
import { drawTicket, LAND_MS, raffleStep, raffleView, type RaffleCtx } from "./raffle";
import { MemoryGuestRepo } from "./repo.memory";
import { guestKey, mergeUpload, parseGuestCsv } from "./rules";
import { adminGuestAction, checkinAction, type GuestDeps } from "./service";

const event = holiday2026;
let n = 0;
let deps: GuestDeps;
beforeEach(() => {
  n = 0;
  deps = { guests: new MemoryGuestRepo(), now: () => 1000, id: () => `g${String(++n)}` };
});

async function failure(p: Promise<unknown>) {
  const err: unknown = await p.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return err.message;
}

const guest = (id: string, over: Partial<Guest> = {}): Guest => ({
  id,
  name: id,
  family: null,
  key: guestKey(null, id),
  checkedIn: true,
  checkedInAt: 1,
  source: "list",
  extra: 0,
  won: 0,
  ...over,
});

describe("the RSVP file (spec 32)", () => {
  it("S32-AC1: one column is names; two are family then name; headers, quotes, blanks and long names are handled", () => {
    expect(parseGuestCsv("Name\nKhai\n\n  Mai  Anh \n")).toEqual({
      ok: true,
      rows: [
        { family: null, name: "Khai" },
        { family: null, name: "Mai Anh" },
      ],
    });
    expect(
      parseGuestCsv('Family,Name\r\nNguyen,Khai\r\n"Tran, Jr",Bao\r\n,Lan\r\nSolo\r\n'),
    ).toEqual({
      ok: true,
      rows: [
        { family: "Nguyen", name: "Khai" },
        { family: "Tran, Jr", name: "Bao" },
        { family: null, name: "Lan" },
        { family: null, name: "Solo" },
      ],
    });
    // name,family swaps the columns.
    expect(parseGuestCsv("name,family\nKhai,Nguyen")).toEqual({
      ok: true,
      rows: [{ family: "Nguyen", name: "Khai" }],
    });
    expect(parseGuestCsv("x".repeat(61))).toMatchObject({ ok: false });
    expect(parseGuestCsv("\n\n")).toEqual({ ok: false, message: "No names found in that file." });
    expect(
      parseGuestCsv(Array.from({ length: 1001 }, (_, i) => `P${String(i)}`).join("\n")),
    ).toMatchObject({
      ok: false,
    });
  });

  it("S32-AC2: uploading again keeps check-ins, tickets and wins, adds new names, and lists the missing", async () => {
    await adminGuestAction(deps, event, {
      action: "upload",
      csv: "Nguyen,Khai\nNguyen,Mai\nTran,Bao",
    });
    const khai = (await deps.guests.read(event.slug)).guests.find((g) => g.name === "Khai");
    await checkinAction(deps, event, { action: "checkIn", ids: [khai?.id ?? ""], checkedIn: true });
    await adminGuestAction(deps, event, { action: "tickets", id: khai?.id ?? "", extra: 2 });
    const again = await adminGuestAction(deps, event, {
      action: "upload",
      csv: "nguyen ,  KHAI\nNguyễn,Mai\nLe,Hoa",
    });
    // "Nguyễn,Mai" is Mai again (accents ignored); Le Hoa is new; Bao is gone from the file.
    expect(again.upload).toMatchObject({ added: 1, kept: 2 });
    expect(again.upload?.missing.map((g) => g.name)).toEqual(["Bao"]);
    const k = again.guests.find((g) => g.name === "Khai");
    expect(k).toMatchObject({ checkedIn: true, extra: 2, tickets: 3 });
    // Accents count as the same name: "Nguyễn" matches "Nguyen".
    expect(guestKey("Nguyễn", "Mai")).toBe(guestKey("nguyen", "mai"));
    expect(
      mergeUpload(
        EMPTY_GUESTS,
        [
          { family: null, name: "A" },
          { family: null, name: "a" },
        ],
        1,
        () => "x",
      ).added,
    ).toBe(1);
  });
});

describe("check-in (spec 32)", () => {
  it("S32-AC3: a family checks in together and each person can be ticked in or out; the counts follow", async () => {
    await adminGuestAction(deps, event, {
      action: "upload",
      csv: "Nguyen,Khai\nNguyen,Mai\nTran,Bao",
    });
    const list = await deps.guests.read(event.slug);
    const family = list.guests.filter((g) => g.family === "Nguyen").map((g) => g.id);
    let v = await checkinAction(deps, event, { action: "checkIn", ids: family, checkedIn: true });
    expect([v.here, v.total]).toEqual([2, 3]);
    v = await checkinAction(deps, event, {
      action: "checkIn",
      ids: [family[0] ?? ""],
      checkedIn: false,
    });
    expect(v.here).toBe(1);
    expect(v.guests.map((g) => g.family)).toEqual(["Nguyen", "Nguyen", "Tran"]);
  });

  it("S32-AC4: a walk-in is added checked in; a name already on the list is checked in instead", async () => {
    await adminGuestAction(deps, event, { action: "upload", csv: "Nguyen,Khai" });
    let v = await checkinAction(deps, event, { action: "add", name: " Lan ", family: "" });
    expect(v.guests.find((g) => g.name === "Lan")).toMatchObject({
      checkedIn: true,
      source: "door",
      family: null,
    });
    v = await checkinAction(deps, event, { action: "add", name: "khai", family: "NGUYEN" });
    expect(v.total).toBe(2);
    expect(v.notice).toBe("Already on the list: checked in.");
    expect(v.guests.find((g) => g.name === "Khai")?.checkedIn).toBe(true);
    expect(await failure(checkinAction(deps, event, { action: "add", name: "  " }))).toBe(
      "Type the guest's name.",
    );
  });

  it("S32-AC6: two check-ins sent at once on different members both land", async () => {
    await adminGuestAction(deps, event, { action: "upload", csv: "F,A\nF,B" });
    const [a, b] = (await deps.guests.read(event.slug)).guests;
    await Promise.all([
      checkinAction(deps, event, { action: "checkIn", ids: [a?.id ?? ""], checkedIn: true }),
      checkinAction(deps, event, { action: "checkIn", ids: [b?.id ?? ""], checkedIn: true }),
    ]);
    expect((await deps.guests.read(event.slug)).guests.every((g) => g.checkedIn)).toBe(true);
  });

  it("S32-AC7: tickets are 1 + extra − won once checked in, never below 0; extra goes from 0 to 99", async () => {
    expect(ticketsOf(guest("a", { extra: 2 }))).toBe(3);
    expect(ticketsOf(guest("a", { extra: 2, won: 1 }))).toBe(2);
    expect(ticketsOf(guest("a", { won: 3 }))).toBe(0);
    expect(ticketsOf(guest("a", { checkedIn: false, extra: 5 }))).toBe(0);
    expect(pool([guest("a", { extra: 1 }), guest("b"), guest("c", { checkedIn: false })])).toEqual({
      people: 2,
      tickets: 3,
    });
    await adminGuestAction(deps, event, { action: "upload", csv: "Khai" });
    const id = (await deps.guests.read(event.slug)).guests[0]?.id ?? "";
    expect(
      await failure(adminGuestAction(deps, event, { action: "tickets", id, extra: 100 })),
    ).toBe("Extra tickets go from 0 to 99.");
    const v = await adminGuestAction(deps, event, { action: "remove", id });
    expect(v.total).toBe(0);
  });
});

describe("the raffle (spec 32)", () => {
  const seeded = (seed: number) => {
    let s = seed;
    return (k: number) => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return s % k;
    };
  };
  const ctx = (now: number, randomInt = seeded(7)): RaffleCtx => {
    let i = 0;
    return { now, id: () => `d${String(++i)}_${String(now)}`, randomInt };
  };

  it("S32-AC8: each ticket is equally likely: a 3-ticket guest wins about three times as often as a 1-ticket guest; skipped guests never win", () => {
    const guests = [
      guest("one"),
      guest("three", { extra: 2 }),
      guest("out", { checkedIn: false }),
      guest("skip"),
    ];
    const wins: Record<string, number> = {};
    const rand = seeded(11);
    for (let i = 0; i < 30_000; i++) {
      const g = drawTicket(guests, ["skip"], rand);
      wins[g?.id ?? "none"] = (wins[g?.id ?? "none"] ?? 0) + 1;
    }
    expect(wins.out).toBeUndefined();
    expect(wins.skip).toBeUndefined();
    const ratio = (wins.three ?? 0) / (wins.one ?? 1);
    expect(ratio).toBeGreaterThan(2.8);
    expect(ratio).toBeLessThan(3.2);
  });

  it("S32-AC9 S32-AC10: Start flips, Stop draws and lands 3.5 s later, Claimed uses up the ticket, Not here skips for this prize only", () => {
    const guests = [guest("a"), guest("b")];
    const start = raffleStep(null, guests, "start", undefined, ctx(0));
    if (!start.ok) throw new Error(start.message);
    expect(start.raffle.status).toBe("flipping");
    expect([...start.raffle.names].sort()).toEqual(["a", "b"]);
    const stop = raffleStep(
      start.raffle,
      guests,
      "stop",
      start.raffle.drawId,
      ctx(100, () => 0),
    );
    if (!stop.ok) throw new Error(stop.message);
    expect(stop.raffle).toMatchObject({
      status: "stopped",
      landsAt: 100 + LAND_MS,
      winner: { guestId: "a" },
    });
    expect(raffleView(stop.raffle, { people: 2, tickets: 2 }, 200)).toMatchObject({
      status: "landing",
      winner: "a",
    });
    expect(raffleView(stop.raffle, { people: 2, tickets: 2 }, 100 + LAND_MS)).toMatchObject({
      status: "landed",
    });
    // Not before it lands.
    expect(raffleStep(stop.raffle, guests, "claim", stop.raffle.drawId, ctx(200))).toEqual({
      ok: false,
      message: "Wait for the name to land.",
    });
    // Not here: a skips this prize, and the names flip again at once without them.
    const away = raffleStep(stop.raffle, guests, "notHere", stop.raffle.drawId, ctx(5000));
    if (!away.ok) throw new Error(away.message);
    expect(away.raffle).toMatchObject({
      status: "flipping",
      skipped: ["a"],
      raffleId: start.raffle.raffleId,
    });
    expect(away.raffle.names).toEqual(["b"]);
    const again = raffleStep(
      away.raffle,
      guests,
      "stop",
      away.raffle.drawId,
      ctx(6000, () => 0),
    );
    if (!again.ok) throw new Error(again.message);
    expect(again.raffle.winner?.guestId).toBe("b");
    const claimed = raffleStep(again.raffle, guests, "claim", again.raffle.drawId, ctx(10_000));
    if (!claimed.ok) throw new Error(claimed.message);
    expect(claimed.claim).toBe("b");
    // A new raffle starts with nobody skipped.
    expect(claimed.raffle).toMatchObject({ status: "idle", skipped: [] });
  });

  it("S32-AC11: Start with no tickets is refused, and a repeated step for an old draw does nothing", () => {
    expect(
      raffleStep(null, [guest("a", { checkedIn: false })], "start", undefined, ctx(0)),
    ).toEqual({
      ok: false,
      message: "Nobody left to draw.",
    });
    const guests = [guest("a")];
    const start = raffleStep(null, guests, "start", undefined, ctx(0));
    if (!start.ok) throw new Error(start.message);
    const stop = raffleStep(start.raffle, guests, "stop", start.raffle.drawId, ctx(1));
    if (!stop.ok) throw new Error(stop.message);
    // A second Stop for the same draw, on another device: nothing changes.
    const twice = raffleStep(stop.raffle, guests, "stop", start.raffle.drawId, ctx(2));
    expect(twice.ok && twice.raffle).toEqual(stop.raffle);
    const claimed = raffleStep(stop.raffle, guests, "claim", stop.raffle.drawId, ctx(LAND_MS + 10));
    if (!claimed.ok) throw new Error(claimed.message);
    const again = raffleStep(
      claimed.raffle,
      guests,
      "claim",
      stop.raffle.drawId,
      ctx(LAND_MS + 20),
    );
    expect(again.ok && again.claim).toBeFalsy();
  });

  it("S32-AC13: the flip names leave out skipped guests and guests with no tickets", () => {
    const guests = [
      guest("a"),
      guest("b", { won: 1 }),
      guest("c", { checkedIn: false }),
      guest("d"),
    ];
    const away = raffleStep(
      {
        raffleId: "r",
        drawId: "x",
        status: "stopped",
        startedAt: 0,
        landsAt: 0,
        winner: { guestId: "d", name: "d" },
        skipped: [],
        names: [],
      },
      guests,
      "notHere",
      "x",
      ctx(10),
    );
    expect(away.ok && away.raffle.names).toEqual(["a"]);
  });
});
