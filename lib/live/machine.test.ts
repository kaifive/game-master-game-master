import { describe, expect, it } from "vitest";
import { leadCounts, leadOrder } from "./fairness";
import {
  move,
  next,
  nextLabel,
  pick,
  startSession,
  tick,
  type Machine,
  type Outcome,
} from "./machine";
import { START_LEAD_MS, type Session } from "./model";
import { playtest, playtestTeams } from "./playtest";
import { afterTurn, available, nextUp, type Rotation } from "./rotation";
import { passShowdown, tapShowdown } from "./testing";
import { liveView } from "./view";

const tap: Machine = { game: tapShowdown, content: { rounds: 2 } };
const pass: Machine = { game: passShowdown, content: {} };
const teams = playtestTeams(3);
const NOW = 1_000_000;

const start = (m: Machine) =>
  startSession(m, { id: "s", gameId: "g", type: "tap", title: "Tap", teams, seed: 7, now: NOW });

function ok(out: Outcome): { session: Session; rotation: Rotation; out: Outcome } {
  if (!out.ok) throw new Error(out.message);
  if (!out.session) throw new Error("ended");
  return { session: out.session, rotation: out.rotation, out };
}

describe("live session machine (spec 11, spec 24)", () => {
  it("S11-AC2 S24-AC1: steps intro → pick → play → results per round, then final and end, only on Next", () => {
    let { session, rotation } = { session: start(tap), rotation: {} as Rotation };
    const steps: string[] = [session.step];
    for (let i = 0; i < 10; i++) {
      const out = next(tap, session, rotation, NOW + i);
      if (!out.ok) throw new Error(out.message);
      if (!out.session) {
        steps.push("ended");
        break;
      }
      ({ session, rotation } = { session: out.session, rotation: out.rotation });
      steps.push(`${session.step}${String(session.round)}`);
    }
    expect(steps).toEqual(
      [
        "intro",
        "pick1",
        "play1",
        "results1",
        "pick2",
        "play2",
        "results2",
        "final2",
        "ended",
      ].slice(0, steps.length),
    );
    expect(steps.at(-1)).toBe("ended");
  });

  it("S11-AC2: every change bumps the revision; a refused move says why and changes nothing", () => {
    const s0 = start(tap);
    const s1 = ok(next(tap, s0, {}, NOW)).session;
    expect(s1.revision).toBe(s0.revision + 1);
    const refused = move(tap, s1, {}, "t1", "tap", NOW);
    expect(refused).toEqual({ ok: false, message: "There's nothing to play right now." });
    const play = ok(next(tap, s1, {}, NOW)).session;
    expect(move(tap, play, {}, "t1", "tap", NOW)).toEqual({ ok: false, message: "Not yet!" });
    expect(move(tap, play, {}, "nope", "tap", NOW + START_LEAD_MS)).toMatchObject({ ok: false });
    // Time passing with nothing to do keeps the same session object.
    const same = tick(tap, play, {}, NOW + START_LEAD_MS);
    expect(same.ok && same.session).toBe(play);
    expect(nextLabel(tap, play)).toBe("Show results");
  });

  it("S24-AC2: who's up rotates: picked or next in line, nobody again until everyone has gone", () => {
    const team = teams[0];
    if (!team) throw new Error("no team");
    const ids = team.members.map((m) => m.id);
    expect(available(team, [])).toEqual(ids);
    let used: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const who = nextUp(team, used);
      if (!who) throw new Error("nobody");
      seen.push(who);
      used = afterTurn(team, used, who);
    }
    // Everyone once, then round again.
    expect(seen).toEqual([...ids, ...ids]);
    // A captain's pick of someone who's been is refused; of someone free, kept.
    let s = ok(next(tap, start(tap), {}, NOW)).session;
    const rotation: Rotation = { t1: [ids[0] ?? ""] };
    expect(pick(tap, s, rotation, "t1", ids[0] ?? "", NOW)).toEqual({
      ok: false,
      message: "They've already had a turn.",
    });
    s = ok(pick(tap, s, rotation, "t1", ids[2] ?? "", NOW)).session;
    const played = ok(next(tap, s, rotation, NOW));
    expect(played.session.up.t1).toBe(ids[2]);
    // A team that didn't pick gets the next in line, and the rotation remembers both.
    expect(played.session.up.t2).toBe(teams[1]?.members[0]?.id);
    expect(played.rotation.t1).toEqual([ids[0], ids[2]]);
    // Picks close once the round starts.
    expect(pick(tap, played.session, played.rotation, "t1", ids[1] ?? "", NOW)).toMatchObject({
      ok: false,
    });
  });

  it("S24-AC2: in a turn game, each turn gets the next teammate in line, and the captain can swap before moving", () => {
    let { session, rotation } = ok(next(pass, start(pass), {}, NOW));
    const lead = session.up;
    expect(Object.values(lead).filter(Boolean)).toHaveLength(1);
    const first = Object.entries(lead).find(([, who]) => who)?.[0] ?? "";
    const team = teams.find((t) => t.id === first);
    const swap = team?.members[1]?.id ?? "";
    ({ session, rotation } = ok(pick(pass, session, rotation, first, swap, NOW)));
    expect(session.up[first]).toBe(swap);
    // The swapped-out teammate gets their turn back.
    expect(rotation[first]).toEqual([swap]);
    expect(pick(pass, session, rotation, "t3" === first ? "t1" : "t3", "x", NOW)).toEqual({
      ok: false,
      message: "It isn't your turn.",
    });
    ({ session, rotation } = ok(move(pass, session, rotation, first, "pass", NOW + 10)));
    const nextTeam = Object.entries(session.up).find(([, who]) => who)?.[0];
    expect(nextTeam).not.toBe(first);
  });

  it("S11-AC7 S24-AC5: closing a round reports the points to pay, by team, once", () => {
    let { session } = ok(next(tap, ok(next(tap, start(tap), {}, NOW)).session, {}, NOW));
    session = ok(move(tap, session, {}, "t2", "tap", NOW + START_LEAD_MS + 100)).session;
    session = ok(move(tap, session, {}, "t1", "tap", NOW + START_LEAD_MS + 300)).session;
    const closed = next(tap, session, {}, NOW + 9000);
    expect(closed.ok && closed.award).toEqual({ round: 1, points: { t1: 10, t2: 20, t3: 0 } });
    if (!closed.ok || !closed.session) throw new Error("not closed");
    expect(closed.session.scores).toEqual({ t1: 10, t2: 20, t3: 0 });
    // Going on from results pays nothing more.
    const on = next(tap, closed.session, {}, NOW + 9100);
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
    const play = ok(next(tap, ok(next(tap, start(tap), {}, NOW)).session, {}, NOW)).session;
    const tapped = ok(move(tap, play, {}, "t1", "tap", NOW + START_LEAD_MS + 50)).session;
    const forT2 = liveView(tap, tapped, {}, { kind: "captain", teamId: "t2" }, NOW);
    const forTv = liveView(tap, tapped, {}, { kind: "tv" }, NOW);
    expect(JSON.stringify(forT2)).not.toContain('"t1":50');
    expect(JSON.stringify(forTv)).not.toContain('"t1":50');
    const shown = ok(next(tap, tapped, {}, NOW + 9000)).session;
    expect(JSON.stringify(liveView(tap, shown, {}, { kind: "tv" }, NOW))).toContain('"t1":50');
  });
});

describe("mock play tests (S24-AC8)", () => {
  const tapBot = (delay: number) => (ctx: { view: { game: unknown }; now: number }) => {
    const g = ctx.view.game as { startsAt: number; tapped: boolean } | null;
    return g && !g.tapped && ctx.now >= g.startsAt + delay ? "tap" : null;
  };

  it("S24-AC8: whole games end, score within limits, pay once, leak nothing, with 2 to 8 teams and silent or dropped teams", () => {
    for (const n of [2, 3, 5, 8]) {
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
      for (const round of result.rounds)
        for (const p of Object.values(round)) expect([0, 10, 20]).toContain(p);
      // The silent team never scores; the team that dropped out stops scoring.
      expect(result.scores.t2).toBe(0);
      if (n > 2) expect(result.rounds[2]?.t3).toBe(0);
      // Who played rotates through each team.
      expect(new Set(result.players.map((p) => p.t1)).size).toBe(3);
    }
  });

  it("S24-AC8 S24-AC6: a turn game run by bots leads each team once over a whole game", () => {
    const result = playtest(
      passShowdown,
      {},
      {
        teams: 4,
        seed: 3,
        bots: (i) => (i === 3 ? null : () => "pass"),
      },
    );
    expect(result.ended).toBe(true);
    expect(result.turnOrders).toHaveLength(4);
    expect(leadCounts(result.turnOrders)).toEqual({ t1: 1, t2: 1, t3: 1, t4: 1 });
    // The silent team times out each turn and the game still finishes.
    expect(result.scores.t4).toBe(0);
  });
});
