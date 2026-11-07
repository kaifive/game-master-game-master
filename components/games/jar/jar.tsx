"use client";

import { useId, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { JarView } from "@/lib/games";
import type { GameRendererProps } from "../types";

const field =
  "min-h-14 w-full min-w-0 rounded-gm border-2 border-gm-border bg-gm-surface px-3 text-center font-gm-display text-4xl text-gm-text";

/** Guessing Jar (spec 17): one guess, locked in after a confirm. */
export function JarGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as JarView;
  const id = useId();
  const [value, setValue] = useState("");
  const [sure, setSure] = useState(false);
  if (view.kind === "done") return null;
  const guess = value === "" ? null : Number(value);

  return (
    <section aria-label="Guessing Jar" className="grid gap-4 py-2">
      <label htmlFor={id} className="font-gm-display text-2xl font-bold">
        {view.prompt}
      </label>
      {view.image && (
        // eslint-disable-next-line @next/next/no-img-element -- event images are small and may be remote
        <img
          src={view.image.src}
          alt={view.image.alt}
          className="block h-auto max-w-full rounded-gm"
        />
      )}
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="Your guess"
        value={value}
        disabled={sure}
        onChange={(e) => {
          setValue(e.target.value.replace(/\D/g, "").slice(0, 7));
        }}
        className={field}
      />
      {sure && guess !== null ? (
        <div role="alertdialog" aria-label="Lock in your guess?" className="grid gap-3">
          <p className="m-0 text-lg">
            Lock in <strong>{guess}</strong>? You only get one guess.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={busy}
              onClick={() => {
                onMove({ type: "guess", value: guess });
              }}
            >
              Yes, lock it in
            </Button>
            <Button
              tone="secondary"
              onClick={() => {
                setSure(false);
              }}
            >
              Change it
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="lg"
          disabled={guess === null}
          onClick={() => {
            setSure(true);
          }}
        >
          Lock in my guess
        </Button>
      )}
    </section>
  );
}

export function jarSummary(raw: unknown): string | null {
  const view = raw as JarView;
  if (view.kind !== "done") return null;
  if (view.actual === null)
    return `You guessed ${String(view.guess)}. Points come when the host reveals the jar.`;
  const off =
    view.actual === 0 ? 0 : Math.round((Math.abs(view.guess - view.actual) / view.actual) * 100);
  return `You guessed ${String(view.guess)} · the jar had ${String(view.actual)} · ${String(off)}% off`;
}
