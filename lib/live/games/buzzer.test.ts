import { describe, expect, it } from "vitest";
import { controlsView } from "../view";
import {
  hostAct,
  move,
  next,
  nextLabel,
  startSession,
  type Machine,
  type Outcome,
} from "../machine";
import { liveView } from "../view";
import type { Session } from "../model";
import { PLAYTEST_TEAM_COUNTS, playtestTeams } from "../playtest";
import { buzzer, type BuzzerHostView, type BuzzerState, type BuzzerView } from "./buzzer";

const T0 = 1_000_000;
const content = {
  questions: [
    { id: "q1", prompt: "What's the staff called in Chinese?", answer: "Gun", points: 200 },
    { id: "q2", prompt: "How many sections in a three-section staff?", answer: "Three" },
  ],
};
const m: Machine = { game: buzzer, content: buzzer.content.parse(content) };

function ok(out: Outcome): Session {
  if (!out.ok) throw new Error(out.message);
  if (!out.session) throw new Error("ended");
  return out.session;
}

/** A round on question 1 with three teams. */
function begin(n = 3) {
  const s0 = startSession(m, {
    id: "s",
    gameId: "quiz",
    type: "buzzer",
    title: "Quiz",
    teams: playtestTeams(n),
    seed: 1,
    now: T0,
  });
  return ok(next(m, s0, T0));
}
const host = (s: Session, action: string, now: number) => ok(hostAct(m, s, action, now));
const buzz = (s: Session, team: string, at: number, now = at + 80) => move(m, s, team, { at }, now);
const state = (s: Session) => s.state as BuzzerState;
const tvView = (s: Session, now: number) =>
  liveView(m, s, { kind: "tv" }, now) as { game: BuzzerView };
const cap = (s: Session, teamId: string, now: number) =>
  liveView(m, s, { kind: "captain", teamId }, now) as { game: BuzzerView };

describe("buzzer round (spec 12)", () => {
  it("S12-AC1: the host shows each question, opens the buzzers, judges and moves on; Controls says what Next does", () => {
    const s0 = startSession(m, {
      id: "s",
      gameId: "quiz",
      type: "buzzer",
      title: "Quiz",
      teams: playtestTeams(2),
      seed: 1,
      now: T0,
    });
    expect(nextLabel(m, s0)).toBe("Show question 1");
    let s = ok(next(m, s0, T0));
    expect(state(s)).toMatchObject({ index: 1, of: 2, phase: "shown", points: 200 });
    expect(nextLabel(m, s)).toBe("Next question");
    s = host(s, "open", T0 + 3000);
    expect(state(s)).toMatchObject({ phase: "open", openedAt: T0 + 3000 });
    // Next pays and goes straight to question 2, with no results step.
    s = ok(next(m, s, T0 + 9000));
    expect(s.step).toBe("play");
    expect(state(s)).toMatchObject({ index: 2, points: 100, phase: "shown" });
    expect(nextLabel(m, s)).toBe("Final standings");
    s = ok(next(m, s, T0 + 12_000));
    expect(s.step).toBe("final");
  });

  it("S12-AC2: buzzes are ordered by the press on the shared clock, not by arrival; each team buzzes once", () => {
    let s = host(begin(), "open", T0 + 1000);
    // t2 pressed first but its buzz arrives last.
    s = ok(buzz(s, "t1", T0 + 1400, T0 + 1450));
    s = ok(buzz(s, "t3", T0 + 1500, T0 + 1550));
    s = ok(buzz(s, "t2", T0 + 1300, T0 + 1900));
    expect(state(s).buzzes.map((b) => [b.teamId, b.after])).toEqual([
      ["t2", 300],
      ["t1", 400],
      ["t3", 500],
    ]);
    expect(buzz(s, "t1", T0 + 2000)).toMatchObject({ ok: false, message: "You've buzzed." });
    // A press claimed far from the server's clock is refused.
    expect(buzz(s, "t3", T0 + 9000, T0 + 2000)).toMatchObject({ ok: false });
    // Everyone sees the order; a captain sees their own place.
    expect(tvView(s, T0 + 2000).game.buzzes.map((b) => b.teamId)).toEqual(["t2", "t1", "t3"]);
    expect(cap(s, "t1", T0 + 2000).game.mine).toMatchObject({ place: 2 });
  });

  it("S12-AC3: Right gives the points and reveals; Wrong costs nothing and passes on; then reopen or reveal", () => {
    let s = host(begin(4), "open", T0 + 1000);
    s = ok(buzz(s, "t1", T0 + 1200));
    s = ok(buzz(s, "t2", T0 + 1300));
    expect(state(s).buzzes[0]?.teamId).toBe("t1");
    s = host(s, "wrong", T0 + 2000);
    expect(tvView(s, T0 + 2000).game).toMatchObject({ upNext: "t2", answer: null });
    s = host(s, "wrong", T0 + 3000);
    // Everyone who buzzed was wrong: reopen for t3 and t4.
    expect(hostAct(m, s, "right", T0 + 3100)).toMatchObject({ ok: false });
    s = host(s, "reopen", T0 + 4000);
    expect(buzz(s, "t1", T0 + 4100)).toMatchObject({ ok: false });
    s = ok(buzz(s, "t4", T0 + 4300));
    expect(state(s).buzzes.at(-1)).toMatchObject({ teamId: "t4", after: 300 });
    s = host(s, "right", T0 + 5000);
    expect(tvView(s, T0 + 5000).game).toMatchObject({ winner: "t4", answer: "Gun" });
    const paid = next(m, s, T0 + 6000);
    expect(paid.ok && paid.award).toEqual({ round: 1, points: { t1: 0, t2: 0, t3: 0, t4: 200 } });
    // Nobody gets it: reveal and move on with no points.
    let q2 = host(ok(paid), "open", T0 + 7000);
    q2 = host(q2, "reveal", T0 + 9000);
    expect(tvView(q2, T0 + 9000).game).toMatchObject({ answer: "Three", winner: null });
    const none = next(m, q2, T0 + 9500);
    expect(none.ok && none.award?.points).toEqual({ t1: 0, t2: 0, t3: 0, t4: 0 });
  });

  it("S12-AC4: Controls always has the answer; the TV and phones get it only once it's revealed", () => {
    let s = host(begin(), "open", T0 + 1000);
    s = ok(buzz(s, "t1", T0 + 1200));
    const controls = controlsView(m, s, T0 + 1300, "showdown");
    expect((controls.host as BuzzerHostView).answer).toBe("Gun");
    expect(JSON.stringify(tvView(s, T0 + 1300))).not.toContain("Gun");
    expect(JSON.stringify(cap(s, "t1", T0 + 1300))).not.toContain("Gun");
    expect(
      JSON.stringify(liveView(m, s, { kind: "member", teamId: "t2" }, T0 + 1300)),
    ).not.toContain("Gun");
  });

  it("S12-AC5: Undo takes back the last Right or Wrong, so its points aren't paid", () => {
    let s = host(begin(), "open", T0 + 1000);
    s = ok(buzz(s, "t1", T0 + 1200));
    s = ok(buzz(s, "t2", T0 + 1300));
    s = host(s, "right", T0 + 2000);
    s = host(s, "undo", T0 + 2100);
    expect(state(s)).toMatchObject({ winner: null, revealed: false, phase: "open" });
    s = host(s, "wrong", T0 + 2200);
    s = host(s, "right", T0 + 2300);
    const paid = next(m, s, T0 + 3000);
    expect(paid.ok && paid.award?.points).toMatchObject({ t1: 0, t2: 200 });
    // Undo also takes back opening the buzzers by mistake.
    let q2 = host(ok(paid), "open", T0 + 4000);
    q2 = host(q2, "undo", T0 + 4100);
    expect(state(q2).phase).toBe("shown");
    expect(hostAct(m, q2, "undo", T0 + 4200)).toMatchObject({ ok: false });
  });

  it("S12-AC6: buzzing, the order and judging work on any question's state, apart from the question list", () => {
    // Jeopardy will hand a picked clue to the same pieces.
    let s = host(begin(), "open", T0 + 1000);
    s = ok(buzz(s, "t3", T0 + 1100));
    expect(state(s).buzzes[0]?.teamId).toBe("t3");
    expect(Object.keys(buzzer)).toEqual(
      expect.arrayContaining(["host", "hostView", "skipResults"]),
    );
  });

  it("S12-AC7: a press while red locks that team out for a quarter second from the press, costing nothing", () => {
    let s = begin();
    // Pressed early, just before the buzzers open.
    s = ok(buzz(s, "t1", T0 + 900, T0 + 950));
    expect(cap(s, "t1", T0 + 950).game.mine).toMatchObject({ early: T0 + 900, place: null });
    s = host(s, "open", T0 + 1000);
    expect(buzz(s, "t1", T0 + 1100)).toMatchObject({ ok: false, message: "Too early!" });
    s = ok(buzz(s, "t2", T0 + 1120));
    s = ok(buzz(s, "t1", T0 + 1160));
    expect(state(s).buzzes.map((b) => b.teamId)).toEqual(["t2", "t1"]);
    // An early press long before opening is long forgotten.
    let q = ok(buzz(begin(), "t3", T0 + 10, T0 + 50));
    q = host(q, "open", T0 + 5000);
    expect(buzz(q, "t3", T0 + 5010)).toMatchObject({ ok: true });
  });

  it("S24-AC8: a round plays through with 1 to 6 teams buzzing at random, late or never", () => {
    for (const n of PLAYTEST_TEAM_COUNTS)
      for (let seed = 1; seed <= 20; seed++) {
        let r = seed;
        const random = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
        let s = host(begin(n), "open", T0 + 1000);
        for (const t of playtestTeams(n)) {
          const kind = random();
          if (kind < 0.2) continue; // silent
          const at = T0 + 1000 + Math.floor(random() * 3000);
          const out = buzz(s, t.id, kind < 0.35 ? at - 2000 : at, at + Math.floor(random() * 900));
          if (out.ok && out.session) s = out.session;
        }
        const order = state(s).buzzes.map((b) => b.at);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        // The host judges everyone wrong but the last, who's right.
        while (state(s).buzzes.some((b) => state(s).results[b.teamId] === undefined)) {
          const left = state(s).buzzes.filter((b) => state(s).results[b.teamId] === undefined);
          s = host(s, left.length === 1 ? "right" : "wrong", T0 + 6000);
        }
        if (state(s).phase !== "done") s = host(s, "reveal", T0 + 7000);
        const out = next(m, s, T0 + 8000);
        if (!out.ok) throw new Error(out.message);
        const points = Object.values(out.award?.points ?? {});
        expect(points.filter((p) => p > 0).length).toBeLessThanOrEqual(1);
        for (const p of points) expect([0, 200]).toContain(p);
      }
  });
});
