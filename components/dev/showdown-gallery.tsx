"use client";

import { LivePanel } from "@/components/live/live-phone";
import { LiveTv } from "@/components/live/live-tv";
import type { ActiveLiveView } from "@/components/live/types";
import { useSlots } from "@/components/slots/registry";
import type { GalleryMoment } from "./showdown-moments";
import {
  exitY,
  keepBeats,
  PERCEPTION_CORES,
  type Cell,
  type DrumTask,
  type SleighTask,
} from "@/lib/games";
import {
  cover,
  liveView,
  move,
  next,
  tick,
  playtestTeams,
  showdownFor,
  startSession,
  START_LEAD_MS,
  type LiveTeam,
  type Machine,
  type Session,
} from "@/lib/live";

/**
 * One showdown frozen at a moment, on the real game logic and views: for
 * looking at the TV and phone screens without running a party (dev only).
 */

const NAMES = [
  "Snow Dragons",
  "Jade Tigers",
  "Iron Cranes",
  "Golden Monkeys",
  "Swift Mantis",
  "Red Lanterns",
];

function teams(n: number): LiveTeam[] {
  return playtestTeams(n).map((t, i) => ({ ...t, name: NAMES[i] ?? t.name }));
}

/**
 * Made-up play for games whose rounds aren't a single answer: moves at times
 * after the shared start, and the times the "show" and "answer" moments
 * freeze at. Moves up to the frozen time are played.
 */
type Script = (
  state: unknown,
  n: number,
) => {
  moves: [string, unknown, number][];
  show: number;
  answer: number;
  /** Turn games: the move the team whose turn it is makes now, from the state as it stands. */
  drive?: (state: unknown, turn: string, i: number) => unknown;
};

/**
 * The perception games (spec 28): team 1 near enough exact, team 2 a little
 * off, team 3 further off, a moment after the show.
 */
function perceptionScript(type: string): Script {
  return (state) => {
    const p = state as { task: unknown; startsAt: number; showEndsAt: number };
    const show = p.showEndsAt - p.startsAt;
    if (type === "liondrum") {
      const beats = keepBeats(p.task as DrumTask);
      const last = beats.at(-1) ?? 0;
      return {
        moves: [
          ["t1", { answer: beats.map((b) => b + 20) }, last + 500],
          ["t2", { answer: beats.map((b, i) => b + (i % 2 ? 90 : -60)) }, last + 600],
          ["t3", { answer: beats.slice(0, -1).map((b) => b + 160) }, last + 700],
        ],
        show: Math.round(show * 0.4),
        answer: show + 400,
      };
    }
    const right =
      type === "snowpile"
        ? (p.task as { count: number }).count
        : type === "staffangle"
          ? (p.task as { target: number }).target
          : type === "sleighrun"
            ? exitY(p.task as SleighTask)
            : (p.task as { at: number }).at;
    const off = type === "snowpile" ? [1, -4] : type === "staffangle" ? [6, -14] : [0.04, -0.09];
    const fix = (n: number) => (type === "snowpile" || type === "staffangle" ? Math.round(n) : n);
    const at = show + 1500;
    return {
      moves: [
        ["t1", { answer: right }, at],
        ["t2", { answer: fix(right + (off[0] ?? 0)) }, at + 400],
        ["t3", { answer: fix(Math.max(0, right + (off[1] ?? 0))) }, at + 800],
      ],
      show: Math.max(0, Math.round(show * 0.5)),
      answer: at + 600,
    };
  };
}

const SCRIPTS: Record<string, Script> = {
  ...Object.fromEntries(PERCEPTION_CORES.map((c) => [c.type, perceptionScript(c.type)])),
  auction: () => ({
    moves: [
      ["t1", { bid: 10 }, 800],
      ["t2", { bid: 10 }, 1600],
      ["t3", { bid: 7 }, 2400],
    ],
    show: 2000,
    answer: 4000,
  }),
  stockings: (_s, n) => ({
    moves: [
      ...Array.from({ length: n }, (_, i): [string, unknown, number] => [
        `t${String(i + 1)}`,
        { choice: i === 2 ? "bank" : "open" },
        800 + i * 100,
      ]),
      ["t1", { choice: "open" }, 5200],
    ],
    show: 2000,
    answer: 5600,
  }),
  to21: () => ({ moves: [], show: 3500, answer: 3500, drive: () => ({ add: 3 }) }),
  path: (state) => {
    const p = state as {
      showEndsAt: number;
      startsAt: number;
      path: [number, number][];
      progress: number;
      at: number;
    };
    const show = p.showEndsAt - p.startsAt;
    return {
      moves: [],
      show: Math.round(show * 0.6),
      answer: show + 4200,
      // The first team gets 4 right, then misses; the next crosses.
      drive: (s) => {
        const st = s as typeof p;
        if (st.at === 0 && st.progress === 4) return { square: [-1, -1] };
        return { square: st.path[st.progress] };
      },
    };
  },
  shuffle: (state) => {
    const p = state as { shuffleEndsAt: number; startsAt: number; picks: Record<string, unknown> };
    const settled = p.shuffleEndsAt - p.startsAt;
    return {
      moves: [],
      show: settled - 2400,
      answer: settled + 2000,
      drive: (_s, _t, i) => ({ slot: (i * 4) % 9 }),
    };
  },
  landmass: () => ({
    moves: [],
    show: 9000,
    answer: 9000,
    drive: (s, _t, i) => {
      const st = s as Parameters<typeof cover>[0] & { tray: Cell[][] };
      for (const [k, piece] of st.tray.entries()) {
        for (let row = 0; row < st.rows; row++)
          for (let col = (i * 3) % st.cols; col < st.cols; col++)
            for (let turns = 0; turns < 4; turns++)
              if (cover(st, piece, turns, row, col)) return { piece: k, turns, row, col };
      }
      return null;
    },
  }),
  snatch: (state) => {
    const pairs = (state as { pairs: [string, string][] }).pairs;
    return {
      moves: pairs.flatMap(([a, b], i): [string, unknown, number][] => [
        [a, { choice: i === 0 ? "snatch" : "share" }, 900],
        [b, { choice: "share" }, 1700],
      ]),
      show: 1200,
      answer: 3000,
    };
  },
};

/** Plays the round up to the moment, with made-up answers from a few teams. */
function freeze(type: string, moment: GalleryMoment, n: number) {
  const game = showdownFor(type);
  if (!game) return null;
  const m: Machine = { game, content: game.content.parse({}) };
  const T0 = 1_000_000;
  const ok = (s: Session | null) => {
    if (!s) throw new Error("ended");
    return s;
  };
  const step = (s: Session, now: number) => {
    const out = next(m, s, now);
    if (!out.ok) throw new Error(out.message);
    return ok(out.session);
  };
  const fresh = startSession(m, {
    id: "g",
    gameId: type,
    type,
    title: TITLES[type] ?? type,
    teams: teams(n),
    seed: 21,
    now: T0,
  });
  if (moment === "intro") return { m, s: fresh, now: T0 };
  let s = step(fresh, T0);
  const startsAt = T0 + START_LEAD_MS;
  const script = SCRIPTS[type]?.(s.state, n);
  if (script) {
    const until =
      moment === "ready"
        ? -1400
        : moment === "show"
          ? script.show
          : moment === "answer"
            ? script.answer
            : 60_000;
    for (const [teamId, mv, at] of script.moves) {
      if (at > until) break;
      const out = move(m, s, teamId, mv, startsAt + at);
      if (out.ok && out.session) s = out.session;
    }
    // Turn games: whoever's turn it is moves every 0.7 s, from the state as it stands.
    if (script.drive)
      for (let i = 0, at = 0; i < 60; i++) {
        const turn = m.game.turn?.(s.state, m.content, startsAt + at);
        at = Math.max(at, 800) + 700;
        if (!turn) {
          if (at > until) break;
          continue;
        }
        if (at > until) break;
        const mv = script.drive(s.state, turn.teamId, i);
        if (mv === null) break;
        const out = move(m, s, turn.teamId, mv, startsAt + at);
        if (out.ok && out.session) s = out.session;
      }
    let now = startsAt + Math.min(until, 30_000);
    const t = tick(m, s, now);
    if (t.ok && t.session) s = t.session;
    if (moment === "results" || moment === "final") s = step(s, (now += 1000));
    if (moment === "final") while (s.step !== "final") s = step(s, now);
    return { m, s, now };
  }
  const st = s.state as {
    showEndsAt?: number;
    closesAt?: number;
    count?: number;
    total?: number;
    truth?: number;
    targetMs?: number;
    countdownMs?: number;
  };
  const showEnds = st.showEndsAt ?? startsAt + 3000;
  const truth = st.count ?? st.total ?? st.truth ?? 0;
  const answers = (now: number) => {
    const moves: [string, unknown][] =
      st.targetMs !== undefined
        ? [
            ["t1", { elapsedMs: 10_000 }],
            ["t2", { elapsedMs: 9_620 }],
            ["t3", { elapsedMs: 10_480 }],
          ]
        : st.countdownMs !== undefined
          ? [
              ["t1", { elapsedMs: 9_880 }],
              ["t2", { elapsedMs: 7_400 }],
              ["t3", { elapsedMs: 9_310 }],
            ]
          : [
              ["t1", { answer: truth }],
              ["t2", { answer: truth + 1 }],
              ["t3", { answer: Math.max(0, truth - 4) }],
            ];
    for (const [teamId, mv] of moves) {
      const elapsed = (mv as { elapsedMs?: number }).elapsedMs;
      const at = elapsed !== undefined ? startsAt + elapsed + 40 : now;
      const out = move(m, s, teamId, mv, at);
      if (out.ok && out.session) s = out.session;
    }
  };
  let now = startsAt - 1400;
  if (moment === "show") now = startsAt + Math.round((showEnds - startsAt) * 0.45);
  if (moment === "answer" || moment === "results" || moment === "final") {
    now = st.countdownMs !== undefined ? startsAt + 6200 : showEnds + 3500;
    if (st.targetMs !== undefined) now = startsAt + 1800;
    if (moment !== "answer" || st.targetMs === undefined)
      answers(st.countdownMs !== undefined || st.targetMs !== undefined ? startsAt + 20_000 : now);
  }
  if (moment === "results" || moment === "final") {
    now += 30_000;
    s = step(s, now);
  }
  if (moment === "final") {
    while (s.step !== "final") s = step(s, now);
  }
  return { m, s, now };
}

export const TITLES: Record<string, string> = {
  flyby: "Fly-by Count",
  snowsum: "Snow Sum",
  colorcount: "Color Count",
  blindstop: "Blind Stop",
  lastsecond: "Last Second",
  auction: "Auction",
  stockings: "Stocking Stuffer",
  snatch: "Share or Snatch",
  path: "Memory Path",
  shuffle: "Present Shuffle",
  to21: "Snowball to 21",
  landmass: "Land Mass",
  snowpile: "Snow Pile",
  staffangle: "Staff Angle",
  sleighrun: "Sleigh Run",
  liondrum: "Lion Drum",
  ribbon: "Cut the Ribbon",
};

/** The TV at a moment, as the display shows it. */
export function ShowdownTvFrame({
  type,
  moment,
  teamCount = 4,
}: {
  type: string;
  moment: GalleryMoment;
  teamCount?: number;
}) {
  const { Banner } = useSlots();
  const frozen = freeze(type, moment, teamCount);
  if (!frozen) return <p>Unknown showdown {type}</p>;
  const view = liveView(frozen.m, frozen.s, { kind: "tv" }, frozen.now) as ActiveLiveView;
  const totals = view.teams.map((t, i) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    points: 400 - i * 90 + t.score,
  }));
  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <style>{"html{font-size:clamp(11px,min(1.2vw,2.1vh),32px)}"}</style>
      <Banner title="Nova Wushu Holiday Party" size="lg" />
      <main className="min-h-0 overflow-hidden">
        <LiveTv view={view} serverNow={() => frozen.now} totals={totals} />
      </main>
    </div>
  );
}

/** A captain's phone at the same moment. */
export function ShowdownPhoneFrame({
  type,
  moment,
  teamCount = 4,
  as,
}: {
  type: string;
  moment: GalleryMoment;
  teamCount?: number;
  /** Whose phone to show; by default team 4 on the answer moment, else team 1. */
  as?: string | undefined;
}) {
  const frozen = freeze(type, moment, teamCount);
  if (!frozen) return <p>Unknown showdown {type}</p>;
  const captain = as ?? (moment === "answer" ? "t4" : "t1");
  const view = liveView(frozen.m, frozen.s, { kind: "captain", teamId: captain }, frozen.now);
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-xl content-start gap-5 bg-gm-bg px-4 py-5">
      <LivePanel
        view={view}
        serverNow={() => frozen.now}
        send={() => Promise.resolve()}
        busy={false}
        error={null}
      />
    </main>
  );
}
