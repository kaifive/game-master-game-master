"use client";

import { useEffect, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { TimerView } from "@/lib/games";
import type { GameRendererProps } from "../types";

const fmt = (ms: number) => (ms / 1000).toFixed(2);

/** T-Timer (spec 16): the phone times the run; the clock hides after a few seconds. */
export function TimerGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
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

  return (
    <section aria-label="T-Timer" className="grid justify-items-center gap-6 py-6 text-center">
      <p className="m-0 text-lg">
        Stop at exactly <strong className="font-gm-display text-2xl">{view.targetSeconds} s</strong>
      </p>
      <p
        aria-live="off"
        className="m-0 font-gm-display text-8xl font-bold tabular-nums"
        data-testid="timer-clock"
      >
        {view.kind === "ready" ? "0.00" : shown ? fmt(elapsed) : "?.??"}
      </p>
      <p className="m-0 min-h-7 text-lg text-gm-text-muted">
        {view.kind === "running" && !shown ? "Keep counting in your head…" : " "}
      </p>
      {view.kind === "ready" ? (
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            start.current = performance.now();
            setNow(start.current);
            onMove({ type: "start" });
          }}
        >
          Start
        </Button>
      ) : (
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            const ms = start.current === null ? 0 : performance.now() - start.current;
            onMove({ type: "stop", elapsedMs: Math.round(ms) });
          }}
        >
          Stop
        </Button>
      )}
    </section>
  );
}

export function timerSummary(raw: unknown): string | null {
  const view = raw as TimerView;
  if (view.kind !== "done") return null;
  if (view.elapsedMs === null || view.offMs === null) return "The clock ran out";
  return `${fmt(view.elapsedMs)} s · ${fmt(view.offMs)} s off`;
}
