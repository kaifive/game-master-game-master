import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { MemoryDrawingFiles } from "@/lib/drawings";
import { isAppError } from "@/lib/errors";
import { MemoryEventRuntimeRepo, type EventConfig } from "@/lib/events";
import { MemoryPlayerRepo, type PlayerSummary } from "@/lib/players";
import { awardTeam, MemoryBoardRepo, MemoryPointsRepo } from "@/lib/points";
import { MemoryTeamRepo, MemoryTeamSummaryRepo } from "./repo.memory";
import { captainSelfie, finaleFor, hostSelfie, saveStickers, selfiesFor } from "./selfies";
import { makeCaptain, nameTeam, publishTeams, teamsView, type TeamDeps } from "./service";

const event: EventConfig = { ...holiday2026, scoring: "both" };
const SLUG = event.slug;
let deps: TeamDeps;
let files: MemoryDrawingFiles;
let ids = 0;
const p: Record<string, PlayerSummary> = {};

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return { status: err.status, message: err.message };
}

const photo = (bytes = 200, type = "image/jpeg") => ({
  file: new Blob([new Uint8Array(bytes)], { type }),
  width: 1200,
  height: 900,
});
const phone = (name: string) => `phone${name}1`;
const id = (name: string) => p[name]?.id ?? "";
const teamOf = async (name: string) =>
  (await deps.teams.list(SLUG)).find((t) => t.captainId === id(name));
const hat = {
  id: "s1",
  kind: "santa-hat",
  x: 0.4,
  y: 0.15,
  size: 0.3,
  angle: -10,
  flip: false,
};

beforeEach(async () => {
  files = new MemoryDrawingFiles();
  const players = new MemoryPlayerRepo();
  deps = {
    teams: new MemoryTeamRepo(),
    players,
    events: new MemoryEventRuntimeRepo(),
    summary: new MemoryTeamSummaryRepo(),
    points: { points: new MemoryPointsRepo(), board: new MemoryBoardRepo(), now: () => 1 },
    id: () => `d${String(++ids)}`,
    files,
  };
  for (const name of ["Mai", "Bao", "Lan"])
    p[name] = await players.join(SLUG, phone(name), { nickname: name, key: name.toLowerCase() });
  await makeCaptain(deps, event, id("Mai"));
  await makeCaptain(deps, event, id("Bao"));
});

describe("team selfies (spec 31)", () => {
  it("S31-AC1: naming needs the team selfie; the captain can retake it until then, and only the host after", async () => {
    expect(await failure(nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons"))).toEqual({
      status: 400,
      message: "Take the team selfie first.",
    });
    expect(
      (await failure(captainSelfie(deps, event, phone("Mai"), id("Mai"), photo(10, "image/gif"))))
        .status,
    ).toBe(400);
    expect(
      (await failure(captainSelfie(deps, event, phone("Mai"), id("Mai"), photo(4_000_000)))).status,
    ).toBe(400);
    // Not this phone's player, or not a captain.
    expect(
      (await failure(captainSelfie(deps, event, phone("Bao"), id("Mai"), photo()))).status,
    ).toBe(403);
    expect(
      (await failure(captainSelfie(deps, event, phone("Lan"), id("Lan"), photo()))).status,
    ).toBe(403);
    await captainSelfie(deps, event, phone("Mai"), id("Mai"), photo());
    const first = (await teamOf("Mai"))?.selfie?.url;
    // A retake replaces the file.
    await captainSelfie(deps, event, phone("Mai"), id("Mai"), photo(300));
    expect(files.removed).toEqual([first]);
    await nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons");
    expect(await failure(captainSelfie(deps, event, phone("Mai"), id("Mai"), photo()))).toEqual({
      status: 409,
      message: "Your team selfie is set. The host can change it.",
    });
    const team = await teamOf("Mai");
    await hostSelfie(deps, event, team?.id ?? "", photo(400));
    expect((await teamOf("Mai"))?.selfie).toMatchObject({ width: 1200, height: 900 });
    // With nowhere to keep photos, naming doesn't wait for one.
    await nameTeam({ ...deps, files: null }, event, phone("Bao"), id("Bao"), "Tigers");
  });

  it("S31-AC2: the host's stickers are checked and saved on the selfie", async () => {
    const team = await teamOf("Mai");
    const teamId = team?.id ?? "";
    expect((await failure(saveStickers(deps, event, teamId, [hat]))).status).toBe(409);
    await captainSelfie(deps, event, phone("Mai"), id("Mai"), photo());
    await saveStickers(deps, event, teamId, [hat, { ...hat, id: "s2", kind: "mustache", y: 0.6 }]);
    expect((await selfiesFor(deps, event)).teams[0]).toMatchObject({
      teamId,
      stickers: [hat, { id: "s2", kind: "mustache" }],
    });
    expect(
      (await failure(saveStickers(deps, event, teamId, [{ ...hat, kind: "flamethrower" }]))).status,
    ).toBe(400);
    expect((await failure(saveStickers(deps, event, teamId, [{ ...hat, x: 2 }]))).status).toBe(400);
    expect(
      (
        await failure(
          saveStickers(
            deps,
            event,
            teamId,
            Array.from({ length: 31 }, (_, i) => ({ ...hat, id: `s${String(i)}` })),
          ),
        )
      ).status,
    ).toBe(400);
  });

  it("S31-AC3: once the event ends, the finale is the top team dressed up; a tie shows each", async () => {
    await captainSelfie(deps, event, phone("Mai"), id("Mai"), photo());
    await nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons");
    const dragons = await teamOf("Mai");
    const tigers = await teamOf("Bao");
    if (!dragons || !tigers) throw new Error("teams");
    await saveStickers(deps, event, dragons.id, [hat]);
    const award = (teamId: string, points: number) =>
      awardTeam(
        deps.points,
        SLUG,
        { id: teamId, name: teamId, color: 1 },
        {
          id: `a-${teamId}-${String(points)}`,
          points,
          reason: "x",
          source: { kind: "game", id: "g" },
          createdBy: "server",
        },
      );
    await award(dragons.id, 300);
    await award(tigers.id, 200);
    expect(await finaleFor(deps, event)).toBeNull();
    await deps.events.setStatus(SLUG, "ended");
    expect(await finaleFor(deps, event)).toMatchObject({
      points: 300,
      teams: [{ name: "Dragons", stickers: [hat], selfie: { width: 1200 } }],
    });
    await award(tigers.id, 100);
    expect((await finaleFor(deps, event))?.teams.map((t) => t.teamId)).toEqual([
      dragons.id,
      tigers.id,
    ]);
  });

  it("S31-AC4: phones' view of teams never carries a selfie or stickers", async () => {
    await captainSelfie(deps, event, phone("Mai"), id("Mai"), photo());
    const team = await teamOf("Mai");
    await saveStickers(deps, event, team?.id ?? "", [hat]);
    await publishTeams(deps, event);
    const phoneView = JSON.stringify(await teamsView(deps, event, id("Mai")));
    expect(phoneView).not.toContain("memory");
    expect(phoneView).not.toContain("selfie");
    expect(phoneView).not.toContain("santa-hat");
  });
});
