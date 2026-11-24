"use client";

import { useState, type ReactNode } from "react";
import { BackspaceIcon } from "@/components/icons/game";
import { useAutoSubmit } from "./auto-submit";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * A white number card over a 3 x 3 pad of white keys and a full-width Lock in
 * that names the number (showdowns, spec 25; Snow Pile, spec 28).
 */
export function NumberEntry({
  prompt,
  timer,
  busy,
  onLock,
  negative = false,
  max = 99,
  closesIn,
}: {
  prompt: ReactNode;
  /** Time left to answer, in ms: what's typed is sent as it runs out. */
  closesIn?: number;
  /** The answer timer, under the prompt. */
  timer?: ReactNode;
  busy: boolean;
  onLock: (value: number) => void;
  negative?: boolean;
  max?: number;
}) {
  const [typed, setTyped] = useState("");
  const value = typed === "" || typed === "-" ? null : Number(typed);
  useAutoSubmit(closesIn, value !== null && !busy, () => {
    if (value !== null) onLock(value);
  });
  const digits = String(max).length;
  const press = (k: string) => {
    if (k === "back") {
      setTyped((t) => t.slice(0, -1));
      return;
    }
    if (k === "-") {
      setTyped((t) => (t.startsWith("-") ? t.slice(1) : `-${t}`));
      return;
    }
    const next = (typed === "0" ? "" : typed) + k;
    if (Math.abs(Number(next)) <= max && next.replace("-", "").length <= digits) setTyped(next);
  };
  const keyLook =
    "grid min-h-16 place-items-center rounded-gm bg-gm-tile-present font-gm-display text-3xl font-bold text-gm-tile-present-ink shadow-md ring-1 ring-gm-border motion-safe:active:scale-[0.97] disabled:opacity-50";
  return (
    <section aria-label="Your answer" className="grid gap-4">
      <div className="text-center text-xl font-bold text-balance">{prompt}</div>
      {timer}
      <output
        aria-label="Your number"
        className="mx-auto grid h-24 w-40 place-items-center rounded-gm bg-gm-tile-present font-gm-display text-6xl font-bold text-gm-tile-present-ink tabular-nums shadow-md ring-1 ring-gm-border"
      >
        {typed === "" ? <span className="text-gm-tile-absent-ink">?</span> : typed}
      </output>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={keyLook}
            onClick={() => {
              press(k);
            }}
          >
            {k}
          </button>
        ))}
        {negative ? (
          <button
            type="button"
            aria-label="Minus"
            className={keyLook}
            onClick={() => {
              press("-");
            }}
          >
            −
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={keyLook}
          onClick={() => {
            press("0");
          }}
        >
          0
        </button>
        <button
          type="button"
          aria-label="Rub out"
          className={keyLook}
          onClick={() => {
            press("back");
          }}
        >
          <BackspaceIcon />
        </button>
      </div>
      <button
        type="button"
        disabled={busy || value === null}
        onClick={() => {
          if (value !== null) onLock(value);
        }}
        className="min-h-14 w-full rounded-gm bg-gm-accent font-gm-display text-2xl font-bold text-gm-text-on-accent hover:bg-gm-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Lock in{value !== null ? ` ${String(value)}` : ""}
      </button>
    </section>
  );
}
