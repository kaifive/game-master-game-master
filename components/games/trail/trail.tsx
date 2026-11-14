"use client";

import { useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import {
  adjacent,
  checkPath,
  dotMarks,
  facing,
  turnToward,
  type DotMark,
  type TrailView,
} from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

type Playing = Extract<TrailView, { kind: "playing" }>;

/** Number chips: grey until passed in order (green), red when skipped (S16-AC9). */
const CHIP: Record<DotMark, string> = {
  idle: "bg-[color-mix(in_srgb,var(--gm-text)_68%,var(--gm-surface))] text-gm-surface",
  passed: "bg-gm-success text-white",
  skipped: "bg-gm-danger text-white",
};
const SAID: Record<DotMark, string> = { idle: "", passed: ", passed", skipped: ", skipped" };

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
  // The runner turns the short way round to face each step (S16-AC10).
  const [turn, setTurn] = useState({ dir: 0, angle: 0 });
  const dir = view.kind === "playing" ? facing(path, view.size) : turn.dir;
  if (dir !== turn.dir) setTurn({ dir, angle: turnToward(turn.angle, dir) });
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
  const marks = dotMarks(path, view.dots);
  const runner = view.runner;
  const runnerAt = path[path.length - 1] ?? view.dots[0] ?? 0;
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
              aria-label={`${dot >= 0 ? `Number ${String(dot + 1)}${SAID[marks[dot] ?? "idle"]}` : "Square"}${on ? ", on the trail" : ""}`}
              {...(dot >= 0 ? { "data-mark": marks[dot] ?? "idle" } : {})}
              className={cx(
                "grid aspect-square min-h-11 place-items-center rounded-gm ring-2",
                // High contrast in a dim room: empty squares are clearly squares; the trail fills them.
                on
                  ? "bg-[color-mix(in_srgb,var(--gm-accent-ink)_60%,var(--gm-surface))] ring-[var(--gm-accent-ink)]"
                  : "bg-[color-mix(in_srgb,var(--gm-text)_14%,var(--gm-surface))] ring-[color-mix(in_srgb,var(--gm-text)_22%,transparent)]",
                head && "ring-4 ring-[var(--gm-text)]",
              )}
            >
              {dot >= 0 && !(runner && cell === runnerAt) && (
                <span
                  className={cx(
                    "jt-card-shadow z-10 grid size-10 place-items-center rounded-[5px] font-gm-display text-2xl font-bold transition-colors duration-150",
                    CHIP[marks[dot] ?? "idle"],
                  )}
                >
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
        {runner && (
          // The runner stands on 1, then on the trail's end, facing the last step.
          <div
            data-runner-at={runnerAt}
            className="pointer-events-none absolute z-20 aspect-square -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-100 ease-out motion-reduce:transition-none"
            style={{
              left: `${String(centre(runnerAt).x)}%`,
              top: `${String(centre(runnerAt).y)}%`,
              width: `${String((100 / view.size) * 1.25)}%`,
            }}
          >
            <div
              className="size-full transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{ transform: `rotate(${String(turn.angle)}deg)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a small cutout, already sized */}
              <img
                src={runner.src}
                alt={runner.alt}
                className="size-full object-contain drop-shadow-[0_2px_3px_rgb(0_0_0/0.6)]"
                draggable={false}
              />
            </div>
          </div>
        )}
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
