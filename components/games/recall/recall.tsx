"use client";

import { useEffect, useRef, useState } from "react";
import type { RecallView } from "@/lib/games";
import { cx } from "@/lib/ui";
import { GiftWrap, type Wrap } from "../gift";
import type { GameRendererProps } from "../types";

type Round = Extract<RecallView, { kind: "round" }>;

/**
 * Every square is a wrapped present (Khai, 2026-11-14): plain while hidden,
 * bright red with a gold bow when lit or picked, then gold for right and red
 * for wrong once the round is done.
 */
const WRAP: Record<"hidden" | "lit" | "right" | "wrong", Wrap> = {
  hidden: {
    paper: "var(--gm-surface-raised)",
    ribbon: "color-mix(in srgb, var(--gm-text) 18%, transparent)",
  },
  lit: {
    paper: "var(--gm-accent)",
    ribbon: "var(--gm-tile-correct)",
    bow: "var(--gm-tile-correct)",
  },
  right: { paper: "var(--gm-tile-correct)", ribbon: "var(--gm-accent)" },
  wrong: { paper: "var(--gm-danger)", ribbon: "rgb(0 0 0 / 0.25)" },
};

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
          const wrap =
            showing && lit
              ? WRAP.lit
              : picked
                ? full
                  ? lit
                    ? WRAP.right
                    : WRAP.wrong
                  : WRAP.lit
                : WRAP.hidden;
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
              data-wrap={Object.keys(WRAP).find((k) => WRAP[k as keyof typeof WRAP] === wrap)}
              style={{ background: wrap.paper }}
              className={cx(
                "relative grid aspect-square min-h-11 place-items-center overflow-hidden rounded-gm shadow-[inset_0_-3px_0_rgb(0_0_0/0.22)] ring-1 ring-gm-border transition-colors duration-150 motion-reduce:transition-none",
                !showing && full && lit && !picked && "ring-4 ring-gm-tile-correct",
              )}
            >
              <GiftWrap wrap={wrap} />
              {!showing && full && picked && (
                <span
                  aria-hidden="true"
                  className="relative font-gm-display text-2xl font-bold text-gm-bg drop-shadow-[0_1px_0_rgb(255_255_255/0.4)]"
                >
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
