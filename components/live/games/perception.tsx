"use client";

import type { ReactNode } from "react";
import { askFor, getReadyLine, PerceptionStage } from "@/components/games/perception/stage";
import {
  LionDrum,
  RibbonStrip,
  SleighSky,
  SnowField,
  StaffDial,
  type AngleScene,
  type DrumScene,
  type Mark,
  type RibbonScene,
  type SleighScene,
  type SnowScene,
} from "@/components/games/perception/scenes";
import { percent } from "@/lib/games";
import type { PerceptionView } from "@/lib/live";
import { cx } from "@/lib/ui";
import type { ActiveLiveView, LiveControllerProps, LiveRenderer, LiveTvProps } from "../types";
import { useFrame } from "../use-live";
import {
  GetReady,
  LockedIn,
  PhoneNote,
  PhoneResult,
  Reveal,
  Swatch,
  TimeLeft,
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

/** A color held up on a white card, like a judge's paint chip, with a name under it when given. */
function Chip({
  color,
  label,
  name = "The color",
  size,
}: {
  color: string;
  label?: ReactNode;
  /** What a screen reader calls it. */
  name?: string;
  size: string;
}) {
  return (
    <figure className="m-0 grid justify-items-center gap-[1vh]">
      <span
        role="img"
        aria-label={name}
        className={cx(
          "block rounded-[4px] border-[1.2vh] border-gm-tile-present shadow-md ring-1 ring-gm-border",
          size,
        )}
        style={{ background: color }}
      />
      {label && (
        <figcaption className="flex items-center gap-2 text-[clamp(1rem,2.6vh,1.9rem)] font-bold">
          {label}
        </figcaption>
      )}
    </figure>
  );
}

/** The scene while it's shown, as big as the TV allows. */
function ShowScene({ type, scene, elapsed }: { type: string; scene: unknown; elapsed: number }) {
  if (type === "color")
    return (
      <div className="grid justify-items-center gap-[3vh]">
        <p className="m-0 font-gm-display text-[clamp(1.8rem,5vh,3.8rem)] font-bold">
          Remember this color!
        </p>
        <Chip color={(scene as { color: string }).color} size="h-[46vh] w-[62vh]" />
      </div>
    );
  if (type === "snowpile")
    return (
      <Frame width="99vh">
        <SnowField scene={scene as SnowScene} />
      </Frame>
    );
  if (type === "sleighrun")
    return (
      <Frame width="99vh">
        <SleighSky scene={scene as SleighScene} elapsed={elapsed} />
      </Frame>
    );
  if (type === "liondrum") {
    const d = scene as DrumScene;
    return (
      <div className="grid justify-items-center gap-[2vh]">
        <p className="m-0 font-gm-display text-[clamp(1.8rem,5vh,3.8rem)] font-bold">
          Watch the beat…
        </p>
        <LionDrum lit={elapsed >= 0 && elapsed % d.intervalMs < 140} className="h-[50vh]" />
      </div>
    );
  }
  return null;
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
      {type === "sleighrun" && scene !== null && (
        <Frame width="58vh">
          <SleighSky scene={scene as SleighScene} elapsed={Infinity} />
        </Frame>
      )}
      {type === "ribbon" && <RibbonStrip cut={null} className="h-[14vh]" />}
      {type === "liondrum" && <LionDrum lit={false} className="mx-auto h-[24vh]" />}
      <TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.showEndsAt} />
      <LockedIn view={view} locked={g.lockedIn} />
    </div>
  );
}

/** The reveal's picture: the right answer, with each team's drawn on it. */
function TruthScene({ view, g, type }: { view: ActiveLiveView; g: PerceptionView; type: string }) {
  const scene = g.scene;
  if (!scene) return null;
  if (type === "color")
    return (
      <div className="flex flex-wrap items-end justify-center gap-[3vh]">
        <Chip
          color={(scene as { color: string }).color}
          size="h-[16vh] w-[22vh]"
          label="The color"
        />
        {view.teams.flatMap((t) => {
          const hex = g.answers?.[t.id];
          return typeof hex === "string"
            ? [
                <Chip
                  key={t.id}
                  color={hex}
                  name={`Picked by ${t.name}`}
                  size="h-[11vh] w-[15vh]"
                  label={
                    <>
                      <Swatch color={t.color} />
                      {t.name}
                    </>
                  }
                />,
              ]
            : [];
        })}
      </div>
    );
  if (type === "snowpile")
    return (
      <Frame width="32vh">
        <SnowField scene={scene as SnowScene} />
      </Frame>
    );
  if (type === "staffangle")
    return (
      <Frame width="36vh">
        <StaffDial angle={null} target={(scene as AngleScene).target} marks={marks(view, g)} />
      </Frame>
    );
  if (type === "sleighrun")
    return (
      <Frame width="34vh">
        <SleighSky scene={scene as SleighScene} elapsed={Infinity} marks={marks(view, g)} />
      </Frame>
    );
  if (type === "ribbon")
    return (
      <RibbonStrip
        cut={null}
        truth={(scene as RibbonScene).at}
        marks={marks(view, g)}
        className="mx-auto h-[10vh]"
      />
    );
  return null;
}

function tv(type: string) {
  return function Tv({ view, game, serverNow, revealed }: LiveTvProps) {
    const g = game as PerceptionView | null;
    const now = useServerTime(serverNow, !revealed);
    if (!g) return null;
    if (revealed)
      return (
        <div className="grid gap-[2vh]">
          {type !== "color" && (
            <p className="m-0 text-center font-gm-display text-[clamp(2rem,6vh,4.5rem)] font-bold">
              It was <span className="text-gm-tile-correct">{g.truth}</span>
            </p>
          )}
          <TruthScene view={view} g={g} type={type} />
          <Reveal
            view={view}
            answer={(t) => g.said?.[t] ?? null}
            note={(t) => {
              const c = g.closeness?.[t];
              // Color Matcher's answer already says how well it matched.
              return c === undefined || type === "color" ? null : percent(c);
            }}
          />
        </div>
      );
    // A view fetched before the start has no scene yet: hold on Get ready
    // until the one after it comes (it's fetched the moment the round starts).
    if (now < g.startsAt || (g.scene === null && g.phase === "show"))
      return <GetReady startsAt={g.startsAt} now={now} line={getReadyLine(type)} />;
    if (now < g.showEndsAt && g.scene !== null)
      return <ShowScene type={type} scene={g.scene} elapsed={now - g.startsAt} />;
    return <AnswerScene view={view} g={g} type={type} now={now} />;
  };
}

function controller(type: string) {
  return function Controller({ game, serverNow, revealed, send, busy, view }: LiveControllerProps) {
    const g = game as PerceptionView | null;
    const now = useServerTime(serverNow, !revealed);
    if (!g) return null;
    if (revealed) return <PhoneResult view={view} />;
    if (g.answered)
      return <PhoneNote title="Locked in">Now watch the TV for the answer.</PhoneNote>;
    if (now < g.startsAt || (g.scene === null && g.phase === "show"))
      return <PhoneNote title="Get ready!">{getReadyLine(type)}</PhoneNote>;
    if (now > g.closesAt)
      return <PhoneNote title="Time's up">Watch the TV for the answer.</PhoneNote>;
    return (
      <PerceptionStage
        type={type}
        scene={g.scene}
        elapsed={now - g.startsAt}
        clock={() => serverNow() - g.startsAt}
        showMs={g.showEndsAt - g.startsAt}
        answerMs={g.closesAt - g.showEndsAt}
        busy={busy}
        onAnswer={(answer) => void send({ answer })}
        showOn="tv"
        timer={<TimeLeft closesAt={g.closesAt} now={now} total={g.closesAt - g.showEndsAt} />}
      />
    );
  };
}

// ---- Demos (S24-AC4): each loops a few seconds of play.

const DEMO_FLAKES: [number, number][] = Array.from({ length: 18 }, (_, i) => [
  ((i * 37) % 17) / 17 + 0.02,
  ((i * 53) % 13) / 13 + 0.03,
]);
const DEMO_SKY: SleighScene = {
  startY: 0.7,
  slope: -0.5,
  cloudFrom: 0.45,
  cloudTo: 0.75,
  flightMs: 2000,
  exitY: null,
};

const pageClock = () => performance.now();

/** A clock that loops every `period` ms while the demo plays; frozen at `at` when still. */
function useLoop(period: number, still: boolean, at: number) {
  useFrame(!still);
  return still ? at : pageClock() % period;
}

function demo(type: string) {
  return function Demo({ still }: { still: boolean }) {
    const t = useLoop(4000, still, 1200);
    return (
      <div className={cx("grid h-full w-full place-items-center p-[6%]")}>
        <div className="w-full max-w-[60vh]">
          {type === "snowpile" &&
            (t < 2200 ? (
              <SnowField scene={{ flakes: DEMO_FLAKES, count: null }} />
            ) : (
              <p className="m-0 text-center font-gm-display text-[clamp(2rem,7vh,5rem)] font-bold">
                How many?
              </p>
            ))}
          {type === "staffangle" && <StaffDial angle={Math.round(Math.min(1, t / 2500) * 35)} />}
          {type === "sleighrun" && (
            <SleighSky scene={DEMO_SKY} elapsed={t} pick={t > 2800 ? 0.32 : null} />
          )}
          {type === "liondrum" && (
            <LionDrum lit={t < 2400 && t % 600 < 140} className="mx-auto w-[min(100%,30vh)]">
              {t >= 2400 ? "Tap" : null}
            </LionDrum>
          )}
          {type === "ribbon" && <RibbonStrip cut={t > 1500 ? 0.34 : null} />}
          {type === "color" &&
            (t < 2200 ? (
              <Chip color="var(--gm-team-5)" size="mx-auto h-[24vh] w-[32vh]" />
            ) : (
              <p className="m-0 text-center font-gm-display text-[clamp(2rem,7vh,5rem)] font-bold">
                Match the color!
              </p>
            ))}
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

export const snowpileRenderer = renderer("snowpile");
export const staffangleRenderer = renderer("staffangle");
export const sleighrunRenderer = renderer("sleighrun");
export const liondrumRenderer = renderer("liondrum");
export const ribbonRenderer = renderer("ribbon");
export const colorRenderer = renderer("color");
