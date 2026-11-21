import { beforeEach, describe, expect, it } from "vitest";
import { holiday2026 } from "@/content/events/holiday-2026";
import { isAppError } from "@/lib/errors";
import { MemoryEventRuntimeRepo, type EventConfig } from "@/lib/events";
import { MemoryPlayerRepo, type PlayerSummary } from "@/lib/players";
import { awardPoints, MemoryBoardRepo, MemoryPointsRepo } from "@/lib/points";
import { MemoryTeamRepo, MemoryTeamSummaryRepo } from "./repo.memory";
import {
  changeCaptain,
  currentTeams,
  donateToTeam,
  dropFromTeam,
  isCaptain,
  joinTeam,
  makeCaptain,
  moveToTeam,
  nameTeam,
  setPhase,
  setTeamSize,
  teamOf,
  teamsView,
  type TeamDeps,
} from "./service";

const event: EventConfig = { ...holiday2026, scoring: "both", blockedNames: ["grinch"] };
const SLUG = event.slug;
let deps: TeamDeps;
let clock = 1;
let ids = 0;
const p: Record<string, PlayerSummary> = {};

async function failure(promise: Promise<unknown>) {
  const err: unknown = await promise.catch((e: unknown) => e);
  if (!isAppError(err)) throw new Error("expected an AppError");
  return { status: err.status, message: err.message };
}

beforeEach(async () => {
  const players = new MemoryPlayerRepo();
  deps = {
    teams: new MemoryTeamRepo(),
    players,
    events: new MemoryEventRuntimeRepo(),
    summary: new MemoryTeamSummaryRepo(),
    points: { points: new MemoryPointsRepo(), board: new MemoryBoardRepo(), now: () => clock++ },
    id: () => `d${String(++ids)}`,
  };
  clock = 1;
  ids = 0;
  for (const name of ["Mai", "Bao", "Lan", "Kim", "Duc"])
    p[name] = await players.join(SLUG, `phone${name}1`, {
      nickname: name,
      key: name.toLowerCase(),
    });
});

const phone = (name: string) => `phone${name}1`;
const id = (name: string) => p[name]?.id ?? "";

describe("teams", () => {
  it("S03-AC1: a both event starts individual; the host switches to the team phase and back", async () => {
    expect((await teamsView(deps, event, null)).phase).toBe("individual");
    await setPhase(deps, event, "team");
    expect((await teamsView(deps, event, null)).phase).toBe("team");
    await setPhase(deps, event, "individual");
    expect((await teamsView(deps, event, null)).phase).toBe("individual");
    expect(
      (await failure(setPhase(deps, { ...event, scoring: "team" }, "individual"))).status,
    ).toBe(400);
  });

  it("S03-AC10: an event has at most six teams; a seventh captain is refused", async () => {
    for (let i = 0; i < 6; i++) {
      const extra = await deps.players.join(SLUG, `phoneX${String(i)}`, {
        nickname: `Extra${String(i)}`,
        key: `extra${String(i)}`,
      });
      await makeCaptain(deps, event, extra.id);
    }
    expect(await failure(makeCaptain(deps, event, id("Mai")))).toEqual({
      status: 409,
      message: "There can be at most 6 teams.",
    });
    expect((await teamsView(deps, event, null)).teams).toHaveLength(6);
  });

  it("S03-AC2: a captain gets a team in the next color and names it", async () => {
    await makeCaptain(deps, event, id("Mai"));
    await makeCaptain(deps, event, id("Bao"));
    let view = await teamsView(deps, event, id("Mai"));
    expect(view.teams.map((t) => [t.name, t.color, t.named])).toEqual([
      ["Team Mai", 1, false],
      ["Team Bao", 2, false],
    ]);
    expect(view.mine).toMatchObject({ isCaptain: true, named: false });
    await nameTeam(deps, event, phone("Mai"), id("Mai"), "  Snow   Dragons ");
    view = await teamsView(deps, event, null);
    expect(view.teams[0]).toMatchObject({
      name: "Snow Dragons",
      named: true,
      captain: { nickname: "Mai" },
    });
    expect(
      await failure(nameTeam(deps, event, phone("Bao"), id("Bao"), "snow dragons")),
    ).toMatchObject({ status: 409 });
    expect(await failure(nameTeam(deps, event, phone("Bao"), id("Bao"), "The Gr1nch"))).toEqual({
      status: 400,
      message: "Pick another name.",
    });
    expect(
      (await failure(nameTeam(deps, event, phone("Bao"), id("Bao"), "x".repeat(21)))).message,
    ).toBe("Use 20 characters or fewer.");
    expect((await failure(nameTeam(deps, event, phone("Lan"), id("Lan"), "Lanterns"))).status).toBe(
      403,
    );
    expect(
      (await failure(makeCaptain(deps, { ...event, scoring: "individual" }, id("Lan")))).status,
    ).toBe(400);
  });

  it("S29-AC1 S29-AC3 S29-AC4: the captain picks a free color when naming the team, and it's fixed after", async () => {
    await makeCaptain(deps, event, id("Mai"));
    await makeCaptain(deps, event, id("Bao"));
    await nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons", 6);
    expect(await failure(nameTeam(deps, event, phone("Bao"), id("Bao"), "Tigers", 6))).toEqual({
      status: 409,
      message: "Another team just took that color. Pick another.",
    });
    expect(
      (await failure(nameTeam(deps, event, phone("Bao"), id("Bao"), "Tigers", 9))).status,
    ).toBe(400);
    await nameTeam(deps, event, phone("Bao"), id("Bao"), "Tigers", 2);
    expect((await teamsView(deps, event, null)).teams.map((t) => [t.name, t.color])).toEqual([
      ["Dragons", 6],
      ["Tigers", 2],
    ]);
    // The board the TV and showdowns read has each team in its color, beside its name (S29-AC4).
    expect((await deps.points.board.read(event.slug)).teams.map((t) => [t.name, t.color])).toEqual(
      expect.arrayContaining([
        ["Dragons", 6],
        ["Tigers", 2],
      ]),
    );
    // Fixed once named.
    expect(await failure(nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons", 7))).toEqual({
      status: 409,
      message: "Your team's color is set for the party.",
    });
    // A new team gets the first color nobody holds: 1, since Dragons moved to 6.
    await makeCaptain(deps, event, id("Lan"));
    expect((await teamsView(deps, event, null)).teams.map((t) => t.color)).toEqual([6, 2, 1]);
  });

  it("S29-AC2: two captains picking the same color at once: one gets it, the other is told", async () => {
    await makeCaptain(deps, event, id("Mai"));
    await makeCaptain(deps, event, id("Bao"));
    const race = await Promise.allSettled([
      nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons", 7),
      nameTeam(deps, event, phone("Bao"), id("Bao"), "Tigers", 7),
    ]);
    expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const colors = (await teamsView(deps, event, null)).teams.map((t) => t.color);
    expect(colors.filter((c) => c === 7)).toHaveLength(1);
  });

  it("S03-AC3: in the team phase players join a team with room, once", async () => {
    await makeCaptain(deps, event, id("Mai"));
    await makeCaptain(deps, event, id("Bao"));
    const [a, b] = (await teamsView(deps, event, null)).teams;
    expect(
      await failure(joinTeam(deps, event, phone("Lan"), id("Lan"), a?.id ?? "")),
    ).toMatchObject({ status: 403 });
    await setPhase(deps, event, "team");
    await setTeamSize(deps, event, 2);
    await joinTeam(deps, event, phone("Lan"), id("Lan"), a?.id ?? "");
    expect(
      (await failure(joinTeam(deps, event, phone("Kim"), id("Kim"), a?.id ?? ""))).status,
    ).toBe(409);
    expect(
      (await failure(joinTeam(deps, event, phone("Lan"), id("Lan"), b?.id ?? ""))).status,
    ).toBe(409);
    expect(
      (await failure(joinTeam(deps, event, phone("Kim"), id("Lan"), b?.id ?? ""))).status,
    ).toBe(403);
    const view = await teamsView(deps, event, id("Lan"));
    expect(view.teams[0]).toMatchObject({
      room: 0,
      members: [{ nickname: "Mai" }, { nickname: "Lan" }],
    });
    expect(view.mine).toMatchObject({ teamId: a?.id, isCaptain: false });
  });

  it("S03-AC4: the suggested team size is players ÷ teams; the host can set it, move players and change captains", async () => {
    await makeCaptain(deps, event, id("Mai"));
    await makeCaptain(deps, event, id("Bao"));
    expect((await teamsView(deps, event, null)).maxTeamSize).toBe(3); // 5 players ÷ 2 teams
    expect((await failure(setTeamSize(deps, event, 0))).status).toBe(400);
    const [a, b] = (await teamsView(deps, event, null)).teams;
    await moveToTeam(deps, event, id("Lan"), b?.id ?? "");
    await changeCaptain(deps, event, b?.id ?? "", id("Lan"));
    const view = await teamsView(deps, event, null);
    expect(view.teams[1]).toMatchObject({ captain: { nickname: "Lan" } });
    expect(view.teams[1]?.name).toBe("Team Lan");
    expect(await isCaptain(deps, SLUG, id("Lan"))).toBe(true);
    expect(await isCaptain(deps, SLUG, id("Bao"))).toBe(false);
    expect(a?.id).toBeTruthy();
  });

  it("S03-AC3 S03-AC8: phones read a published summary, kept fresh by every change", async () => {
    expect(await deps.summary.read(SLUG)).toBeNull();
    expect((await teamsView(deps, event, null)).teams).toEqual([]);
    await makeCaptain(deps, event, id("Mai"));
    expect(await teamsView(deps, event, id("Mai"))).toEqual({
      ...(await currentTeams(deps, event)),
      mine: { teamId: expect.any(String) as string, isCaptain: true, named: false },
    });
    // The leaderboard learns the team's name and color.
    await nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons");
    expect((await deps.points.board.read(SLUG)).teams).toMatchObject([
      { name: "Dragons", color: 1, points: 0 },
    ]);
    await setPhase(deps, event, "team");
    expect((await teamsView(deps, event, null)).phase).toBe("team");
    await dropFromTeam(deps, event, id("Mai"));
    expect((await teamsView(deps, event, null)).teams[0]).toMatchObject({
      captain: null,
      members: [],
    });
  });

  it("S03-AC5: teamOf gives the player's team and whether they captain it", async () => {
    await makeCaptain(deps, event, id("Mai"));
    await setPhase(deps, event, "team");
    const [team] = (await teamsView(deps, event, null)).teams;
    await joinTeam(deps, event, phone("Bao"), id("Bao"), team?.id ?? "");
    expect(await teamOf(deps, event, id("Mai"))).toMatchObject({ phase: "team", isCaptain: true });
    expect(await teamOf(deps, event, id("Bao"))).toMatchObject({
      isCaptain: false,
      team: { id: team?.id },
    });
    expect(await teamOf(deps, event, id("Lan"))).toEqual({
      phase: "team",
      team: null,
      isCaptain: false,
    });
  });

  it("S03-AC6: any player donates their own points to any team, not after the end", async () => {
    await makeCaptain(deps, event, id("Mai"));
    await nameTeam(deps, event, phone("Mai"), id("Mai"), "Dragons");
    const [team] = (await teamsView(deps, event, null)).teams;
    const teamId = team?.id ?? "";
    await awardPoints(deps.points, SLUG, p.Lan ?? { id: "", nickname: "" }, {
      id: "m1",
      points: 40,
      reason: "Bonus",
      source: { kind: "manual", id: "admin" },
      createdBy: "admin",
    });
    expect(await donateToTeam(deps, event, phone("Lan"), id("Lan"), teamId, 25)).toEqual({
      player: 15,
      team: 25,
    });
    expect(
      (await failure(donateToTeam(deps, event, phone("Kim"), id("Lan"), teamId, 5))).status,
    ).toBe(403);
    expect(
      (await failure(donateToTeam(deps, event, phone("Lan"), id("Lan"), "nope", 5))).status,
    ).toBe(404);
    expect(
      (await failure(donateToTeam(deps, event, phone("Lan"), id("Lan"), teamId, 16))).message,
    ).toBe("You have 15 points to give.");
    expect(
      (
        await failure(
          donateToTeam(
            deps,
            { ...event, scoring: "individual" },
            phone("Lan"),
            id("Lan"),
            teamId,
            1,
          ),
        )
      ).status,
    ).toBe(400);
    await deps.events.setStatus(SLUG, "ended");
    expect(
      (await failure(donateToTeam(deps, event, phone("Lan"), id("Lan"), teamId, 1))).message,
    ).toBe("The party has ended.");
  });
});
