"use client";

import { useEffect, useRef, useState } from "react";
import { barStart, START_LENGTH, trim, type Bar, type StackerView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

/** Where a tap doesn't stop the bar: links, the header, the tab bar and dialogs. */
const LEAVE_ALONE = "a, header, nav, [role='dialog']";

type Run = { placed: Bar[]; length: number; rowStart: number; over: boolean };

export type PresentSize = "large" | "medium" | "small";

/** Which present a bar is, by how many squares wide it is: trimming makes it the next size down. */
export const presentFor = (length: number): PresentSize =>
  length >= 3 ? "large" : length === 2 ? "medium" : "small";

/**
 * Each size has its own paper, ribbon and bow, drawn from the event's colors
 * (`paper` is the box's fill: a pattern over a base color).
 */
const PRESENT: Record<PresentSize, { paper: string; ribbon: string; bow: string }> = {
  // Red with soft diagonal stripes, gold ribbon.
  large: {
    paper:
      "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.13) 0 4px, transparent 4px 11px), var(--gm-accent)",
    ribbon: "var(--gm-tile-correct)",
    bow: "var(--gm-tile-correct)",
  },
  // Green with white polka dots, white ribbon.
  medium: {
    paper:
      "radial-gradient(circle, rgb(255 255 255 / 0.55) 0 1.6px, transparent 2.2px) 0 0 / 9px 9px, var(--gm-success)",
    ribbon: "rgb(255 255 255 / 0.92)",
    bow: "#ffffff",
  },
  // A gold cube, red ribbon both ways.
  small: {
    paper: "linear-gradient(rgb(255 255 255 / 0.18), transparent 45%), var(--gm-tile-correct)",
    ribbon: "var(--gm-accent)",
    bow: "var(--gm-accent)",
  },
};

/** Two loops and a knot, sat on the box's lid. */
function Bow({ color }: { color: string }) {
  return (
    <svg
      data-bow
      viewBox="0 0 40 22"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[calc(100%-5px)] left-1/2 h-[55%] max-h-6 min-h-3 -translate-x-1/2 overflow-visible drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]"
    >
      <path d="M20 15 C12 2, 2 4, 5 12 C7 18, 15 17, 20 15 Z" fill={color} />
      <path d="M20 15 C28 2, 38 4, 35 12 C33 18, 25 17, 20 15 Z" fill={color} />
      <path d="M18 16 L13 22 M22 16 L27 22" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="15" r="3.6" fill={color} stroke="rgb(0 0 0 / 0.25)" strokeWidth="1" />
    </svg>
  );
}

/** A wrapped present filling its bar's squares: paper, a lid, a ribbon, and a bow on the top box. */
function Present({ bar, moving, bow }: { bar: Bar; moving: boolean; bow: boolean }) {
  const size = presentFor(bar.length);
  const look = PRESENT[size];
  return (
    <span
      data-present={size}
      aria-hidden="true"
      className={cx(
        "relative rounded-[4px]",
        moving
          ? "z-10 shadow-[0_6px_10px_rgb(0_0_0/0.45)] ring-2 ring-white/70"
          : "shadow-[inset_0_-3px_0_rgb(0_0_0/0.22)]",
      )}
      style={{
        gridColumn: `${String(bar.start + 1)} / span ${String(bar.length)}`,
        gridRow: "1",
        background: look.paper,
      }}
    >
      {/* The lid: a darker band across the top. */}
      <span className="absolute inset-x-0 top-0 h-[22%] rounded-t-[4px] bg-black/20" />
      {/* Ribbon down the middle and, on the large and small boxes, round the sides too. */}
      <span
        className="absolute inset-y-0 left-1/2 -translate-x-1/2"
        style={{ width: size === "large" ? "9%" : "14%", minWidth: 4, background: look.ribbon }}
      />
      {size !== "medium" && (
        <span
          className="absolute inset-x-0 top-[58%] h-[16%] -translate-y-1/2"
          style={{ background: look.ribbon }}
        />
      )}
      {bow && <Bow color={look.bow} />}
    </span>
  );
}

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

  const barOf = (r: number): Bar | null =>
    (r < row ? current.placed[r] : r === row && !current.over ? sliding : null) ?? null;
  // The bow goes on the top of the tower: the sliding box, or the last one landed once it's over.
  const topRow = current.over ? row - 1 : row;

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
        {Array.from({ length: rows }, (_, i) => rows - 1 - i).map((r) => {
          const bar = barOf(r);
          return (
            <span
              key={r}
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${String(width)}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: width }, (_, c) =>
                bar && c >= bar.start && c < bar.start + bar.length ? null : (
                  <i
                    key={c}
                    className="rounded-[3px] bg-gm-bg"
                    style={{ gridColumn: String(c + 1), gridRow: "1" }}
                  />
                ),
              )}
              {bar && <Present bar={bar} moving={r === row && !current.over} bow={r === topRow} />}
            </span>
          );
        })}
      </button>
    </section>
  );
}

export function stackerSummary(raw: unknown): string | null {
  const view = raw as StackerView;
  return view.kind === "done" ? `${String(view.stacked)} of ${String(view.rows)} rows` : null;
}
