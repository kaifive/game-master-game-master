"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FlyingPresents, PresentAsk, type Fly } from "@/components/live/games/flyby";
import { FallingFlakes } from "@/components/live/games/snowsum";
import type { Flake } from "@/lib/games";
import { ColorWheel } from "../color/color";
import { useAutoSubmit } from "../auto-submit";
import { NumberEntry } from "../number-entry";
import {
  BeatPips,
  LionDrum,
  RibbonStrip,
  SleighSky,
  SnowField,
  StaffDial,
  type AngleScene,
  type DrumScene,
  type RibbonScene,
  type SleighScene,
  type SnowScene,
} from "./scenes";

/**
 * A perception task on a phone (spec 28): what shows during the show, then
 * the input. Solo and the showdown captain's phone both use it; they differ
 * in where the clock comes from and whether the show is on the phone or the TV.
 */

export type StageProps = {
  type: string;
  scene: unknown;
  /** Ms since the task started, live: from the phone's anchor (solo) or the shared start (showdown). */
  elapsed: number;
  /** The same clock, read at the moment of a tap (Lion Drum). */
  clock: () => number;
  showMs: number;
  answerMs: number;
  onAnswer: (answer: unknown) => void;
  busy: boolean;
  /** The answer timer. */
  timer: ReactNode;
  /** In a showdown the room watches the show on the TV; the phone says so. */
  showOn: "phone" | "tv";
};

/** The words a task asks with. */
export function askFor(type: string, scene: unknown): string {
  if (type === "snowpile") return "How many snowflakes were there?";
  if (type === "staffangle") return `Set the staff at ${String((scene as AngleScene).target)}°`;
  if (type === "sleighrun") return "Where does the sleigh come out?";
  if (type === "liondrum") return "Keep the beat!";
  if (type === "flyby") return "How many presents?";
  if (type === "snowsum") return "What's the total?";
  if (type === "color") return "Match the color!";
  return `Cut it ${(scene as RibbonScene).label} along`;
}

/** What the TV says before the shared start. */
export function getReadyLine(type: string): string {
  if (type === "snowpile") return "Count the snowflakes!";
  if (type === "staffangle") return "Get your eye in!";
  if (type === "sleighrun") return "Watch the sleigh!";
  if (type === "liondrum") return "Feel the beat!";
  if (type === "color") return "Remember the color!";
  return "Scissors ready!";
}

function LockIn({ onLock, disabled }: { onLock: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onLock}
      className="min-h-14 w-full rounded-gm bg-gm-accent font-gm-display text-2xl font-bold text-gm-text-on-accent hover:bg-gm-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      Lock in
    </button>
  );
}

function Ask({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-center font-gm-display text-2xl font-bold text-balance">{children}</p>
  );
}

const nudgeLook =
  "grid min-h-12 place-items-center rounded-gm bg-gm-tile-present font-gm-display text-xl font-bold text-gm-tile-present-ink shadow-md ring-1 ring-gm-border motion-safe:active:scale-[0.97]";

/** What every input gets besides its scene: the time left, for sending as it runs out. */
type InputProps = Pick<StageProps, "timer" | "busy" | "onAnswer"> & { left: number };

function AngleInput({ scene, timer, busy, onAnswer, left }: InputProps & { scene: AngleScene }) {
  // The staff starts lying flat, so no angle is handed over for free.
  const [angle, setAngleNow] = useState(0);
  const [touched, setTouched] = useState(false);
  const setAngle = (a: number) => {
    setAngleNow(a);
    setTouched(true);
  };
  const nudge = (by: number) => {
    setAngle(Math.max(0, Math.min(180, angle + by)));
  };
  // A staff that's been turned is sent as the time runs out (Khai, 2026-11-24).
  useAutoSubmit(left, touched && !busy, () => {
    onAnswer(angle);
  });
  const NUDGES: [number, string, string][] = [
    [5, "↺ 5°", "Turn left 5 degrees"],
    [1, "↺ 1°", "Turn left 1 degree"],
    [-1, "↻ 1°", "Turn right 1 degree"],
    [-5, "↻ 5°", "Turn right 5 degrees"],
  ];
  return (
    <section aria-label="Your answer" className="grid gap-4">
      <Ask>{askFor("staffangle", scene)}</Ask>
      {timer}
      <StaffDial angle={angle} onAngle={setAngle} />
      <div className="grid grid-cols-4 gap-2">
        {NUDGES.map(([by, text, label]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className={nudgeLook}
            onClick={() => {
              nudge(by);
            }}
          >
            {text}
          </button>
        ))}
      </div>
      <LockIn
        disabled={busy}
        onLock={() => {
          onAnswer(angle);
        }}
      />
    </section>
  );
}

function SleighInput({
  scene,
  elapsed,
  timer,
  busy,
  onAnswer,
  left,
}: InputProps & Pick<StageProps, "elapsed"> & { scene: SleighScene }) {
  const [pick, setPick] = useState<number | null>(null);
  useAutoSubmit(left, pick !== null && !busy, () => {
    if (pick !== null) onAnswer(pick);
  });
  return (
    <section aria-label="Your answer" className="grid gap-4">
      <Ask>{askFor("sleighrun", scene)}</Ask>
      {timer}
      <SleighSky scene={scene} elapsed={elapsed} pick={pick} onPick={setPick} />
      <p className="m-0 text-center text-lg text-gm-text-muted">
        Tap the dashed edge at the height it comes out.
      </p>
      <LockIn
        disabled={busy || pick === null}
        onLock={() => {
          if (pick !== null) onAnswer(pick);
        }}
      />
    </section>
  );
}

function RibbonInput({ scene, timer, busy, onAnswer, left }: InputProps & { scene: RibbonScene }) {
  const [cut, setCut] = useState<number | null>(null);
  useAutoSubmit(left, cut !== null && !busy, () => {
    if (cut !== null) onAnswer(cut);
  });
  return (
    <section aria-label="Your answer" className="grid gap-4">
      <Ask>{askFor("ribbon", scene)}</Ask>
      {timer}
      <RibbonStrip cut={cut} onCut={setCut} className="py-4" />
      <p className="m-0 text-center text-lg text-gm-text-muted">
        Tap the ribbon to put the scissors there. Tap again to move them.
      </p>
      <LockIn
        disabled={busy || cut === null}
        onLock={() => {
          if (cut !== null) onAnswer(cut);
        }}
      />
    </section>
  );
}

/** How long a flash stays lit on each beat. */
const FLASH_MS = 140;

/**
 * Lion Drum: the drum flashes for the shown beats, then goes dark; taps are
 * timed on this phone from the task's start and sent once the last beat to
 * keep has passed (S28-AC5).
 */
function DrumInput({
  scene,
  elapsed,
  clock,
  onAnswer,
}: Pick<StageProps, "elapsed" | "clock" | "onAnswer"> & { scene: DrumScene }) {
  const [taps, setTaps] = useState<number[]>([]);
  const sent = useRef(false);
  const showEnd = scene.shown * scene.intervalMs;
  const sendAt = (scene.shown + scene.keep - 1) * scene.intervalMs + scene.intervalMs * 0.6;
  const dark = elapsed >= showEnd - scene.intervalMs / 2;
  const lit = !dark && elapsed >= 0 && elapsed % scene.intervalMs < FLASH_MS;
  useEffect(() => {
    if (elapsed < sendAt || sent.current) return;
    sent.current = true;
    onAnswer(taps);
  }, [elapsed, sendAt, taps, onAnswer]);
  const kept = taps.filter((t) => t >= showEnd - scene.intervalMs / 2).length;
  return (
    <section aria-label="Your answer" className="grid justify-items-center gap-5">
      <Ask>{dark ? "Keep the beat!" : "Watch the beat…"}</Ask>
      <LionDrum
        lit={lit}
        className="w-[min(78vw,20rem)]"
        onTap={() => {
          if (sent.current) return;
          setTaps((t) => [...t, Math.max(0, Math.round(clock()))]);
        }}
      >
        {dark ? "Tap" : null}
      </LionDrum>
      {dark ? (
        <BeatPips
          total={scene.keep}
          done={Math.min(kept, scene.keep)}
          label={`${String(Math.min(kept, scene.keep))} of ${String(scene.keep)} beats tapped`}
        />
      ) : (
        <BeatPips
          total={scene.shown}
          done={Math.min(scene.shown, Math.floor(elapsed / scene.intervalMs) + 1)}
          label={`${String(scene.shown)} beats to watch`}
        />
      )}
      <p className="m-0 text-center text-lg text-gm-text-muted">
        {dark ? `Tap once per beat, ${String(scene.keep)} times.` : "Get ready to carry it on."}
      </p>
    </section>
  );
}

/** What the room watches on the TV, said on a captain's phone meanwhile. */
const WATCH: Record<string, string> = {
  snowpile: "Count the snowflakes.",
  sleighrun: "Watch where the sleigh is heading.",
  color: "Remember the color.",
};

/** The counting games' shows, on a solo phone (spec 30). */
function CountShow({ type, scene, elapsed }: { type: string; scene: unknown; elapsed: number }) {
  if (type === "flyby")
    return (
      <section aria-label="Count them" className="grid gap-4">
        <Ask>Count the presents!</Ask>
        <FlyingPresents fly={scene as Fly} elapsed={elapsed} className="h-64 text-2xl" />
      </section>
    );
  if (type === "snowsum") {
    const s = scene as { flakes: Flake[]; flakeMs: number };
    return (
      <section aria-label="Add them up" className="grid gap-2">
        <Ask>Start at 0 and keep the total!</Ask>
        <FallingFlakes flakes={s.flakes} flakeMs={s.flakeMs} elapsed={elapsed} size="phone" />
      </section>
    );
  }
  return null;
}

const COUNTS = ["flyby", "snowsum"];

/** A note in place of the show, when the room watches it on the TV. */
function WatchTv({ title, line }: { title: string; line: string }) {
  return (
    <div className="grid gap-2 py-6 text-center">
      <p className="m-0 font-gm-display text-3xl font-bold text-balance">{title}</p>
      <p className="m-0 text-lg text-pretty text-gm-text-muted">{line}</p>
    </div>
  );
}

export function PerceptionStage(props: StageProps) {
  const { type, scene, elapsed, clock, showMs, answerMs, busy, onAnswer, timer, showOn } = props;
  const showing = elapsed < showMs;
  // Time left to answer, so inputs send what they have as it runs out.
  const left = showMs + answerMs - elapsed;
  if (type === "liondrum" && scene)
    return (
      <DrumInput scene={scene as DrumScene} elapsed={elapsed} clock={clock} onAnswer={onAnswer} />
    );
  if (showing) {
    if (showOn === "tv")
      return <WatchTv title="Watch the TV!" line={WATCH[type] ?? "Watch closely."} />;
    if (COUNTS.includes(type) && scene)
      return <CountShow type={type} scene={scene} elapsed={elapsed} />;
    if (type === "snowpile" && scene)
      return (
        <section aria-label="Count them" className="grid gap-4">
          <Ask>Count the snowflakes!</Ask>
          <SnowField scene={scene as SnowScene} />
        </section>
      );
    if (type === "sleighrun" && scene)
      return (
        <section aria-label="Watch the sleigh" className="grid gap-4">
          <Ask>Watch the sleigh!</Ask>
          <SleighSky scene={scene as SleighScene} elapsed={elapsed} />
        </section>
      );
    return null;
  }
  if (type === "flyby") {
    // Which kind it asks about comes from the server once they've flown past.
    if (typeof scene !== "object" || scene === null || !("ask" in scene))
      return <WatchTv title="Get ready…" line="Here comes the question." />;
    return (
      <NumberEntry
        closesIn={left}
        prompt={<PresentAsk ask={(scene as { ask: number | null }).ask} size="phone" />}
        timer={timer}
        busy={busy}
        onLock={(n) => {
          onAnswer(n);
        }}
      />
    );
  }
  if (type === "snowpile" || type === "snowsum")
    return (
      <NumberEntry
        closesIn={left}
        prompt={askFor(type, scene)}
        timer={timer}
        busy={busy}
        max={type === "snowpile" ? 999 : 200}
        negative={type === "snowsum"}
        onLock={(n) => {
          onAnswer(n);
        }}
      />
    );
  if (type === "color")
    return (
      <section aria-label="Your answer" className="grid gap-4">
        <Ask>{askFor(type, scene)}</Ask>
        {timer}
        <ColorWheel busy={busy} onLock={onAnswer} closesIn={left} />
      </section>
    );
  if (!scene) return null;
  if (type === "staffangle")
    return (
      <AngleInput
        scene={scene as AngleScene}
        timer={timer}
        busy={busy}
        onAnswer={onAnswer}
        left={left}
      />
    );
  if (type === "sleighrun")
    return (
      <SleighInput
        scene={scene as SleighScene}
        elapsed={elapsed}
        timer={timer}
        busy={busy}
        onAnswer={onAnswer}
        left={left}
      />
    );
  return (
    <RibbonInput
      scene={scene as RibbonScene}
      timer={timer}
      busy={busy}
      onAnswer={onAnswer}
      left={left}
    />
  );
}
