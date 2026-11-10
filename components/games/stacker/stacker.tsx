"use client";

import { useEffect, useRef, useState } from "react";
import { barStart, START_LENGTH, trim, type Bar, type StackerView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

/** Where a tap doesn't stop the bar: links, the header, the tab bar and dialogs. */
const LEAVE_ALONE = "a, header, nav, [role='dialog']";

type Run = { placed: Bar[]; length: number; rowStart: number; over: boolean };

/** Stack Attack (spec 16): the phone runs the arcade game and sends the rows stacked. */
export function StackerGame({ view: raw, onMove }: GameRendererProps) {
  const view = raw as StackerView;
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(0);
  const move = useRef(onMove);
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);
  const running = view.kind === "running";
  const kind = view.kind;

  // A play made before auto-start still waits on Start: send it for them.
  useEffect(() => {
    if (kind === "ready") move.current({ type: "start" });
  }, [kind]);

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

  const width = view.kind === "done" ? 0 : view.width;
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

  // A tap anywhere on the screen stops the bar (Khai, 2026-11-10), except on
  // links, the header and the tab bar, which still take you places.
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => {
    if (!running) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest(LEAVE_ALONE)) return;
      stopRef.current();
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
    };
  }, [running]);

  const cellOf = (r: number, c: number) => {
    const bar = r < row ? current.placed[r] : r === row && !current.over ? sliding : null;
    return bar !== null && bar !== undefined && c >= bar.start && c < bar.start + bar.length;
  };

  if (view.kind === "done") return null;
  return (
    <section aria-label="Stack Attack" className="grid gap-4 text-center">
      <p className="m-0 font-gm-display text-2xl font-bold" aria-live="polite">
        {`${String(row)} of ${String(rows)} rows`}
      </p>
      <button
        type="button"
        disabled={!running || current.over}
        onPointerDown={(e) => {
          e.preventDefault();
        }}
        onClick={(e) => {
          // Keyboard presses arrive as clicks with no pointer; taps go through the screen-wide listener.
          if (e.detail === 0) stop();
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
    </section>
  );
}

export function stackerSummary(raw: unknown): string | null {
  const view = raw as StackerView;
  return view.kind === "done" ? `${String(view.stacked)} of ${String(view.rows)} rows` : null;
}
