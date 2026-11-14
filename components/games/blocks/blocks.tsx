"use client";

import { useRef, useState } from "react";
import { rotate, turnCells, type BlocksView, type Cell, type Piece } from "@/lib/games";
import { formatClock, PuzzleClock } from "../clock";
import { PictureReveal, REVEAL_MS, sliceStyle } from "../picture";
import type { GameRendererProps } from "../types";

type Placed = { row: number; col: number };
type Drag = {
  id: number;
  /** Which square of the piece the finger holds. */
  grab: Cell;
  x: number;
  y: number;
  sx: number;
  sy: number;
  moved: boolean;
  /** The board's square size in px, measured when the drag starts. */
  cell: number;
  /** A piece from the tray, or one already on the board being moved. */
  from: "tray" | "board";
};

/**
 * A tray piece's squares are this many px; on the board they take the board's
 * square size. Big enough to read a piece's shape at a glance (Khai, 2026-11-14).
 */
const TRAY_CELL = 26;
/** A press that moves less than this is a tap (turn), not a drag. */
const DRAG_SLOP = 6;

/** Long enough for a picture's ripple before the result shows. */
export const BLOCKS_HOLD_MS = REVEAL_MS + 600;

const colorOf = (id: number) => `var(--gm-team-${String((id % 8) + 1)})`;
const keyOf = ([r, c]: Cell) => `${String(r)}-${String(c)}`;

/** A photo to slice: its source and the board's size in squares. */
type Art = { src: string; cols: number; rows: number };
/** One square's slice of the photo and how far it's turned. */
type Slice = { at: Cell; deg: number };

/**
 * A picture piece's squares, turned `turns` more times, each with its slice of
 * the photo (keyed by row-col in the turned shape). Empty for a plain piece.
 */
function slicesOf(piece: Piece | undefined, turns: number): Map<string, Slice> {
  const out = new Map<string, Slice>();
  if (!piece?.slices) return out;
  const deg = ((piece.spin ?? 0) + turns) * 90;
  turnCells(piece.cells, turns).forEach((cell, i) => {
    const at = piece.slices?.[i];
    if (at) out.set(keyOf(cell), { at, deg });
  });
  return out;
}

/** Draws a shape as a little grid of squares, or of photo slices. */
function Shape({
  cells,
  cell,
  color,
  art,
  slices,
}: {
  cells: Cell[];
  cell: number;
  color: string;
  art?: Art | undefined;
  slices?: Map<string, Slice>;
}) {
  const rows = Math.max(...cells.map((c) => c[0])) + 1;
  const cols = Math.max(...cells.map((c) => c[1])) + 1;
  return (
    <span
      className="relative block"
      style={{ width: cols * cell, height: rows * cell }}
      aria-hidden="true"
    >
      {cells.map(([r, c]) => {
        const slice = art ? slices?.get(keyOf([r, c])) : undefined;
        return (
          <span
            key={keyOf([r, c])}
            className="absolute rounded-[3px] bg-white ring-1 ring-black/25"
            style={{
              left: c * cell + 1,
              top: r * cell + 1,
              width: cell - 2,
              height: cell - 2,
              ...(art && slice
                ? sliceStyle(art.src, art.cols, art.rows, slice.at, slice.deg)
                : { background: color }),
            }}
          />
        );
      })}
    </span>
  );
}

/**
 * Block Fit (spec 22): drag pieces onto the board, tap one in the tray to
 * turn it, tap a placed one to take it back. The board sends itself once full.
 */
export function BlocksGame({ view: raw, onMove, busy }: GameRendererProps) {
  const served = raw as BlocksView;
  // The run's last board stays up (with its finale) while the result holds.
  const [lastView, setLastView] = useState(served.kind === "playing" ? served : null);
  if (served.kind === "playing" && served !== lastView) setLastView(served);
  const view = served.kind === "playing" ? served : lastView;
  const pieces: Piece[] = view ? view.pieces : [];
  const [turns, setTurns] = useState<Record<number, number>>({});
  const [placed, setPlaced] = useState<Record<number, Placed>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [sent, setSent] = useState(false);
  // Where the last piece went: the ripple starts there.
  const [last, setLast] = useState<Cell>([0, 0]);
  const board = useRef<HTMLDivElement>(null);
  // A new puzzle (a new run) starts afresh.
  const [dealt, setDealt] = useState(pieces);
  if (view && view.pieces !== dealt) {
    setDealt(view.pieces);
    setTurns({});
    setPlaced({});
    setSent(false);
  }
  if (!view) return null;
  const { width, height } = view;
  const art: Art | undefined = view.image
    ? { src: view.image.src, cols: width, rows: height }
    : undefined;

  const pieceOf = (id: number) => pieces.find((p) => p.id === id);
  const shapeOf = (id: number) => rotate(pieceOf(id)?.cells ?? [], turns[id] ?? 0);
  const slicesFor = (id: number) => slicesOf(pieceOf(id), turns[id] ?? 0);
  const owner = new Map<number, number>();
  // Picture puzzles: which slice of the photo each covered square shows.
  const shown = new Map<number, Slice>();
  for (const [id, at] of Object.entries(placed)) {
    const slices = slicesFor(Number(id));
    for (const [r, c] of shapeOf(Number(id))) {
      const square = (r + at.row) * width + (c + at.col);
      owner.set(square, Number(id));
      const slice = slices.get(keyOf([r, c]));
      if (slice) shown.set(square, slice);
    }
  }

  const fits = (id: number, row: number, col: number) =>
    shapeOf(id).every(([r, c]) => {
      const [rr, cc] = [r + row, c + col];
      if (rr < 0 || cc < 0 || rr >= height || cc >= width) return false;
      const who = owner.get(rr * width + cc);
      return who === undefined || who === id;
    });

  const place = (id: number, row: number, col: number) => {
    const next = { ...placed, [id]: { row, col } };
    setPlaced(next);
    const [fr, fc] = shapeOf(id)[0] ?? [0, 0];
    setLast([row + fr, col + fc]);
    if (Object.keys(next).length === pieces.length && !sent) {
      setSent(true);
      onMove({
        type: "solve",
        placements: pieces.map((p) => ({
          piece: p.id,
          turns: turns[p.id] ?? 0,
          row: next[p.id]?.row ?? 0,
          col: next[p.id]?.col ?? 0,
        })),
      });
    }
  };

  // The ghost's top-left: the finger sits in the middle of the square it grabbed.
  const ghostAt = (d: Drag) => ({
    left: d.x - (d.grab[1] + 0.5) * d.cell,
    top: d.y - (d.grab[0] + 0.5) * d.cell,
    cell: d.cell,
  });

  const takeBack = (id: number) => {
    setPlaced((p) => Object.fromEntries(Object.entries(p).filter(([k]) => Number(k) !== id)));
  };

  // Drops where it fits. A placed piece dropped off the board goes back to the
  // tray; dropped where it doesn't fit, it stays where it was.
  const drop = (d: Drag) => {
    if (!board.current) return;
    const rect = board.current.getBoundingClientRect();
    const g = ghostAt(d);
    const col = Math.round((g.left - rect.left) / g.cell);
    const row = Math.round((g.top - rect.top) / g.cell);
    const offBoard = d.x < rect.left || d.x > rect.right || d.y < rect.top || d.y > rect.bottom;
    if (d.from === "board" && offBoard) takeBack(d.id);
    else if (fits(d.id, row, col)) place(d.id, row, col);
  };

  const follow = (e: React.PointerEvent, id: number) => {
    setDrag((d) =>
      d && d.id === id
        ? {
            ...d,
            x: e.clientX,
            y: e.clientY,
            moved: d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_SLOP,
          }
        : d,
    );
  };

  const tray = pieces.filter((p) => !placed[p.id]);
  const locked = sent || busy;

  return (
    <section aria-label="Block Fit" className="grid gap-3 select-none">
      <div className="flex items-center justify-between gap-3">
        <PuzzleClock startMs={view.elapsedMs} stopped={sent} />
        <span className="ml-auto text-lg font-bold text-gm-text-muted tabular-nums">
          {pieces.length - tray.length} of {pieces.length} placed
        </span>
        {/* Up here, so the board and tray fit a phone without scrolling. */}
        <button
          type="button"
          disabled={locked || tray.length === pieces.length}
          onClick={() => {
            setPlaced({});
          }}
          className="min-h-11 rounded-gm px-3 font-gm-display text-lg font-bold text-gm-accent-ink ring-2 ring-gm-accent-ink disabled:opacity-40"
        >
          Reset
        </button>
      </div>
      <div
        ref={board}
        role="group"
        aria-label="Board"
        className="relative mx-auto grid w-full touch-none gap-0 overflow-hidden rounded-gm bg-gm-surface ring-1 ring-gm-border"
        style={{
          gridTemplateColumns: `repeat(${String(width)}, minmax(0, 1fr))`,
          aspectRatio: `${String(width)} / ${String(height)}`,
          // Small enough on a short phone that the tray and Reset fit without scrolling.
          maxWidth: `min(24rem, calc((100dvh - 26rem) * ${String(width / height)}))`,
        }}
      >
        {Array.from({ length: width * height }, (_, i) => {
          const who = owner.get(i);
          // A placed piece being dragged fades where it was (it can still drop back there).
          const lifted =
            who !== undefined && drag?.from === "board" && drag.moved && drag.id === who;
          return (
            <button
              key={i}
              type="button"
              disabled={locked || who === undefined}
              aria-label={
                who === undefined
                  ? "Empty square"
                  : "Placed piece: drag to move it, tap to take it back"
              }
              onPointerDown={(e) => {
                if (who === undefined || locked) return;
                const at = placed[who];
                if (!at) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const cell = board.current
                  ? board.current.getBoundingClientRect().width / width
                  : 48;
                setDrag({
                  cell,
                  id: who,
                  // The square of the piece under the finger.
                  grab: [Math.floor(i / width) - at.row, (i % width) - at.col],
                  x: e.clientX,
                  y: e.clientY,
                  sx: e.clientX,
                  sy: e.clientY,
                  moved: false,
                  from: "board",
                });
              }}
              onPointerMove={(e) => {
                if (drag?.from === "board") follow(e, drag.id);
              }}
              onPointerUp={() => {
                if (drag?.from === "board") {
                  if (drag.moved) drop(drag);
                  else takeBack(drag.id);
                }
                setDrag(null);
              }}
              onPointerCancel={() => {
                setDrag(null);
              }}
              onKeyDown={(e) => {
                // Keyboard: Enter or Space takes it back (moving needs a pointer).
                if (who !== undefined && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  takeBack(who);
                }
              }}
              className="m-[1px] touch-none overflow-hidden rounded-[3px] border border-gm-border/60 disabled:cursor-default"
              style={
                who === undefined
                  ? undefined
                  : {
                      background: art ? "white" : colorOf(who),
                      borderColor: "transparent",
                      opacity: lifted ? 0.3 : 1,
                    }
              }
            >
              {art && shown.get(i) && (
                <span
                  aria-hidden="true"
                  className="block size-full"
                  style={sliceStyle(
                    art.src,
                    art.cols,
                    art.rows,
                    (shown.get(i) as Slice).at,
                    (shown.get(i) as Slice).deg,
                  )}
                />
              )}
            </button>
          );
        })}
        {view.image && sent && (
          <PictureReveal
            image={view.image}
            x={((last[1] + 0.5) / width) * 100}
            y={((last[0] + 0.5) / height) * 100}
          />
        )}
      </div>
      <div
        role="group"
        aria-label="Pieces"
        className="flex min-h-24 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-gm p-1"
      >
        {tray.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={locked}
            aria-label={`Piece ${String(p.id + 1)}: tap to turn, drag onto the board`}
            onPointerDown={(e) => {
              if (locked) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              // The shape itself, inside the button's padding.
              const rect = (
                e.currentTarget.firstElementChild ?? e.currentTarget
              ).getBoundingClientRect();
              const grab: Cell = [
                Math.max(0, Math.floor((e.clientY - rect.top) / TRAY_CELL)),
                Math.max(0, Math.floor((e.clientX - rect.left) / TRAY_CELL)),
              ];
              const cell = board.current ? board.current.getBoundingClientRect().width / width : 48;
              setDrag({
                cell,
                id: p.id,
                grab,
                x: e.clientX,
                y: e.clientY,
                sx: e.clientX,
                sy: e.clientY,
                moved: false,
                from: "tray",
              });
            }}
            onPointerMove={(e) => {
              follow(e, p.id);
            }}
            onPointerUp={() => {
              if (drag?.id === p.id) {
                if (drag.moved) drop(drag);
                else setTurns((t) => ({ ...t, [p.id]: ((t[p.id] ?? 0) + 1) % 4 }));
              }
              setDrag(null);
            }}
            onPointerCancel={() => {
              setDrag(null);
            }}
            onKeyDown={(e) => {
              // Keyboard: Enter or Space turns it (dragging needs a pointer).
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setTurns((t) => ({ ...t, [p.id]: ((t[p.id] ?? 0) + 1) % 4 }));
              }
            }}
            className="touch-none rounded-gm p-1 transition-transform motion-safe:active:scale-95"
            style={{ opacity: drag?.id === p.id && drag.moved ? 0.25 : 1 }}
          >
            <Shape
              cells={shapeOf(p.id)}
              cell={TRAY_CELL}
              color={colorOf(p.id)}
              art={art}
              slices={slicesFor(p.id)}
            />
          </button>
        ))}
        {tray.length === 0 && !sent && <p className="m-0 text-gm-text-muted">All placed.</p>}
      </div>
      {drag?.moved &&
        (() => {
          const g = ghostAt(drag);
          return (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-50 opacity-90 drop-shadow-xl"
              style={{ left: g.left, top: g.top }}
            >
              <Shape
                cells={shapeOf(drag.id)}
                cell={g.cell}
                color={colorOf(drag.id)}
                art={art}
                slices={slicesFor(drag.id)}
              />
            </div>
          );
        })()}
    </section>
  );
}

export function blocksSummary(raw: unknown): string | null {
  const view = raw as BlocksView;
  if (view.kind !== "done" || view.tookMs === null) return null;
  return `Solved in ${formatClock(view.tookMs)}`;
}
