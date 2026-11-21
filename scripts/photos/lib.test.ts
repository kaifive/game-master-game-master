import { describe, expect, it } from "vitest";
import { csv, fileName, parseArgs, safe, type BackupFile } from "./lib";

const photo: BackupFile = {
  kind: "photo",
  id: "ph1",
  gameId: "spot-and-snipe",
  game: "Spot and Snipe",
  playerId: "p1",
  nickname: 'Mai "Tiger", Jr.',
  at: Date.UTC(2026, 11, 19, 20, 5, 9),
  score: 80,
  url: "https://abc.public.blob.vercel-storage.com/events/holiday-2026/photos/x-AbC.jpeg",
};

describe("photos:export and photos:prune (ADR-012)", () => {
  it("ADR-012: reads export and prune arguments, with the site from --site or GM_SITE", () => {
    expect(parseArgs(["export", "holiday-2026"], {})).toEqual({
      command: "export",
      slug: "holiday-2026",
      site: "http://localhost:3000",
      out: "backups/holiday-2026",
    });
    expect(
      parseArgs(
        ["prune", "holiday-2026", "--backup", "Drive: Game Master/holiday-2026", "--count", "42"],
        {
          GM_SITE: "https://party.example.app/",
        },
      ),
    ).toEqual({
      command: "prune",
      slug: "holiday-2026",
      site: "https://party.example.app",
      backup: "Drive: Game Master/holiday-2026",
      count: 42,
    });
    expect(parseArgs(["prune", "holiday-2026", "--count", "4"], {})).toMatch(/where the backup is/);
    expect(parseArgs(["prune", "holiday-2026", "--backup", "x"], {})).toMatch(/how many files/);
    expect(parseArgs(["export", "../etc"], {})).toMatch(/which event/);
    expect(parseArgs(["wipe", "holiday-2026"], {})).toMatch(/export or prune/);
  });

  it("ADR-012: names each file by kind, time, player, game and id, safe on every computer", () => {
    expect(fileName(photo)).toBe("photos/2026-12-19T20-05-09_Mai-Tiger-Jr_Spot-and-Snipe_ph1.jpeg");
    expect(
      fileName({ ...photo, kind: "drawing", url: "https://b.test/d.svg", nickname: "Bảo" }),
    ).toMatch(/^drawings\/.*_Ba-o_.*\.svg$/);
    expect(safe("///")).toBe("x");
  });

  it("ADR-012: the CSV lists every file with who, when, which game and its score, quoting where needed", () => {
    const out = csv([photo, { ...photo, id: "ph2", score: null }]).split("\n");
    expect(out[0]).toBe("kind,file,game,player,taken_at,score,url");
    expect(out[1]).toContain('"Mai ""Tiger"", Jr."');
    expect(out[1]).toContain("2026-12-19T20:05:09.000Z,80,");
    expect(out[2]).toContain("2026-12-19T20:05:09.000Z,,https://");
  });
});
