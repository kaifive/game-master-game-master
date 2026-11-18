import { describe, expect, it } from "vitest";
import { leadCounts, leadOrder } from "./fairness";
import {
  minTeams,
  move,
  next,
  nextLabel,
  startSession,
  tick,
  type Machine,
  type Outcome,
} from "./machine";
import { defineShowdown, START_LEAD_MS, type Session } from "./model";
import {
  addPerson,
  checkName,
  markPlayed,
  removePerson,
  resetTeam,
  roster,
  type Played,
} from "./played";
import { PLAYTEST_TEAM_COUNTS, playtest, playtestTeams } from "./playtest";
import { passShowdown, tapShowdown } from "./testing";
import { liveView } from "./view";

const tap: Machine = { game: tapShowdown, content: { rounds: 2 } };
const teams = playtestTeams(3);
const NOW = 1_000_000;

const start = (m: Machine) =>
  startSession(m, { id: "s", gameId: "g", type: "tap", title: "Tap", teams, seed: 7, now: NOW });

function ok(out: Outcome): Session {
  if (!out.ok) throw new Error(out.message);
  if (!out.session) throw new Error("ended");
  return out.session;
}

describe("live session machine (spec 11, spec 24)", () => {
  it("S11-AC2 S24-AC1: steps intro → play → results per round, then final and end, only on Next", () => {
    let session = start(tap);
    const steps: string[] = [session.step];
    for (let i = 0; i < 10; i++) {
      const out = next(tap, session, NOW + i);
      if (!out.ok) throw new Error(out.message);
      if (!out.session) {
        steps.push("ended");
        break;
      }
      session = out.session;
      steps.push(`${session.step}${String(session.round)}`);
    }
    expect(steps).toEqual(["intro", "play1", "results1", "play2", "results2", "final2", "ended"]);
  });

  it("S11-AC2: every change bumps the revision; a refused move says why and changes nothing", () => {
    const s0 = start(tap);
    expect(move(tap, s0, "t1", "tap", NOW)).toEqual({
      ok: false,
      message: "There's nothing to play right now.",
    });
    expect(nextLabel(tap, s0)).toBe("Start round 1");
    const play = ok(next(tap, s0, NOW));
    expect(play.revision).toBe(s0.revision + 1);
    expect(move(tap, play, "t1", "tap", NOW)).toEqual({ ok: false, message: "Not yet!" });
    expect(move(tap, play, "nope", "tap", NOW + START_LEAD_MS)).toMatchObject({ ok: false });
    // Time passing with nothing to do keeps the same session object.
    const same = tick(tap, play, NOW + START_LEAD_MS);
    expect(same.ok && same.session).toBe(play);
    expect(nextLabel(tap, play)).toBe("Show results");
    const results = ok(next(tap, play, NOW + 9000));
    expect(nextLabel(tap, results)).toBe("Start round 2");
  });

  it("S11-AC7 S24-AC5: closing a round reports the points to pay, by team, once", () => {
    let session = ok(next(tap, start(tap), NOW));
    session = ok(move(tap, session, "t2", "tap", NOW + START_LEAD_MS + 100));
    session = ok(move(tap, session, "t1", "tap", NOW + START_LEAD_MS + 300));
    const closed = next(tap, session, NOW + 9000);
    expect(closed.ok && closed.award).toEqual({ round: 1, points: { t1: 10, t2: 20, t3: 0 } });
    const shown = ok(closed);
    expect(shown.scores).toEqual({ t1: 10, t2: 20, t3: 0 });
    // Going on from results pays nothing more.
    const on = next(tap, shown, NOW + 9100);
    expect(on.ok && on.award).toBeNull();
  });

  it("S24-AC6: leads rotate so every team leads equally often over whole cycles", () => {
    expect(leadOrder(["a", "b", "c"], 0)).toEqual(["a", "b", "c"]);
    expect(leadOrder(["a", "b", "c"], 1)).toEqual(["b", "c", "a"]);
    expect(leadOrder(["a", "b", "c"], 5)).toEqual(["c", "a", "b"]);
    expect(leadOrder([], 3)).toEqual([]);
    const orders = [0, 1, 2, 3, 4, 5].map((c) => leadOrder(["a", "b", "c"], c));
    expect(leadCounts(orders)).toEqual({ a: 2, b: 2, c: 2 });
  });

  it("S24-AC7: secret answers stay out of views until the reveal; the reveal shows them", () => {
    const play = ok(next(tap, start(tap), NOW));
    const tapped = ok(move(tap, play, "t1", "tap", NOW + START_LEAD_MS + 50));
    const forT2 = liveView(tap, tapped, { kind: "captain", teamId: "t2" }, NOW);
    const forTv = liveView(tap, tapped, { kind: "tv" }, NOW);
    expect(JSON.stringify(forT2)).not.toContain('"t1":50');
    expect(JSON.stringify(forTv)).not.toContain('"t1":50');
    const shown = ok(next(tap, tapped, NOW + 9000));
    expect(JSON.stringify(liveView(tap, shown, { kind: "tv" }, NOW))).toContain('"t1":50');
  });

  it("S24-AC11: a game says how many teams it needs; one team is enough unless it says more", () => {
    expect(minTeams(tap)).toBe(1);
    const pairs = { game: defineShowdown({ ...tapShowdown, minTeams: 2 }), content: {} };
    expect(minTeams(pairs)).toBe(2);
  });
});

describe("Who's played (spec 24)", () => {
  const team = {
    id: "t1",
    name: "Snow",
    color: 3,
    members: [
      { id: "c1", nickname: "Cap" },
      { id: "m1", nickname: "Mo" },
    ],
  };

  it("S24-AC2: lists joined players and added names, marks and unmarks who played, and starts a team over", () => {
    let p: Played = {};
    expect(roster(team, p)).toMatchObject({ done: 0, total: 2, everyone: false });
    p = addPerson(p, "t1", "x1", "Grandma");
    p = markPlayed(p, "t1", "m1", true);
    p = markPlayed(p, "t1", "x1", true);
    const list = roster(team, p);
    expect(list.people).toEqual([
      { id: "c1", name: "Cap", added: false, played: false },
      { id: "m1", name: "Mo", added: false, played: true },
      { id: "x1", name: "Grandma", added: true, played: true },
    ]);
    expect(list).toMatchObject({ done: 2, total: 3, everyone: false });
    p = markPlayed(p, "t1", "m1", false);
    expect(roster(team, p).done).toBe(1);
    p = markPlayed(markPlayed(p, "t1", "m1", true), "t1", "c1", true);
    expect(roster(team, p).everyone).toBe(true);
    p = resetTeam(p, "t1");
    expect(roster(team, p)).toMatchObject({ done: 0, total: 3 });
    p = removePerson(p, "t1", "x1");
    expect(roster(team, p).total).toBe(2);
    expect(checkName("  Auntie   May ")).toEqual({ ok: true, name: "Auntie May" });
    expect(checkName("   ")).toMatchObject({ ok: false });
    expect(checkName("x".repeat(29))).toMatchObject({ ok: false });
  });
});

describe("mock play tests (S24-AC8)", () => {
  const tapBot = (delay: number) => (ctx: { view: { game: unknown }; now: number }) => {
    const g = ctx.view.game as { startsAt: number; tapped: boolean } | null;
    return g && !g.tapped && ctx.now >= g.startsAt + delay ? "tap" : null;
  };

  it("S24-AC8 S24-AC11: whole games end, score within limits, leak nothing, with 1 to 6 teams and silent or dropped teams", () => {
    for (const n of PLAYTEST_TEAM_COUNTS) {
      const result = playtest(
        tapShowdown,
        { rounds: 3 },
        {
          teams: n,
          seed: n,
          bots: (i) => (i === 1 ? null : tapBot(100 * i)),
          dropOutFrom: { 2: 2 },
          leakCheck: (view, state) => {
            const taps = (state as { taps: Record<string, number> }).taps;
            return Object.keys(taps).length > 0 && JSON.stringify(view).includes('"taps":{')
              ? "taps visible before the reveal"
              : null;
          },
        },
      );
      expect(result.ended).toBe(true);
      expect(result.rounds).toHaveLength(3);
      expect(result.leaks).toEqual([]);
      for (const round of result.rounds) {
        expect(Object.keys(round)).toHaveLength(n);
        for (const p of Object.values(round)) expect([0, 10, 20]).toContain(p);
      }
      // A lone team still scores; the silent team never does; a dropped team stops.
      if (n === 1) expect(result.scores.t1).toBe(60);
      if (n > 1) expect(result.scores.t2).toBe(0);
      if (n > 2) expect(result.rounds[2]?.t3).toBe(0);
    }
  });

  it("S24-AC8 S24-AC6: a turn game run by bots leads each team once over a whole game", () => {
    for (const n of [4, 6]) {
      const result = playtest(
        passShowdown,
        {},
        { teams: n, seed: 3, bots: (i) => (i === 3 ? null : () => "pass") },
      );
      expect(result.ended).toBe(true);
      expect(result.turnOrders).toHaveLength(n);
      expect(Object.values(leadCounts(result.turnOrders))).toEqual(Array(n).fill(1));
      // The silent team times out each turn and the game still finishes.
      expect(result.scores.t4).toBe(0);
    }
  });
});
