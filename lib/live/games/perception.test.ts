import { describe, expect, it } from "vitest";
import {
  colorCore,
  exitY,
  keepBeats,
  liondrumCore,
  PERCEPTION_CORES,
  staffangleCore,
  type AngleTask,
  type DrumTask,
  type PerceptionCore,
  type RibbonTask,
  type SleighTask,
  type SnowPileTask,
} from "@/lib/games";
import { PLAYTEST_TEAM_COUNTS, playtest, type Bot, type BotContext } from "../playtest";
import { perceptionShowdown, type PerceptionState, type PerceptionView } from "./perception";

const T0 = 1_000_000;
const teams = ["t1", "t2", "t3", "t4"];

describe("perception showdowns (spec 28)", () => {
  it("S28-AC3: three rounds at levels 1 to 3, every team on the same task, ranked by closeness, no answer 0", () => {
    const game = perceptionShowdown(staffangleCore);
    const c = game.content.parse({});
    expect(game.rounds(c, 4)).toBe(3);
    const levels = [1, 2, 3].map(
      (round) =>
        (
          game.deal(c, { seed: 5, round, teams, startsAt: T0, prev: null }) as PerceptionState<
            AngleTask,
            number
          >
        ).level,
    );
    expect(levels).toEqual([1, 2, 3]);
    let s = game.deal(c, { seed: 5, round: 1, teams, startsAt: T0, prev: null }) as PerceptionState<
      AngleTask,
      number
    >;
    const target = s.task.target;
    const answer = (team: string, a: number) => {
      const r = game.move(s, c, { teamId: team, move: { answer: a }, now: T0 + 1000 });
      if (!r.ok) throw new Error(r.message);
      s = r.state as typeof s;
    };
    answer("t1", target);
    answer("t2", target + 10);
    answer("t3", target - 10);
    expect(game.move(s, c, { teamId: "t1", move: { answer: 5 }, now: T0 + 1100 })).toMatchObject({
      ok: false,
      message: "You've answered.",
    });
    expect(game.score(s, c, teams)).toEqual({ t1: 100, t2: 70, t3: 70, t4: 0 });
  });

  it("S28-AC4: answers stay secret until the reveal; the TV shows who has answered", () => {
    const game = perceptionShowdown(staffangleCore);
    const c = game.content.parse({});
    let s = game.deal(c, { seed: 2, round: 1, teams, startsAt: T0, prev: null });
    const r = game.move(s, c, { teamId: "t1", move: { answer: 40 }, now: T0 + 500 });
    if (!r.ok) throw new Error(r.message);
    s = r.state;
    const tv = game.view(s, c, {
      role: { kind: "tv" },
      revealed: false,
      now: T0 + 600,
      teams,
    }) as PerceptionView;
    expect(tv).toMatchObject({
      lockedIn: ["t1"],
      said: null,
      closeness: null,
      truth: null,
      answers: null,
    });
    const shown = game.view(s, c, {
      role: { kind: "tv" },
      revealed: true,
      now: T0 + 600,
      teams,
    }) as PerceptionView;
    expect(shown.said).toEqual({ t1: "40°" });
    // Before the start, nothing of the task shows.
    expect(
      (
        game.view(s, c, {
          role: { kind: "tv" },
          revealed: false,
          now: T0 - 100,
          teams,
        }) as PerceptionView
      ).scene,
    ).toBeNull();
  });

  it("S28-AC5: Lion Drum takes phone-timed taps and refuses any the server's clock says haven't happened yet", () => {
    const game = perceptionShowdown(liondrumCore);
    const c = game.content.parse({});
    const s = game.deal(c, {
      seed: 4,
      round: 1,
      teams,
      startsAt: T0,
      prev: null,
    }) as PerceptionState<DrumTask, number[]>;
    const beats = keepBeats(s.task);
    expect(
      game.move(s, c, { teamId: "t1", move: { answer: beats }, now: T0 + 1000 }),
    ).toMatchObject({ ok: false, message: "Those taps aren't possible." });
    const ok = game.move(s, c, {
      teamId: "t1",
      move: { answer: beats },
      now: T0 + (beats.at(-1) ?? 0) + 100,
    });
    expect(ok.ok).toBe(true);
  });
});

const rgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

describe("Color Matcher as a showdown (spec 30)", () => {
  it("S30-AC1: ranks teams by the spec 18 distance, 100, 70, 50, 30, then 10; no answer 0", () => {
    const game = perceptionShowdown(colorCore);
    const c = game.content.parse({});
    const teams = ["t1", "t2", "t3", "t4", "t5", "t6"];
    let s = game.deal(c, { seed: 8, round: 1, teams, startsAt: T0, prev: null });
    const target = (s as { task: { target: string } }).task.target;
    const [r, g, b] = rgb(target);
    const shift = (d: number) =>
      `#${[r, g, b]
        .map((v) =>
          Math.max(0, v - d)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`.toUpperCase();
    const at = T0 + colorCore.showMs((s as { task: never }).task) + 500;
    // Even inside full marks, the nearer color ranks higher.
    ["t1", "t2", "t3", "t4", "t5"].forEach((team, i) => {
      const out = game.move(s, c, { teamId: team, move: { answer: shift(i * 3) }, now: at });
      if (!out.ok) throw new Error(out.message);
      s = out.state;
    });
    expect(game.score(s, c, teams)).toEqual({ t1: 100, t2: 70, t3: 50, t4: 30, t5: 10, t6: 0 });
  });
});

// ---- Mock play tests (S24-AC8)

type V = PerceptionView | null;
const gv = (ctx: BotContext) => ctx.view.game as V;
/** The right answer, from the real task: only perfect bots look. */
function perfectAnswer(type: string, task: unknown): unknown {
  if (type === "snowpile") return (task as SnowPileTask).count;
  if (type === "staffangle") return (task as AngleTask).target;
  if (type === "sleighrun") return exitY(task as SleighTask);
  if (type === "liondrum") return keepBeats(task as DrumTask);
  if (type === "color") return (task as { target: string }).target;
  return (task as RibbonTask).at;
}
function randomAnswer(type: string, ctx: BotContext): unknown {
  const r = ctx.random();
  if (type === "snowpile") return Math.floor(r * 120);
  if (type === "staffangle") return Math.round(r * 180);
  if (type === "liondrum") return [Math.round(r * 5000)];
  if (type === "color")
    return `#${Math.floor(r * 0xffffff)
      .toString(16)
      .padStart(6, "0")}`;
  return r;
}

function bots(type: string): Record<string, Bot> {
  const ready = (ctx: BotContext) => {
    const v = gv(ctx);
    return v !== null && !v.answered && ctx.now >= v.showEndsAt && ctx.now <= v.closesAt;
  };
  return {
    // Lion Drum's perfect taps are sent once the last beat has passed.
    perfect: (ctx) => {
      const v = gv(ctx);
      if (!ready(ctx) || !v) return null;
      const s = ctx.peek as PerceptionState<unknown, unknown>;
      const a = perfectAnswer(type, s.task);
      if (type === "liondrum" && ctx.now - v.startsAt < Math.max(...(a as number[])) + 50)
        return null;
      return { answer: a };
    },
    random: (ctx) =>
      ready(ctx) && ctx.now - (gv(ctx)?.showEndsAt ?? 0) > 3000
        ? { answer: randomAnswer(type, ctx) }
        : null,
    late: (ctx) => {
      const v = gv(ctx);
      return v && !v.answered && ctx.now > v.closesAt + 2000
        ? { answer: randomAnswer(type, ctx) }
        : null;
    },
  };
}

describe("spec 28 play tests (S24-AC8)", () => {
  for (const core of [...PERCEPTION_CORES, colorCore] as readonly PerceptionCore<
    unknown,
    unknown
  >[])
    it(`S24-AC8: ${core.name} as a showdown plays whole games with 1 to 6 teams: ends, ranks within the rules, leaks nothing, perfect never beaten`, () => {
      const game = perceptionShowdown(core);
      const kinds = ["perfect", "random", "late", "silent", "dropout"];
      for (const n of PLAYTEST_TEAM_COUNTS)
        for (const shift of [0, 1, 2, 3, 4]) {
          const mine = Array.from({ length: n }, (_, i) =>
            i === 0 ? "perfect" : (kinds[(i + shift) % kinds.length] ?? "silent"),
          );
          const b = bots(core.type);
          const r = playtest(
            game,
            {},
            {
              teams: n,
              seed: n * 29 + shift,
              stepMs: 100,
              bots: (i) => {
                const k = mine[i] ?? "silent";
                return k === "silent" ? null : (b[k === "dropout" ? "perfect" : k] ?? null);
              },
              dropOutFrom: Object.fromEntries(
                mine.flatMap((k, i) => (k === "dropout" ? [[i, 2] as const] : [])),
              ),
              leakCheck: (view) => {
                const v = view as PerceptionView;
                return v.said !== null ||
                  v.closeness !== null ||
                  v.truth !== null ||
                  v.answers !== null
                  ? "answers before the reveal"
                  : null;
              },
            },
          );
          expect(r.ended).toBe(true);
          expect(r.leaks).toEqual([]);
          expect(r.rounds).toHaveLength(3);
          for (const round of r.rounds)
            for (const p of Object.values(round)) expect([0, 10, 30, 50, 70, 100]).toContain(p);
          expect(r.rejected.filter((x) => x.teamId === "t1")).toEqual([]);
          expect(r.scores.t1).toBe(Math.max(...Object.values(r.scores)));
          mine.forEach((k, i) => {
            if (k === "silent" || k === "late") expect(r.scores[`t${String(i + 1)}`]).toBe(0);
          });
        }
    });
});
