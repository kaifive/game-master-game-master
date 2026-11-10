"use client";

import { useEffect, useRef, useState } from "react";
import type { TimerView } from "@/lib/games";
import type { GameRendererProps } from "../types";

const fmt = (ms: number) => (ms / 1000).toFixed(2);

/** T-Timer (spec 16): the phone times the run; the clock hides after a few seconds. */
export function TimerGame({ view: raw, onMove, busy }: GameRendererProps) {
  const view = raw as TimerView;
  const start = useRef<number | null>(null);
  const [now, setNow] = useState(0);
  const running = view.kind === "running";
  const resumedAt = running ? view.elapsedMs : 0;

  useEffect(() => {
    if (!running) return;
    // A resumed run picks up from the server's count; a fresh one from the tap.
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
  const elapsed = start.current === null ? 0 : Math.max(0, now - start.current);
  const shown = view.kind === "running" && elapsed < view.visibleSeconds * 1000;

  const ready = view.kind === "ready";
  return (
    <section aria-label="T-Timer" className="grid justify-items-center gap-8 py-6 text-center">
      <p
        aria-live="off"
        className="m-0 font-gm-display text-8xl font-bold tabular-nums"
        data-testid="timer-clock"
      >
        {ready ? "0.00" : shown ? fmt(elapsed) : "?.??"}
      </p>
      {/* A stopwatch button: one big round target, Start then Stop. */}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (ready) {
            start.current = performance.now();
            setNow(start.current);
            onMove({ type: "start" });
            return;
          }
          const ms = start.current === null ? 0 : performance.now() - start.current;
          onMove({ type: "stop", elapsedMs: Math.round(ms) });
        }}
        className={`grid size-56 touch-manipulation place-items-center rounded-full border-8 font-gm-display text-5xl font-bold uppercase shadow-xl select-none motion-safe:active:scale-95 ${
          ready
            ? "border-[color-mix(in_srgb,var(--gm-text)_25%,transparent)] bg-gm-surface-raised text-gm-text"
            : "border-[color-mix(in_srgb,black_25%,var(--gm-accent))] bg-gm-accent text-gm-text-on-accent"
        }`}
      >
        {ready ? "Start" : "Stop"}
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
