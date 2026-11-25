"use client";

import { askFor, getReadyLine, PerceptionStage } from "@/components/games/perception/stage";
import {
  RibbonStrip,
  StaffDial,
  type AngleScene,
  type Mark,
  type RibbonScene,
} from "@/components/games/perception/scenes";
import { percent } from "@/lib/games";
import type { PerceptionView } from "@/lib/live";
import type { ActiveLiveView, LiveControllerProps, LiveRenderer, LiveTvProps } from "../types";
import { useHydrated } from "@/components/motion";
import { useFrame } from "../use-live";
import {
  GetReady,
  LockedIn,
  PhoneNote,
  PhoneResult,
  Reveal,
  TimeLeft,
  useDraftAnswer,
  useServerTime,
} from "./shared";

/**
 * The perception games as showdowns (spec 28): the task on the TV for the
 * room, the input on the captain's phone, then every team's answer drawn on
 * the scene at the reveal with how close it was.
 */

/** A scene held to its own shape inside a box `width` wide, centered. */
function Frame({ width, children }: { width: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: width }}>
      {children}
    </div>
  );
}

function marks(view: ActiveLiveView, g: PerceptionView): Mark[] {
  return view.teams.flatMap((t) => {
    const v = g.answers?.[t.id];
    return typeof v === "number" ? [{ id: t.id, color: t.color, name: t.name, value: v }] : [];
  });
}

/** While teams answer: the question, the bits of the scene that may show, the clock and who's in. */
function AnswerScene({
  view,
  g,
  type,
  now,
}: {
  view: ActiveLiveView;
  g: PerceptionView;
  type: string;
  now: number;
}) {
  const scene = g.scene;
  return (
    <div className="grid gap-[3vh]">
      <p className="m-0 text-center font-gm-display text-[clamp(2.4rem,8vh,6rem)] font-bold text-balance">
        {askFor(type, scene)}
      </p>
      {type === "staffangle" && (
        <Frame width="40vh">
          <StaffDial angle={null} />
        </Frame>
      )}
      {type === "ribbon" && <RibbonStrip cut={null} className="h-[14vh]" />}
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.showEndsAt} />
      <LockedIn view={view} locked={g.lockedIn} />
    </div>
  );
}

/** The reveal's picture: the right answer, with each team's drawn on it. */
function TruthScene({ view, g, type }: { view: ActiveLiveView; g: PerceptionView; type: string }) {
  const scene = g.scene;
  if (!scene) return null;
  if (type === "staffangle")
    return (
      <Frame width="36vh">
        <StaffDial angle={null} target={(scene as AngleScene).target} marks={marks(view, g)} />
      </Frame>
    );
  return (
    <RibbonStrip
      cut={null}
      truth={(scene as RibbonScene).at}
      marks={marks(view, g)}
      className="mx-auto h-[10vh]"
    />
  );
}

function tv(type: string) {
  return function Tv({ view, game, serverNow, revealed }: LiveTvProps) {
    const g = game as PerceptionView | null;
    const now = useServerTime(serverNow, !revealed);
    if (!g) return null;
    if (revealed)
      return (
        <div className="grid gap-[2vh]">
          <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
            It was <span className="text-gm-tile-correct">{g.truth}</span>
          </p>
          <TruthScene view={view} g={g} type={type} />
          <Reveal
            view={view}
            answer={(t) => g.said?.[t] ?? null}
            note={(t) => {
              const c = g.closeness?.[t];
              return c === undefined ? null : percent(c);
            }}
          />
        </div>
      );
    // A view fetched before the start has no scene yet: hold on Get ready
    // until the one after it comes (it's fetched the moment the round starts).
    if (now < g.startsAt || (g.scene === null && g.phase === "show"))
      return <GetReady startsAt={g.startsAt} now={now} line={getReadyLine(type)} />;
    return <AnswerScene view={view} g={g} type={type} now={now} />;
  };
}

function controller(type: string) {
  return function Controller({ game, serverNow, revealed, send, busy, view }: LiveControllerProps) {
    const g = game as PerceptionView | null;
    const now = useServerTime(serverNow, !revealed);
    const draft = useDraftAnswer(send);
    if (!g) return null;
    if (revealed) return <PhoneResult view={view} />;
    if (now < g.startsAt || (g.scene === null && g.phase === "show"))
      return <PhoneNote title="Get ready!">{getReadyLine(type)}</PhoneNote>;
    if (now > g.closesAt)
      return <PhoneNote title="Time's up">Watch the TV for the answer.</PhoneNote>;
    return (
      <PerceptionStage
        type={type}
        scene={g.scene}
        elapsed={now - g.startsAt}
        showMs={g.showEndsAt - g.startsAt}
        answerMs={g.closesAt - g.showEndsAt}
        busy={busy}
        onAnswer={(answer) => void send({ answer })}
        onDraft={draft}
        initial={g.mine}
        showOn="tv"
        timer={<TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.showEndsAt} />}
      />
    );
  };
}

// ---- Demos (S24-AC4): each loops a few seconds of play.

const pageClock = () => performance.now();

/** A clock that loops every `period` ms while the demo plays; frozen at `at` when still. */
function useLoop(period: number, still: boolean, at: number) {
  const hydrated = useHydrated();
  useFrame(!still && hydrated);
  return still || !hydrated ? at : pageClock() % period;
}

function demo(type: string) {
  return function Demo({ still }: { still: boolean }) {
    const t = useLoop(4000, still, 1200);
    return (
      <div className="grid h-full w-full place-items-center p-[6%]">
        <div className="w-full max-w-[60vh]">
          {type === "staffangle" ? (
            <StaffDial angle={Math.round(Math.min(1, t / 2500) * 35)} />
          ) : (
            <RibbonStrip cut={t > 1500 ? 0.34 : null} />
          )}
        </div>
      </div>
    );
  };
}

const renderer = (type: string): LiveRenderer => ({
  Tv: tv(type),
  Controller: controller(type),
  Demo: demo(type),
});

export const staffangleRenderer = renderer("staffangle");
export const ribbonRenderer = renderer("ribbon");
