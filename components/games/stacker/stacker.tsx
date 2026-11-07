"use client";

import { useEffect, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { barStart, START_LENGTH, trim, type Bar, type StackerView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

type Run = { placed: Bar[]; length: number; rowStart: number; over: boolean };

/** Stack Attack (spec 16): the phone runs the arcade game and sends the rows stacked. */
export function StackerGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as StackerView;
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(0);
  const move = useRef(onMove);
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);
  const running = view.kind === "running";

  useEffect(() => {
    if (!running || run?.over) return;
    // A run resumed after a reload starts its bars afresh.
    if (!run)
      setRun({ placed: [], length: START_LENGTH, rowStart: performance.now(), over: false });
    let frame = requestAnimationFrame(function tick() {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running, run]);

  if (view.kind === "done") return null;
  const width = view.width;
  const rows = view.rows;
  const current = run ?? { placed: [], length: START_LENGTH, rowStart: now, over: false };
  const row = current.placed.length;
  const sliding: Bar = {
    start: barStart(width, current.length, row, Math.max(0, now - current.rowStart)),
    length: current.length,
  };

  const stop = () => {
    if (!running || current.over) return;
    const kept = trim(current.placed[row - 1] ?? null, sliding);
    const placed = kept ? [...current.placed, kept] : current.placed;
    const over = !kept || placed.length >= rows;
    setRun({ placed, length: kept?.length ?? 0, rowStart: performance.now(), over });
    if (over) move.current({ type: "finish", rows: placed.length });
  };

  const cellOf = (r: number, c: number) => {
    const bar = r < row ? current.placed[r] : r === row && !current.over ? sliding : null;
    return bar !== null && bar !== undefined && c >= bar.start && c < bar.start + bar.length;
  };

  return (
    <section aria-label="Stack Attack" className="grid gap-4 text-center">
      <p className="m-0 font-gm-display text-2xl font-bold" aria-live="polite">
        {running ? `${String(row)} of ${String(rows)} rows` : `Stack up to ${String(rows)} rows`}
      </p>
      <button
        type="button"
        disabled={!running || current.over}
        onPointerDown={(e) => {
          e.preventDefault();
          stop();
        }}
        aria-label="Stop the bar"
        className="mx-auto grid h-[min(58dvh,36rem)] max-w-full touch-none gap-1 rounded-gm bg-gm-surface p-2 ring-1 ring-gm-border select-none"
        style={{
          gridTemplateRows: `repeat(${String(rows)}, minmax(0, 1fr))`,
          aspectRatio: `${String(width)} / ${String(rows)}`,
        }}
      >
        {Array.from({ length: rows }, (_, i) => rows - 1 - i).map((r) => (
          <span
            key={r}
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${String(width)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: width }, (_, c) => (
              <i
                key={c}
                className={cx(
                  "rounded-[3px]",
                  cellOf(r, c) ? (r === row ? "bg-gm-accent" : "bg-gm-tile-correct") : "bg-gm-bg",
                )}
              />
            ))}
          </span>
        ))}
      </button>
      {view.kind === "ready" && (
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            setRun({ placed: [], length: START_LENGTH, rowStart: performance.now(), over: false });
            onMove({ type: "start" });
          }}
        >
          Start
        </Button>
      )}
    </section>
  );
}

export function stackerSummary(raw: unknown): string | null {
  const view = raw as StackerView;
  return view.kind === "done" ? `${String(view.stacked)} of ${String(view.rows)} rows` : null;
}
