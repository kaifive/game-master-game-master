"use client";

import { useState } from "react";
import { slide, isSolved, type SlideView } from "@/lib/games";
import { cx } from "@/lib/ui";
import { formatClock, PuzzleClock } from "../clock";
import { PictureReveal, REVEAL_MS, sliceStyle } from "../picture";
import type { GameRendererProps } from "../types";

/** The missing piece drops in this long after the last slide; then the ripple shows the photo. */
const PIECE_IN_MS = 300;
/** Long enough for the last tile to glide home, and for a picture, the ripple, before the result shows. */
export const SLIDE_HOLD_MS = PIECE_IN_MS + REVEAL_MS + 600;

/**
 * Number Slide (spec 21): tap a tile in the gap's row or column to slide it.
 * The phone plays; the server replays the taps to check them.
 */
export function SlideGame({ view: raw, onMove, busy }: GameRendererProps) {
  const served = raw as SlideView;
  // The run's last board stays up (with its finale) while the result holds.
  const [last, setLast] = useState(served.kind === "playing" ? served : null);
  if (served.kind === "playing" && served !== last) setLast(served);
  const view = served.kind === "playing" ? served : last;
  const start = view ? view.board : [];
  const [board, setBoard] = useState(start);
  const [taps, setTaps] = useState<number[]>([]);
  const [sent, setSent] = useState(false);
  // A new board from the server (a new run) starts afresh.
  const [dealt, setDealt] = useState(start);
  if (view && view.board !== dealt) {
    setDealt(view.board);
    setBoard(view.board);
    setTaps([]);
    setSent(false);
  }
  if (!view) return null;
  const size = view.size;
  const image = view.image;

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
        {image && (
          // The finished picture, small, so players know what they're building.
          // eslint-disable-next-line @next/next/no-img-element -- a small reference, already sized by the event
          <img
            src={image.src}
            alt={`Goal: ${image.alt}`}
            className="size-14 self-center rounded-[5px] bg-white object-cover ring-1 ring-gm-border"
          />
        )}
        <span className="text-lg font-bold text-gm-text-muted tabular-nums">
          {taps.length} {taps.length === 1 ? "move" : "moves"}
        </span>
      </div>
      <div
        role="group"
        aria-label="Tiles"
        className="relative mx-auto aspect-square w-full max-w-sm touch-manipulation rounded-gm bg-gm-surface p-1.5 ring-1 ring-gm-border select-none"
      >
        <div className="relative size-full overflow-hidden rounded-[6px]">
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
                className={cx(
                  "absolute transition-transform duration-150 ease-out motion-reduce:transition-none",
                  image ? "p-[2px]" : "p-1",
                )}
                style={{
                  width: `${String(100 / size)}%`,
                  height: `${String(100 / size)}%`,
                  transform: `translate(${String((i % size) * 100)}%, ${String(Math.floor(i / size) * 100)}%)`,
                }}
              >
                {image ? (
                  // Its slice of the picture: where this tile sits when the picture is whole.
                  <span
                    className={cx(
                      "block size-full rounded-[4px] bg-white shadow-md",
                      home && "ring-3 ring-gm-tile-correct ring-inset",
                    )}
                    style={sliceStyle(image.src, size, size, [
                      Math.floor((tile - 1) / size),
                      (tile - 1) % size,
                    ])}
                  />
                ) : (
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
                )}
              </button>
            );
          })}
          {image && sent && (
            <>
              {/* The missing piece drops into the gap, then a ripple from there shows the whole photo. */}
              <span
                aria-hidden="true"
                className="absolute p-[2px]"
                style={{
                  width: `${String(100 / size)}%`,
                  height: `${String(100 / size)}%`,
                  transform: `translate(${String((size - 1) * 100)}%, ${String((size - 1) * 100)}%)`,
                }}
              >
                <span
                  className="block size-full rounded-[4px] bg-white shadow-md motion-safe:animate-[gm-piece-in_300ms_ease-out_both]"
                  style={sliceStyle(image.src, size, size, [size - 1, size - 1])}
                />
              </span>
              <PictureReveal
                image={image}
                x={((size - 0.5) / size) * 100}
                y={((size - 0.5) / size) * 100}
                delayMs={PIECE_IN_MS}
              />
            </>
          )}
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
