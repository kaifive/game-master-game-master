"use client";

import { useState } from "react";
import { slide, isSolved, type SlideView } from "@/lib/games";
import { cx } from "@/lib/ui";
import { formatClock, PuzzleClock } from "../clock";
import type { GameRendererProps } from "../types";

/** Long enough for the last tile to glide home before the result shows. */
export const SLIDE_HOLD_MS = 450;

/**
 * Number Slide (spec 21): tap a tile in the gap's row or column to slide it.
 * The phone plays; the server replays the taps to check them.
 */
export function SlideGame({ view: raw, onMove, busy }: GameRendererProps) {
  const view = raw as SlideView;
  const start = view.kind === "playing" ? view.board : [];
  const [board, setBoard] = useState(start);
  const [taps, setTaps] = useState<number[]>([]);
  const [sent, setSent] = useState(false);
  // A new board from the server (a new run) starts afresh.
  const [dealt, setDealt] = useState(start);
  if (view.kind === "playing" && view.board !== dealt) {
    setDealt(view.board);
    setBoard(view.board);
    setTaps([]);
    setSent(false);
  }
  if (view.kind !== "playing") return null;
  const size = view.size;

  const tap = (tile: number) => {
    if (sent || busy) return;
    const next = slide(board, size, tile);
    if (!next) return;
    const all = [...taps, tile];
    setBoard(next);
    setTaps(all);
    if (isSolved(next)) {
      setSent(true);
      onMove({ type: "solve", taps: all });
    }
  };

  return (
    <section aria-label="Number Slide" className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <PuzzleClock startMs={view.elapsedMs} stopped={sent} />
        <span className="text-lg font-bold text-gm-text-muted tabular-nums">
          {taps.length} {taps.length === 1 ? "move" : "moves"}
        </span>
      </div>
      <div
        role="group"
        aria-label="Tiles"
        className="relative mx-auto aspect-square w-full max-w-sm touch-manipulation rounded-gm bg-gm-surface p-1.5 ring-1 ring-gm-border select-none"
      >
        <div className="relative size-full">
          {board.map((tile, i) => {
            if (tile === 0) return null;
            const home = tile - 1 === i;
            return (
              <button
                key={tile}
                type="button"
                aria-label={`Tile ${String(tile)}${home ? ", in place" : ""}`}
                onClick={() => {
                  tap(tile);
                }}
                className="absolute p-1 transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{
                  width: `${String(100 / size)}%`,
                  height: `${String(100 / size)}%`,
                  transform: `translate(${String((i % size) * 100)}%, ${String(Math.floor(i / size) * 100)}%)`,
                }}
              >
                <span
                  className={cx(
                    "grid size-full place-items-center rounded-[5px] font-gm-display text-5xl font-bold tabular-nums shadow-md",
                    home
                      ? "bg-gm-tile-correct text-gm-tile-correct-ink"
                      : "bg-[var(--gm-card,var(--gm-surface-raised))] text-[var(--gm-card-ink,var(--gm-text))]",
                  )}
                >
                  {tile}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function slideSummary(raw: unknown): string | null {
  const view = raw as SlideView;
  if (view.kind !== "done" || view.tookMs === null) return null;
  return `Solved in ${formatClock(view.tookMs)} · ${String(view.moves ?? 0)} moves`;
}
