"use client";

import { useId, useRef } from "react";
import { useFocusTrap } from "@/components/dialog/use-focus-trap";
import { useSlots } from "@/components/slots/registry";
import type { Instructions } from "@/lib/games";

/**
 * The box every game opens with; the game starts only from its Start
 * (S08-AC9). Tapping outside it or pressing Escape closes it, and the ⓘ by
 * the game's name opens it again (Khai, 2026-11-14). Opened mid-game, it has
 * no Start: just a way back to the game.
 */
export function InstructionsDialog({
  instructions,
  onStart,
  busy,
  onClose,
}: {
  instructions: Instructions;
  /** Without it, the box is a reminder during a game: its button goes back to the game. */
  onStart?: () => void;
  busy?: boolean;
  onClose: () => void;
}) {
  const { Button } = useSlots();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useFocusTrap(box, onClose);
  return (
    <div
      data-testid="sheet-backdrop"
      // Centred, not at the bottom: a double tap on Start then lands on the game,
      // not on the tab bar under where the box was (QA, 2026-11-25).
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="w-full max-w-md overflow-hidden rounded-gm bg-gm-surface text-gm-text shadow-2xl ring-1 ring-gm-border"
      >
        <div className="border-b-4 border-gm-accent-ink px-5 pt-5 pb-4">
          <h2 id={`${id}-title`} className="m-0 font-gm-display text-3xl font-bold">
            {instructions.title}
          </h2>
        </div>
        <ol className="m-0 grid list-none gap-3 px-5 py-5">
          {instructions.lines.map((line, i) => (
            <li key={line} className="grid grid-cols-[2rem_1fr] items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-gm-surface-raised font-gm-display text-lg font-bold text-gm-accent-ink"
              >
                {i + 1}
              </span>
              <span className="pt-0.5 text-lg leading-snug">{line}</span>
            </li>
          ))}
        </ol>
        <div className="grid px-5 pb-5">
          {onStart ? (
            <Button size="lg" onClick={onStart} disabled={busy ?? false}>
              {busy ? "Starting…" : "Start"}
            </Button>
          ) : (
            <Button size="lg" onClick={onClose}>
              Back to the game
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The ⓘ by a game's name that opens its instructions again. */
export function HowToPlayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="How to play"
      onClick={onClick}
      className="-my-2 grid size-11 shrink-0 place-items-center rounded-full text-inherit"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="7.4" r="1.4" fill="currentColor" />
      </svg>
    </button>
  );
}
