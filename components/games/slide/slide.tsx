"use client";

import { useRef, useState } from "react";
import { slide, isSolved, type SlideView } from "@/lib/games";
import { cx } from "@/lib/ui";
import { formatClock, PuzzleClock } from "../clock";
import { PictureReveal, REVEAL_MS, sliceStyle } from "../picture";
import type { GameRendererProps } from "../types";

/** A press that moves at least this far is a swipe, not a tap. */
const SWIPE_PX = 24;
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
  // Where a swipe began, and whether the last press was a swipe (so its click doesn't tap too).
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
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

  // A swipe slides the piece next to the gap that way, as on a phone sliding puzzle (Khai, 2026-11-14).
  const swipe = (dx: number, dy: number) => {
    const gap = board.indexOf(0);
    const [r, c] = [Math.floor(gap / size), gap % size];
    // Swiping left pulls in the piece to the gap's right, and so on.
    const from =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? c < size - 1
            ? gap + 1
            : -1
          : c > 0
            ? gap - 1
            : -1
        : dy < 0
          ? r < size - 1
            ? gap + size
            : -1
          : r > 0
            ? gap - size
            : -1;
    const tile = from >= 0 ? board[from] : undefined;
    if (tile) tap(tile);
  };

  return (
    <section aria-label={image ? "Picture Slide" : "Number Slide"} className="grid gap-4">
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
        className="relative mx-auto aspect-square w-full max-w-sm touch-none rounded-gm bg-gm-surface p-1.5 ring-1 ring-gm-border select-none"
        onPointerDown={(e) => {
          swipeFrom.current = { x: e.clientX, y: e.clientY };
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (!from) return;
          const [dx, dy] = [e.clientX - from.x, e.clientY - from.y];
          if (Math.hypot(dx, dy) < SWIPE_PX) return;
          swiped.current = true;
          swipe(dx, dy);
        }}
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
                  if (swiped.current) {
                    swiped.current = false;
                    return;
                  }
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
