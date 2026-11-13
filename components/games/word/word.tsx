"use client";

import { useEffect, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { cx } from "@/lib/ui";
import type { Mark, WordView } from "@/lib/games";
import type { TileState } from "@/lib/themes";
import type { GameRendererProps } from "../types";

const LENGTH = 5;
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => row.split(""));
const ENTER = "Enter";
const DELETE = "Delete";
const RANK: Record<Mark, number> = { absent: 1, present: 2, correct: 3 };

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

/** Secret Word (spec 19): type a five-letter guess; the server marks each letter. */
export function WordGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Tile, Key } = useSlots();
  const view = raw as WordView;
  const [typed, setTyped] = useState("");
  // A guess the server took clears the row; one it turned away keeps the letters.
  const [seen, setSeen] = useState(view.rows.length);
  if (seen !== view.rows.length) {
    setSeen(view.rows.length);
    setTyped("");
  }
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

  if (view.kind === "done") return null;
  const keys = keyStates(view.rows);
  const rejected = view.rejected !== null && view.rejected === typed;

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
          const current = r === view.rows.length;
          return (
            <div
              key={r}
              role="group"
              aria-label={`Guess ${String(r + 1)}`}
              className="grid grid-cols-5 gap-1.5"
            >
              {Array.from({ length: LENGTH }, (_, i) => {
                const letter = row ? row.word[i] : current ? typed[i] : undefined;
                const state: TileState = row
                  ? (row.marks[i] ?? "absent")
                  : letter
                    ? "typed"
                    : "empty";
                return <Tile key={i} state={state} {...(letter ? { letter } : {})} />;
              })}
            </div>
          );
        })}
      </div>
      <div aria-label="Keyboard" role="group" className="grid gap-1.5">
        {KEY_ROWS.map((row, r) => (
          <div key={row.join("")} className="flex gap-1">
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
