"use client";

import { useEffect, useId, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { CacheView } from "@/lib/games";
import type { GameRendererProps } from "../types";

const LAST: Record<NonNullable<CacheView["last"]>, { text: string; ok: boolean }> = {
  found: { text: "Found one! The points are yours.", ok: true },
  again: { text: "You've already found that one.", ok: false },
  wrong: { text: "That's not one of the hidden codes.", ok: false },
  locked: { text: "Too many tries. Wait 30 seconds, then try again.", ok: false },
};

/** Geocache (spec 17): type a hidden code; each one scores at once, once. */
export function CacheGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button, ScoreCard } = useSlots();
  const view = raw as CacheView;
  const id = useId();
  const [code, setCode] = useState("");
  // The server says how long the box waits; it opens again by itself.
  const [expiredFor, setExpiredFor] = useState<number | null>(null);
  useEffect(() => {
    if (view.lockedForMs <= 0) return;
    const t = setTimeout(() => {
      setExpiredFor(view.lockedForMs);
    }, view.lockedForMs);
    return () => {
      clearTimeout(t);
    };
  }, [view.lockedForMs]);
  const locked = view.lockedForMs > 0 && expiredFor !== view.lockedForMs;
  const last = view.last ? LAST[view.last] : null;

  return (
    <section aria-label="Geocache" className="grid gap-4 py-2">
      <p className="m-0 font-gm-display text-2xl font-bold">
        {view.found.length} of {view.total} found
      </p>
      {view.kind === "hunting" && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!code.trim() || locked) return;
            onMove({ type: "code", code });
            setCode("");
          }}
        >
          <label htmlFor={id} className="text-sm font-bold text-gm-text-muted">
            Found a code? Type it here
          </label>
          <input
            id={id}
            value={code}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            onChange={(e) => {
              setCode(e.target.value);
            }}
            className="min-h-14 w-full min-w-0 rounded-gm border-2 border-gm-border bg-gm-surface px-3 text-center font-gm-display text-3xl tracking-widest text-gm-text uppercase"
          />
          <Button size="lg" type="submit" disabled={busy || locked || !code.trim()}>
            {locked ? "Wait a moment…" : "Check code"}
          </Button>
        </form>
      )}
      {last && (
        <p
          role={last.ok ? "status" : "alert"}
          className={`m-0 text-lg font-bold ${last.ok ? "text-gm-success" : "text-gm-danger"}`}
        >
          {last.text}
        </p>
      )}
      {view.found.length > 0 && (
        <ul aria-label="Found" className="m-0 grid list-none gap-2 p-0">
          {view.found.map((f) => (
            <li key={f.label} className="flex items-center gap-3">
              <ScoreCard label={f.label} value={1} state="scored" size="sm" />
              <span className="font-bold">{f.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function cacheSummary(raw: unknown): string | null {
  const view = raw as CacheView;
  return view.kind === "done" ? `All ${String(view.total)} caches found` : null;
}
