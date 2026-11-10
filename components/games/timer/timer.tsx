"use client";

import { useEffect, useRef, useState } from "react";
import type { TimerView } from "@/lib/games";
import type { GameRendererProps } from "../types";

const fmt = (ms: number) => (ms / 1000).toFixed(2);

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
  const visible = view.kind === "running" && elapsed < view.visibleSeconds * 1000;

  // Stop on the press itself, not the release, and freeze at once: no wait for the server.
  const stop = () => {
    if (stoppedAt !== null || start.current === null) return;
    const t = performance.now();
    setStoppedAt(t);
    move.current({ type: "stop", elapsedMs: Math.round(t - start.current) });
  };

  return (
    <section aria-label="T-Timer" className="grid justify-items-center gap-8 py-6 text-center">
      <p
        aria-live="off"
        className="m-0 font-gm-display text-8xl font-bold tabular-nums"
        data-testid="timer-clock"
      >
        {stoppedAt !== null ? fmt(elapsed) : visible ? fmt(elapsed) : "?.??"}
      </p>
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
  return `${fmt(view.elapsedMs)} s · ${fmt(view.offMs)} s off`;
}
