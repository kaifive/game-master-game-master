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
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="grid w-full max-w-md gap-4 rounded-gm border border-gm-border bg-gm-surface p-5 text-gm-text shadow-xl"
      >
        <h2 id={`${id}-title`} className="m-0 font-gm-display text-2xl font-bold">
          {instructions.title}
        </h2>
        <ul className="m-0 grid gap-2 pl-5 text-lg">
          {instructions.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Button onClick={onStart} disabled={busy ?? false}>
          {busy ? "Starting…" : "Start"}
        </Button>
      </div>
    </div>
  );
}
