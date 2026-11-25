"use client";

import { useState, type ReactNode } from "react";
import { FlyingPresents, PresentAsk, type Fly } from "@/components/live/games/flyby";
import { FallingFlakes } from "@/components/live/games/snowsum";
import type { Flake } from "@/lib/games";
import { useAutoSubmit } from "../auto-submit";
import { NumberEntry, SendsAtTheEnd } from "../number-entry";
import { RibbonStrip, StaffDial, type AngleScene, type RibbonScene } from "./scenes";

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
  showMs: number;
  answerMs: number;
  onAnswer: (answer: unknown) => void;
  busy: boolean;
  /** The answer timer. */
  timer: ReactNode;
  /** In a showdown the room watches the show on the TV; the phone says so. */
  showOn: "phone" | "tv";
  /** A showdown answer already sent, so a reloaded phone starts from it. */
  initial?: unknown;
  /** Each change as it's made: a showdown phone sends it, and the last one counts. */
  onDraft?: (answer: unknown) => void;
};

/** The words a task asks with. */
export function askFor(type: string, scene: unknown): string {
  if (type === "staffangle") {
    const target = (scene as AngleScene | null)?.target;
    return target === undefined ? "Set the staff" : `Set the staff at ${String(target)}°`;
  }
  if (type === "flyby") return "How many presents?";
  if (type === "snowsum") return "What's the total?";
  const label = (scene as RibbonScene | null)?.label;
  return label === undefined ? "Cut the ribbon" : `Cut it ${label} along`;
}

/** What the TV says before the shared start. */
export function getReadyLine(type: string): string {
  if (type === "staffangle") return "Get your eye in!";
  return "Scissors ready!";
}

/** Solo's Lock in; a showdown phone has none and sends as the time runs out. */
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

/** What every input gets besides its scene: the time left, for sending as it runs out. */
type InputProps = Pick<StageProps, "timer" | "busy" | "onAnswer"> & {
  onDraft: StageProps["onDraft"] | undefined;
  left: number;
  lockButton: boolean;
  initial: number | null;
};

/** Lock in, solo; on a showdown phone, a line saying it goes in at the end. */
function Send({
  lockButton,
  disabled,
  onLock,
}: {
  lockButton: boolean;
  disabled: boolean;
  onLock: () => void;
}) {
  return lockButton ? <LockIn disabled={disabled} onLock={onLock} /> : <SendsAtTheEnd />;
}

/** The staff is dragged round by hand: no buttons to step it to the answer (Khai, 2026-11-24). */
function AngleInput({
  scene,
  timer,
  busy,
  onAnswer,
  left,
  lockButton,
  initial,
  onDraft,
}: InputProps & { scene: AngleScene }) {
  // The staff starts lying flat, so no angle is handed over for free.
  const [angle, setAngleNow] = useState(initial ?? 0);
  const [touched, setTouched] = useState(initial !== null);
  const setAngle = (a: number) => {
    setAngleNow(a);
    setTouched(true);
    onDraft?.(a);
  };
  // A staff that's been turned is sent as the time runs out (Khai, 2026-11-24).
  useAutoSubmit(left, touched && !busy, () => {
    onAnswer(angle);
  });
  return (
    <section aria-label="Your answer" className="grid gap-4">
      <Ask>{askFor("staffangle", scene)}</Ask>
      {timer}
      <StaffDial angle={angle} onAngle={setAngle} max={scene.max ?? 180} />
      <Send
        lockButton={lockButton}
        disabled={busy}
        onLock={() => {
          onAnswer(angle);
        }}
      />
    </section>
  );
}

function RibbonInput({
  scene,
  timer,
  busy,
  onAnswer,
  left,
  lockButton,
  initial,
  onDraft,
}: InputProps & { scene: RibbonScene }) {
  const [cut, setCutNow] = useState<number | null>(initial);
  const setCut = (c: number) => {
    setCutNow(c);
    onDraft?.(c);
  };
  useAutoSubmit(left, cut !== null && !busy, () => {
    if (cut !== null) onAnswer(cut);
  });
  return (
    <section aria-label="Your answer" className="grid gap-4">
      <Ask>{askFor("ribbon", scene)}</Ask>
      {timer}
      <RibbonStrip cut={cut} onCut={setCut} className="py-4" />
      <p className="m-0 text-center text-lg text-gm-text-muted">
        Tap where to cut. Tap again to move.
      </p>
      <Send
        lockButton={lockButton}
        disabled={busy || cut === null}
        onLock={() => {
          if (cut !== null) onAnswer(cut);
        }}
      />
    </section>
  );
}

/** The counting games' shows, on a solo phone (spec 30). */
function CountShow({ type, scene, elapsed }: { type: string; scene: unknown; elapsed: number }) {
  if (type === "flyby")
    return (
      <section aria-label="Count them" className="grid gap-4">
        <Ask>Count the presents!</Ask>
        <FlyingPresents fly={scene as Fly} elapsed={elapsed} className="h-64 text-2xl" />
      </section>
    );
  const s = scene as { flakes: Flake[]; flakeMs: number };
  return (
    <section aria-label="Add them up" className="grid gap-2">
      <FallingFlakes flakes={s.flakes} flakeMs={s.flakeMs} elapsed={elapsed} size="phone" />
    </section>
  );
}

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
  const { type, scene, elapsed, showMs, answerMs, busy, onAnswer, timer, showOn, onDraft } = props;
  const initial = typeof props.initial === "number" ? props.initial : null;
  const showing = elapsed < showMs;
  // Time left to answer, so inputs send what they have as it runs out.
  const left = showMs + answerMs - elapsed;
  // Solo locks in; a showdown phone sends at the end (Khai, 2026-11-24).
  const lockButton = showOn === "phone";
  if (showing) {
    if (showOn === "tv") return <WatchTv title="Watch the TV!" line="Watch closely." />;
    return scene ? <CountShow type={type} scene={scene} elapsed={elapsed} /> : null;
  }
  if (type === "flyby" || type === "snowsum") {
    // Which kind Fly-by asks about comes from the server once they've flown past.
    if (type === "flyby" && (typeof scene !== "object" || scene === null || !("ask" in scene)))
      return <WatchTv title="Get ready…" line="Here comes the question." />;
    return (
      <NumberEntry
        closesIn={left}
        prompt={
          type === "flyby" ? (
            <PresentAsk ask={(scene as { ask: number | null }).ask} size="phone" />
          ) : (
            askFor(type, scene)
          )
        }
        timer={timer}
        busy={busy}
        max={type === "snowsum" ? 200 : 99}
        negative={type === "snowsum"}
        lockButton={lockButton}
        onLock={(n) => {
          onAnswer(n);
        }}
      />
    );
  }
  if (!scene) return null;
  const input = { timer, busy, onAnswer, left, lockButton, initial, onDraft };
  if (type === "staffangle") return <AngleInput scene={scene as AngleScene} {...input} />;
  return <RibbonInput scene={scene as RibbonScene} {...input} />;
}
