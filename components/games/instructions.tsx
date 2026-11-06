"use client";

import { useEffect, useId, useRef } from "react";
import { useSlots } from "@/components/slots/registry";
import type { Instructions } from "@/lib/games";

/** The box every game opens with; the game starts only when it closes (S08-AC9). */
export function InstructionsDialog({
  instructions,
  onStart,
  busy,
}: {
  instructions: Instructions;
  onStart: () => void;
  busy?: boolean;
}) {
  const { Button } = useSlots();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector("button")?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/70 p-3 sm:place-items-center sm:p-4">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="w-full max-w-md overflow-hidden rounded-gm bg-gm-surface text-gm-text shadow-2xl ring-1 ring-gm-border"
      >
        <div className="border-b-4 border-gm-accent px-5 pt-5 pb-4">
          <p className="m-0 text-xs font-bold tracking-[0.16em] text-gm-text-muted uppercase">
            Before you start
          </p>
          <h2 id={`${id}-title`} className="m-0 font-gm-display text-3xl font-bold">
            {instructions.title}
          </h2>
        </div>
        <ol className="m-0 grid list-none gap-3 px-5 py-5">
          {instructions.lines.map((line, i) => (
            <li key={line} className="grid grid-cols-[2rem_1fr] items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-gm-surface-raised font-gm-display text-lg font-bold text-gm-accent"
              >
                {i + 1}
              </span>
              <span className="pt-0.5 text-lg leading-snug">{line}</span>
            </li>
          ))}
        </ol>
        <div className="grid px-5 pb-5">
          <Button size="lg" onClick={onStart} disabled={busy ?? false}>
            {busy ? "Starting…" : "Start"}
          </Button>
        </div>
      </div>
    </div>
  );
}
