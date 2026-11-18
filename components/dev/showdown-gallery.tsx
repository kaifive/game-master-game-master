"use client";

import { LivePanel } from "@/components/live/live-phone";
import { LiveTv } from "@/components/live/live-tv";
import type { ActiveLiveView } from "@/components/live/types";
import { useSlots } from "@/components/slots/registry";
import type { GalleryMoment } from "./showdown-moments";
import {
  liveView,
  move,
  next,
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
}: {
  type: string;
  moment: GalleryMoment;
  teamCount?: number;
}) {
  const frozen = freeze(type, moment, teamCount);
  if (!frozen) return <p>Unknown showdown {type}</p>;
  const captain = moment === "answer" ? "t4" : "t1";
  const view = liveView(frozen.m, frozen.s, { kind: "captain", teamId: captain }, frozen.now);
  return (
    <main className="mx-auto grid w-full max-w-xl gap-5 px-4 py-5">
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
