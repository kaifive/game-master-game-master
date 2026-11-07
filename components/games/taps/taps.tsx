"use client";

import { useEffect, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { TapsView } from "@/lib/games";
import type { GameRendererProps } from "../types";

/** Tap Masher (spec 16): a countdown, then as many taps as you can. */
export function TapsGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as TapsView;
  const goAt = useRef<number | null>(null);
  const count = useRef(0);
  const sent = useRef(false);
  const [now, setNow] = useState(0);
  const [taps, setTaps] = useState(0);
  const move = useRef(onMove);
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);
  const running = view.kind === "running";
  const goIn = running ? view.goInMs : 0;
  const seconds = view.kind === "running" ? view.seconds : 0;

  useEffect(() => {
    if (!running) return;
    goAt.current ??= performance.now() + goIn;
    let frame = requestAnimationFrame(function tick() {
      const t = performance.now();
      setNow(t);
      if (goAt.current !== null && t >= goAt.current + seconds * 1000 && !sent.current) {
        sent.current = true;
        move.current({ type: "finish", taps: count.current });
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running, goIn, seconds]);

  if (view.kind === "done") return null;
  if (view.kind === "ready")
    return (
      <section aria-label="Tap Masher" className="grid justify-items-center gap-6 py-6 text-center">
        <p className="m-0 text-lg">
          {view.seconds} seconds. {view.target} taps scores all the points.
        </p>
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            onMove({ type: "start" });
          }}
        >
          Start
        </Button>
      </section>
    );

  const toGo = goAt.current === null ? view.goInMs : goAt.current - now;
  const tapping = toGo <= 0 && !sent.current;
  const left = Math.max(0, view.seconds * 1000 + toGo);
  return (
    <section aria-label="Tap Masher" className="grid gap-4 text-center">
      <p className="m-0 font-gm-display text-2xl font-bold" aria-live="polite">
        {toGo > 0
          ? `Get ready… ${String(Math.ceil(toGo / 1000))}`
          : sent.current
            ? "Time!"
            : `${(left / 1000).toFixed(1)} s`}
      </p>
      <button
        type="button"
        disabled={!tapping}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!tapping) return;
          count.current += 1;
          setTaps(count.current);
        }}
        className="grid aspect-square w-full touch-none place-items-center rounded-gm bg-gm-accent font-gm-display text-8xl font-bold text-gm-text-on-accent select-none disabled:opacity-50"
        aria-label={`Tap! ${String(taps)} taps`}
      >
        {taps}
      </button>
    </section>
  );
}

export function tapsSummary(raw: unknown): string | null {
  const view = raw as TapsView;
  return view.kind === "done" ? `${String(view.taps)} taps` : null;
}
