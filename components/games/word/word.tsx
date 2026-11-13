"use client";

import { useEffect, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { Mark, WordView } from "@/lib/games";
import type { TileState } from "@/lib/themes";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

const LENGTH = 5;
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => row.split(""));
const ENTER = "Enter";
const DELETE = "Delete";
const RANK: Record<Mark, number> = { absent: 1, present: 2, correct: 3 };

/** One tile flips every STEP_MS; each flip takes FLIP_MS (the class below) and shows its mark halfway. */
const STEP_MS = 300;
const FLIP_MS = 500;
/** A solved row bounces, tile after tile, once the flips finish. */
const BOUNCE_STEP_MS = 100;
const BOUNCE_MS = 600;
const TOAST_MS = 1500;
/** How long the board stays up after the last guess: every flip, then the bounce. */
export const WORD_HOLD_MS =
  STEP_MS * (LENGTH - 1) + FLIP_MS + BOUNCE_STEP_MS * (LENGTH - 1) + BOUNCE_MS + 300;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Each letter's best mark so far, for the keyboard. */
function keyStates(rows: WordView["rows"]): Map<string, Mark> {
  const best = new Map<string, Mark>();
  for (const row of rows)
    row.marks.forEach((m, i) => {
      const letter = row.word[i] ?? "";
      const was = best.get(letter);
      if (!was || RANK[m] > RANK[was]) best.set(letter, m);
    });
  return best;
}

/**
 * Secret Word (spec 19): type a five-letter guess; the server marks each
 * letter. A new guess flips over tile by tile, a letter pops in as it's
 * typed, a non-word shakes the row, and a solved row bounces.
 */
export function WordGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Tile, Key } = useSlots();
  const view = raw as WordView;
  const [typed, setTyped] = useState("");
  // The row being revealed (a guess that just came back) and how many of its tiles show their mark.
  const [reveal, setReveal] = useState<{ row: number; shown: number } | null>(null);
  const [shake, setShake] = useState(0);
  // "Not in the word list" shows briefly over the board, then gets out of the way.
  const [toast, setToast] = useState(false);
  // A guess the server took clears the typed letters and starts its reveal; a turned-away one shakes.
  const [seen, setSeen] = useState({ rows: view.rows.length, view });
  if (seen.view !== view) {
    if (view.rows.length > seen.rows) {
      setTyped("");
      setReveal({ row: view.rows.length - 1, shown: 0 });
    } else if (view.kind === "guessing" && view.rejected !== null) {
      setShake((n) => n + 1);
      setToast(true);
    }
    setSeen({ rows: view.rows.length, view });
  }
  const revealing = reveal?.row;

  // Show each tile's mark halfway through its flip; all at once with reduced motion.
  useEffect(() => {
    if (revealing === undefined) return;
    const instant = reducedMotion();
    const timers = Array.from({ length: LENGTH }, (_, i) =>
      setTimeout(
        () => {
          setReveal((r) =>
            r && r.row === revealing ? { ...r, shown: instant ? LENGTH : i + 1 } : r,
          );
        },
        instant ? 0 : i * STEP_MS + FLIP_MS / 2,
      ),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [revealing]);

  useEffect(() => {
    if (shake === 0) return;
    const t = setTimeout(() => {
      setToast(false);
    }, TOAST_MS);
    return () => {
      clearTimeout(t);
    };
  }, [shake]);

  const guessing = view.kind === "guessing";
  const press = (label: string) => {
    if (!guessing) return;
    if (label === ENTER) {
      // One guess in flight at a time.
      if (!busy && typed.length === LENGTH) onMove({ type: "guess", word: typed });
      return;
    }
    if (label === DELETE) {
      setTyped((t) => t.slice(0, -1));
      return;
    }
    if (/^[A-Z]$/.test(label)) setTyped((t) => (t.length < LENGTH ? t + label : t));
  };

  // A physical keyboard works too.
  const pressRef = useRef(press);
  useEffect(() => {
    pressRef.current = press;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, button")) return;
      const label =
        e.key === "Enter" ? ENTER : e.key === "Backspace" ? DELETE : e.key.toUpperCase();
      pressRef.current(label);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // The keyboard learns a row's marks only once its tiles have flipped.
  const settled =
    reveal && reveal.shown < LENGTH ? view.rows.filter((_, i) => i !== reveal.row) : view.rows;
  const keys = keyStates(settled);
  const rejected = toast && guessing && view.rejected !== null && view.rejected === typed;
  const solvedRow = view.kind === "done" && view.solved ? view.rows.length - 1 : -1;
  const bouncing = solvedRow >= 0 && (reveal === null || reveal.shown >= LENGTH);

  return (
    <section aria-label="Secret Word" className="relative grid gap-3">
      {/* Floats over the grid, so the board and keyboard fit a phone without scrolling. */}
      <p
        role="status"
        aria-live="polite"
        className={cx(
          "pointer-events-none absolute top-2 left-1/2 z-10 m-0 w-max -translate-x-1/2 rounded-gm px-4 py-2 text-center text-lg font-bold",
          rejected && "bg-gm-surface-raised shadow-xl ring-1 ring-gm-border",
        )}
      >
        {rejected ? "Not in the word list" : ""}
      </p>
      <div className="grid justify-center gap-1.5">
        {Array.from({ length: view.maxGuesses }, (_, r) => {
          const row = view.rows[r];
          const current = guessing && r === view.rows.length;
          const flipping = reveal?.row === r;
          return (
            <div
              key={current ? `current-${String(shake)}` : r}
              role="group"
              aria-label={`Guess ${String(r + 1)}`}
              className={cx(
                "grid grid-cols-5 gap-1.5",
                current && shake > 0 && "motion-safe:animate-[gm-shake_400ms_ease-in-out]",
              )}
            >
              {Array.from({ length: LENGTH }, (_, i) => {
                const letter = row ? row.word[i] : current ? typed[i] : undefined;
                const hidden = flipping && reveal.shown <= i;
                const state: TileState = row
                  ? hidden
                    ? "typed"
                    : (row.marks[i] ?? "absent")
                  : letter
                    ? "typed"
                    : "empty";
                const style = flipping
                  ? { animationDelay: `${String(i * STEP_MS)}ms` }
                  : r === solvedRow && bouncing
                    ? { animationDelay: `${String(i * BOUNCE_STEP_MS)}ms` }
                    : undefined;
                return (
                  <span
                    // A typed letter remounts its tile, so it pops in.
                    key={current ? `${String(i)}-${letter ?? ""}` : i}
                    style={style}
                    className={cx(
                      "inline-grid",
                      current && letter && "motion-safe:animate-[gm-tile-pop_100ms_ease-out]",
                      flipping && "motion-safe:animate-[gm-tile-flip_500ms_ease-in-out_both]",
                      !flipping &&
                        r === solvedRow &&
                        bouncing &&
                        "motion-safe:animate-[gm-tile-bounce_600ms_ease-out_both]",
                    )}
                  >
                    <Tile state={state} {...(letter ? { letter } : {})} />
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      <div aria-label="Keyboard" role="group" className="grid gap-1.5">
        {KEY_ROWS.map((row, r) => (
          <div key={row.join("")} className="flex gap-1.5">
            {/* The middle row sits in by half a key each side, as on a phone keyboard. */}
            {r === 1 && <span aria-hidden="true" className="flex-[0.5]" />}
            {r === 2 && <Key label={ENTER} wide onPress={press} />}
            {row.map((letter) => (
              <Key
                key={letter}
                label={letter}
                state={keys.get(letter) ?? "unused"}
                onPress={press}
              />
            ))}
            {r === 2 && <Key label={DELETE} wide onPress={press} />}
            {r === 1 && <span aria-hidden="true" className="flex-[0.5]" />}
          </div>
        ))}
      </div>
    </section>
  );
}

export function wordSummary(raw: unknown): string | null {
  const view = raw as WordView;
  if (view.kind !== "done") return null;
  if (view.solved) {
    const n = view.rows.length;
    return `Solved in ${String(n)} ${n === 1 ? "guess" : "guesses"}`;
  }
  return view.answer ? `The word was ${view.answer}` : "Not this time";
}
