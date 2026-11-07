"use client";

import { useEffect, useRef, useState } from "react";
import type { RecallView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

type Round = Extract<RecallView, { kind: "round" }>;

/** How long a finished round shows what you got right before the next. */
export const FEEDBACK_MS = 900;

function RoundGrid({ round, onDone }: { round: Round; onDone: (cells: number[]) => void }) {
  const [showing, setShowing] = useState(true);
  const [picks, setPicks] = useState<number[]>([]);
  const full = picks.length >= round.lit.length;
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowing(false);
    }, round.showMs);
    return () => {
      clearTimeout(t);
    };
  }, [round.showMs]);

  useEffect(() => {
    if (!full) return;
    const t = setTimeout(() => {
      done.current(picks);
    }, FEEDBACK_MS);
    return () => {
      clearTimeout(t);
    };
  }, [full, picks]);

  const found = picks.filter((p) => round.lit.includes(p)).length;
  return (
    <div className="grid gap-4">
      <p className="m-0 text-center text-lg font-bold" aria-live="polite">
        {showing
          ? "Remember the lit squares…"
          : full
            ? `${String(found)} of ${String(round.lit.length)} right`
            : `Tap ${String(round.lit.length - picks.length)} more`}
      </p>
      <div
        role="grid"
        aria-label={`Round ${String(round.number)} grid`}
        className="mx-auto grid w-full max-w-sm gap-1.5"
        style={{ gridTemplateColumns: `repeat(${String(round.size)}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: round.size * round.size }, (_, cell) => {
          const lit = round.lit.includes(cell);
          const picked = picks.includes(cell);
          return (
            <button
              key={cell}
              type="button"
              disabled={showing || full || picked}
              aria-label={`Square ${String(cell + 1)}${picked ? ", picked" : ""}`}
              data-lit={showing && lit ? "" : undefined}
              onClick={() => {
                setPicks((p) =>
                  p.includes(cell) || p.length >= round.lit.length ? p : [...p, cell],
                );
              }}
              className={cx(
                "aspect-square min-h-11 rounded-gm ring-1 ring-gm-border",
                showing && lit && "bg-[var(--gm-card)]",
                !showing &&
                  picked &&
                  (full ? (lit ? "bg-gm-tile-correct" : "bg-gm-danger") : "bg-[var(--gm-card)]"),
                !showing && full && lit && !picked && "ring-4 ring-gm-tile-correct",
                !(showing && lit) && !picked && "bg-gm-surface-raised",
              )}
            >
              {!showing && full && picked && (
                <span aria-hidden="true" className="font-gm-display text-xl font-bold text-gm-bg">
                  {lit ? "✓" : "✗"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Rapid Recall (spec 16): three rounds of remembering lit squares. */
export function RecallGame({ view: raw, onMove }: GameRendererProps) {
  const view = raw as RecallView;
  if (view.kind === "done") return null;
  return (
    <section aria-label="Rapid Recall" className="grid gap-3">
      <p className="m-0 text-base font-bold text-gm-text-muted">
        Round {view.number} of {view.total}
      </p>
      <RoundGrid
        key={view.number}
        round={view}
        onDone={(cells) => {
          onMove({ type: "pick", round: view.number, cells });
        }}
      />
    </section>
  );
}

export function recallSummary(raw: unknown): string | null {
  const view = raw as RecallView;
  return view.kind === "done" ? `${String(view.found)} of ${String(view.total)} squares` : null;
}
