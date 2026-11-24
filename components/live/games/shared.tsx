"use client";

import { useState, type ReactNode } from "react";
import { NumberEntry } from "@/components/games/number-entry";
import { CheckIcon } from "@/components/icons/game";
import { useSlots } from "@/components/slots/registry";
import type { WindowView } from "@/lib/live";
import { cx } from "@/lib/ui";
import type { ActiveLiveView } from "../types";
import { useFrame } from "../use-live";

/**
 * Pieces every spec 25 showdown shares: the server clock ticking on screen,
 * the "get ready" count before a shared start, who has locked in, the reveal
 * held up as judges' score cards, a number pad and a big Stop button.
 */

/** The server's time, re-read every frame while `on` (S11-AC5). */
export function useServerTime(serverNow: () => number, on = true) {
  useFrame(on);
  return serverNow();
}

/** A team's square swatch beside its name: color is never the only signal. */
export const Swatch = ({ color, size = "1em" }: { color: number; size?: string }) => (
  <span
    aria-hidden="true"
    className="inline-block shrink-0 rounded-[3px]"
    style={{ width: size, height: size, background: `var(--gm-team-${String(color)})` }}
  />
);

/** The seconds until a shared start, as the room counts it: 3, 2, 1. */
export function GetReady({ startsAt, now, line }: { startsAt: number; now: number; line: string }) {
  const left = Math.max(1, Math.ceil((startsAt - now) / 1000));
  return (
    <div className="grid justify-items-center gap-[2vh] py-[6vh] text-center">
      <p className="m-0 font-gm-display text-[clamp(1.6rem,4.5vh,3.2rem)] font-bold">{line}</p>
      <p
        key={left}
        aria-live="off"
        className="m-0 font-gm-display text-[clamp(6rem,30vh,20rem)] leading-none font-bold text-gm-accent-ink tabular-nums motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)]"
      >
        {left}
      </p>
    </div>
  );
}

/** Seconds left to answer, as a draining bar and a number. */
export function TimeLeft({
  closesAt,
  now,
  total,
}: {
  closesAt: number;
  now: number;
  total: number;
}) {
  const left = Math.max(0, closesAt - now);
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-3"
      aria-label={`${String(Math.ceil(left / 1000))} seconds left`}
    >
      <div className="h-[1.2vh] min-h-2 overflow-hidden rounded-full bg-gm-tile-absent">
        <div
          className="h-full origin-left bg-gm-tile-correct"
          style={{ transform: `scaleX(${String(Math.min(1, left / total))})` }}
        />
      </div>
      <span
        aria-hidden="true"
        className="min-w-[2.5ch] text-right font-gm-display text-[clamp(1.1rem,3vh,2.2rem)] font-bold tabular-nums"
      >
        {Math.ceil(left / 1000)}
      </span>
    </div>
  );
}

/** Who has locked in, without what they said (S24-AC7). */
export function LockedIn({ view, locked }: { view: ActiveLiveView; locked: readonly string[] }) {
  return (
    <ul aria-label="Locked in" className="m-0 grid list-none grid-cols-3 gap-[1.4vh] p-0">
      {view.teams.map((t) => {
        const done = locked.includes(t.id);
        return (
          <li
            key={t.id}
            className={cx(
              "flex items-center gap-3 rounded-gm px-4 py-[1.2vh] ring-1",
              done ? "bg-gm-surface-raised ring-gm-tile-correct" : "bg-gm-surface ring-gm-border",
            )}
          >
            <Swatch color={t.color} />
            <span className="min-w-0 flex-1 truncate text-[clamp(1rem,2.6vh,1.9rem)] font-bold">
              {t.name}
            </span>
            <span
              className={cx(
                "flex items-center gap-1 text-[clamp(0.9rem,2.2vh,1.6rem)] font-bold",
                done ? "text-gm-tile-correct" : "text-gm-text-muted",
              )}
            >
              {done ? (
                <>
                  <CheckIcon size={22} /> In
                </>
              ) : (
                "Thinking"
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The reveal: every team's answer under its name, its points held up on a
 * score card, best first. `answer` is what to print for a team (or null for
 * no answer); `note` an optional line under it.
 */
export function Reveal({
  view,
  answer,
  note,
}: {
  view: ActiveLiveView;
  /** What a team answered; leave out for games with no one answer per team. */
  answer?: (teamId: string) => string | null;
  note?: (teamId: string) => string | null;
}) {
  const { ScoreCard } = useSlots();
  const ranked = [...view.teams].sort((a, b) => (b.roundPoints ?? 0) - (a.roundPoints ?? 0));
  return (
    <ol
      aria-label="Answers"
      className="m-0 grid list-none gap-[1.6vh] p-0"
      style={{
        gridTemplateColumns: `repeat(${String(Math.max(1, ranked.length))}, minmax(0, 1fr))`,
      }}
    >
      {ranked.map((t) => {
        const said = answer ? answer(t.id) : undefined;
        const extra = note?.(t.id) ?? null;
        return (
          <li
            key={t.id}
            className="grid content-start justify-items-center gap-[1.2vh] rounded-gm bg-gm-surface px-3 py-[2.4vh] text-center ring-1 ring-gm-border"
          >
            <span className="flex max-w-full items-center gap-2 text-[clamp(1rem,2.6vh,1.9rem)] font-bold">
              <Swatch color={t.color} />
              <span className="truncate">{t.name}</span>
            </span>
            {said !== undefined && (
              <span
                className={cx(
                  "font-gm-display leading-none font-bold tabular-nums",
                  said === null
                    ? "py-[1vh] text-[clamp(1.2rem,3.4vh,2.4rem)] text-gm-text-muted"
                    : "text-[clamp(2.4rem,8.5vh,6rem)]",
                )}
              >
                {said ?? "No answer"}
              </span>
            )}
            {extra && (
              <span className="text-[clamp(0.9rem,2.2vh,1.6rem)] text-gm-text-muted">{extra}</span>
            )}
            <ScoreCard
              label={`${t.name} this round`}
              value={t.roundPoints ?? 0}
              state="scored"
              size="lg"
              fresh
            />
            <span className="text-[clamp(0.9rem,2.2vh,1.6rem)] font-bold text-gm-text-muted tabular-nums">
              This showdown: {t.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The phone's word for where things stand, big and centered. */
export function PhoneNote({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid gap-2 py-6 text-center">
      <p className="m-0 font-gm-display text-3xl font-bold text-balance">{title}</p>
      {children && <div className="text-lg text-pretty text-gm-text-muted">{children}</div>}
    </div>
  );
}

/** What a captain's phone shows once the reveal is on the TV. */
export function PhoneResult({ view }: { view: ActiveLiveView }) {
  const mine = view.teams.find((t) => t.id === view.you?.teamId);
  return (
    <PhoneNote title="Look at the TV!">
      {mine && (
        <span className="font-gm-display text-2xl font-bold text-gm-text">
          +{mine.roundPoints ?? 0} this round
        </span>
      )}
    </PhoneNote>
  );
}

/**
 * The number pad for the counting showdowns: a white card shows the number
 * as it's typed; Lock in sends it, once. `negative` adds a minus key.
 */
export function NumberPad({
  prompt,
  window: w,
  now,
  send,
  busy,
  negative = false,
  max = 99,
}: {
  prompt: ReactNode;
  window: WindowView;
  now: number;
  send: (move: unknown) => Promise<void>;
  busy: boolean;
  negative?: boolean;
  max?: number;
}) {
  if (w.mine !== null)
    return (
      <PhoneNote title={`Locked in: ${String(w.mine)}`}>Now watch the TV for the answer.</PhoneNote>
    );
  if (now > w.closesAt)
    return <PhoneNote title="Time's up">Watch the TV for the answer.</PhoneNote>;
  return (
    <NumberEntry
      prompt={prompt}
      closesIn={w.closesAt - now}
      timer={<TimeLeft closesAt={w.closesAt} now={now} total={w.closesAt - w.showEndsAt} />}
      busy={busy}
      negative={negative}
      max={max}
      onLock={(value) => void send({ answer: value })}
    />
  );
}

/**
 * One huge Stop button. The phone times the stop from the shared start, on
 * the server's clock, at the moment of the press (spec 25).
 */
export function StopButton({
  startsAt,
  serverNow,
  send,
  label = "Stop",
}: {
  startsAt: number;
  serverNow: () => number;
  send: (move: unknown) => Promise<void>;
  label?: string;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      disabled={pressed}
      onPointerDown={() => {
        if (pressed) return;
        setPressed(true);
        void send({ elapsedMs: Math.max(0, Math.round(serverNow() - startsAt)) });
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !pressed) {
          e.preventDefault();
          setPressed(true);
          void send({ elapsedMs: Math.max(0, Math.round(serverNow() - startsAt)) });
        }
      }}
      className="mx-auto grid aspect-square w-[min(78vw,20rem)] touch-none place-items-center rounded-full bg-gm-buzzer font-gm-display text-6xl font-bold text-gm-buzzer-ink shadow-xl select-none disabled:bg-gm-buzzer-locked motion-safe:active:scale-[0.97]"
    >
      {label}
    </button>
  );
}

/** Whose turn it is, on the TV: the team, big, and the time it has left. */
export function TurnBanner({
  view,
  team,
  endsAt,
  total,
  now,
  doing,
}: {
  view: ActiveLiveView;
  team: string | null;
  endsAt: number;
  total: number;
  now: number;
  /** What the team is doing, after its name: "is up", "is crossing". */
  doing: string;
}) {
  const t = view.teams.find((x) => x.id === team);
  if (!t) return null;
  return (
    <div className="grid gap-[1.2vh]">
      <p className="m-0 flex items-center justify-center gap-[0.4em] font-gm-display text-[clamp(1.8rem,5vh,3.8rem)] font-bold">
        <Swatch color={t.color} />
        <span>
          {t.name} {doing}
        </span>
      </p>
      <TimeLeft closesAt={endsAt} now={now} total={total} />
    </div>
  );
}
