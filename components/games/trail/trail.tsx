"use client";

import { useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { adjacent, checkPath, type TrailView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

type Playing = Extract<TrailView, { kind: "playing" }>;

/** The square under a point on the grid, from its data-cell attribute. */
function cellAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y)?.closest("[data-cell]");
  const cell = el?.getAttribute("data-cell");
  return cell === null || cell === undefined ? null : Number(cell);
}

/** The next path after touching `cell`: start on 1, step to a neighbour, or step back to undo. */
export function extendTrail(path: number[], cell: number, view: Pick<Playing, "size" | "dots">) {
  if (path.length === 0) return cell === view.dots[0] ? [cell] : path;
  const last = path[path.length - 1] as number;
  if (cell === last) return path;
  if (path.length > 1 && cell === path[path.length - 2]) return path.slice(0, -1);
  if (path.includes(cell)) return path.slice(0, path.indexOf(cell) + 1);
  return adjacent(last, cell, view.size) ? [...path, cell] : path;
}

/** Pathfinder (spec 16): drag one path through every square, passing the numbers in order. */
export function TrailGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as TrailView;
  const [path, setPath] = useState<number[]>([]);
  const dragging = useRef(false);
  const sent = useRef(false);
  if (view.kind === "done") return null;

  const total = view.size * view.size;
  const problem = path.length === total ? checkPath(view, path) : null;
  const touch = (cell: number | null) => {
    if (cell === null) return;
    setPath((p) => {
      const next = extendTrail(p, cell, view);
      if (next.length === total && !checkPath(view, next) && !sent.current) {
        sent.current = true;
        onMove({ type: "solve", path: next });
      }
      return next;
    });
  };
  const centre = (cell: number) => ({
    x: ((cell % view.size) + 0.5) * (100 / view.size),
    y: (Math.floor(cell / view.size) + 0.5) * (100 / view.size),
  });

  return (
    <section aria-label="Pathfinder" className="grid gap-3">
      <p className="m-0 text-center text-lg font-bold" aria-live="polite">
        {problem ??
          (path.length === 0 ? "Start on 1" : `${String(path.length)} of ${String(total)} squares`)}
      </p>
      <div
        className="relative mx-auto grid w-full max-w-sm touch-none gap-1 select-none"
        style={{ gridTemplateColumns: `repeat(${String(view.size)}, minmax(0, 1fr))` }}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          touch(cellAt(e.clientX, e.clientY));
        }}
        onPointerMove={(e) => {
          if (dragging.current) touch(cellAt(e.clientX, e.clientY));
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {Array.from({ length: total }, (_, cell) => {
          const dot = view.dots.indexOf(cell);
          const on = path.includes(cell);
          const head = path[path.length - 1] === cell;
          return (
            <span
              key={cell}
              data-cell={cell}
              role="img"
              aria-label={`${dot >= 0 ? `Number ${String(dot + 1)}` : "Square"}${on ? ", on the trail" : ""}`}
              className={cx(
                "grid aspect-square min-h-11 place-items-center rounded-gm ring-2",
                // High contrast in a dim room: empty squares are clearly squares; the trail fills them.
                on
                  ? "bg-[color-mix(in_srgb,var(--gm-accent-ink)_60%,var(--gm-surface))] ring-[var(--gm-accent-ink)]"
                  : "bg-[color-mix(in_srgb,var(--gm-text)_14%,var(--gm-surface))] ring-[color-mix(in_srgb,var(--gm-text)_22%,transparent)]",
                head && "ring-4 ring-[var(--gm-text)]",
              )}
            >
              {dot >= 0 && (
                <span className="jt-card-shadow z-10 grid size-10 place-items-center rounded-[5px] bg-[var(--gm-card,white)] font-gm-display text-2xl font-bold text-[var(--gm-card-ink,black)]">
                  {dot + 1}
                </span>
              )}
            </span>
          );
        })}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 size-full"
          preserveAspectRatio="none"
        >
          <polyline
            points={path.map((c) => `${String(centre(c).x)},${String(centre(c).y)}`).join(" ")}
            fill="none"
            stroke="var(--gm-text)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="flex justify-center">
        <Button
          tone="secondary"
          disabled={busy || path.length === 0}
          onClick={() => {
            setPath([]);
          }}
        >
          Clear
        </Button>
      </div>
    </section>
  );
}

export function trailSummary(raw: unknown): string | null {
  const view = raw as TrailView;
  if (view.kind !== "done") return null;
  if (!view.solved || view.tookMs === null) return "Time ran out";
  return `Solved in ${(view.tookMs / 1000).toFixed(1)} s`;
}
