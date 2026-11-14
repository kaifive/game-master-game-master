"use client";

import { useEffect, useRef, useState } from "react";
import { offWindow, type TimerView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

/** A time cut to the hundredth, as a stopwatch shows it. */
const toHundredths = (ms: number) => Math.floor(ms / 10) * 10;
const fmt = (ms: number) => (toHundredths(ms) / 1000).toFixed(2);

/** T-Timer (spec 16): the clock starts with the game; the phone times the run. */
export function TimerGame({ view: raw, onMove }: GameRendererProps) {
  const view = raw as TimerView;
  const start = useRef<number | null>(null);
  const [now, setNow] = useState(0);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const move = useRef(onMove);
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);
  const kind = view.kind;
  const running = kind === "running" && stoppedAt === null;
  const resumedAt = view.kind === "running" ? view.elapsedMs : 0;

  // A play made before auto-start still waits on Start: send it for them.
  useEffect(() => {
    if (kind === "ready") move.current({ type: "start" });
  }, [kind]);

  useEffect(() => {
    if (!running) return;
    // The server counts from when the play opened; pick up from its count.
    start.current ??= performance.now() - resumedAt;
    let frame = requestAnimationFrame(function tick() {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running, resumedAt]);

  if (view.kind === "done") return null;
  const end = stoppedAt ?? now;
  const elapsed = start.current === null ? 0 : Math.max(0, end - start.current);
  // Judged on what the clock shows (hundredths), as the server judges the phone's time.
  const shown = toHundredths(elapsed);
  const inWindow =
    stoppedAt !== null && offWindow(shown, view.fromSeconds * 1000, view.toSeconds * 1000) === 0;

  // Stop on the press itself, not the release, and freeze at once: no wait for the server.
  const stop = () => {
    if (stoppedAt !== null || start.current === null) return;
    const t = performance.now();
    setStoppedAt(t);
    // Send the time the clock shows, so what the player sees is what's judged.
    move.current({ type: "stop", elapsedMs: toHundredths(t - start.current) });
  };

  return (
    <section aria-label="T-Timer" className="grid justify-items-center gap-8 py-6 text-center">
      <div className="grid justify-items-center gap-3">
        <p
          aria-live="off"
          className={cx(
            "m-0 font-gm-display text-8xl font-bold tabular-nums transition-colors motion-reduce:transition-none",
            inWindow && "text-gm-success",
          )}
          data-testid="timer-clock"
        >
          {fmt(shown)}
        </p>
        {/* The window to stop in, always in view next to the clock. */}
        <p className="m-0 flex items-baseline gap-2 rounded-full bg-gm-surface-raised px-4 py-1.5 ring-1 ring-gm-border">
          <span className="text-sm font-bold tracking-wide text-gm-text-muted uppercase">
            Target
          </span>
          <span className="font-gm-display text-2xl font-bold text-gm-tile-correct tabular-nums">
            {fmt(view.fromSeconds * 1000)} – {fmt(view.toSeconds * 1000)}
          </span>
        </p>
      </div>
      {/* A stopwatch button: one big round target. */}
      <button
        type="button"
        disabled={kind !== "running" || stoppedAt !== null}
        onPointerDown={(e) => {
          e.preventDefault();
          stop();
        }}
        onClick={(e) => {
          // Keyboard presses arrive as clicks with no pointer.
          if (e.detail === 0) stop();
        }}
        className="grid size-56 touch-manipulation place-items-center rounded-full border-8 border-[color-mix(in_srgb,black_25%,var(--gm-accent))] bg-gm-accent font-gm-display text-5xl font-bold text-gm-text-on-accent uppercase shadow-xl select-none disabled:opacity-60 motion-safe:active:scale-95"
      >
        Stop
      </button>
    </section>
  );
}

export function timerSummary(raw: unknown): string | null {
  const view = raw as TimerView;
  if (view.kind !== "done") return null;
  if (view.elapsedMs === null || view.offMs === null) return "The clock ran out";
  const at = `Stopped at ${fmt(view.elapsedMs)}`;
  if (view.offMs === 0) return `${at} · in the window!`;
  const early = view.elapsedMs < view.fromSeconds * 1000;
  return `${at} · ${fmt(view.offMs)} s ${early ? "early" : "late"}`;
}
