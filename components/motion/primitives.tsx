"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/context";
import { barShare, countUpValue, flipDelta } from "@/lib/motion";
import { readableInk } from "@/lib/themes";
import { useMotion, useReducedMotion } from "./hooks";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * FLIP for lists: register each item with flip(key); when the order of
 * keys changes, items glide from their old place to their new one.
 */
export function useFlip(keys: readonly string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const rects = useRef(new Map<string, { left: number; top: number }>());
  const reduced = useReducedMotion();
  const { base, easeOut } = useMotion();
  const order = keys.join("\u0000");

  useLayoutEffect(() => {
    const next = new Map<string, { left: number; top: number }>();
    for (const [key, el] of nodes.current) {
      const { left, top } = el.getBoundingClientRect();
      next.set(key, { left, top });
      const prev = rects.current.get(key);
      if (!prev || reduced) continue;
      const { dx, dy } = flipDelta(prev, { left, top });
      if (dx !== 0 || dy !== 0) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
          duration: base,
          easing: easeOut,
        });
      }
    }
    rects.current = next;
  }, [order, reduced, base, easeOut]);

  return useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    [],
  );
}

/** A number that rolls from its old value to its new one; screen readers get the final value. */
export function CountUp({ value, duration }: { value: number; duration?: number }) {
  const reduced = useReducedMotion();
  const { slow } = useMotion();
  const ms = duration ?? slow;
  const [shown, setShown] = useState(value);
  const last = useRef(value);

  useEffect(() => {
    if (reduced) {
      last.current = value;
      return;
    }
    const from = last.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const v = countUpValue(from, value, (now - start) / ms);
      last.current = v;
      setShown(v);
      if (v !== value) frame = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [value, reduced, ms]);

  return (
    <span>
      <span aria-hidden="true" data-testid="count-up" className="tabular-nums">
        {fmt(reduced ? value : shown)}
      </span>
      <span className="sr-only">{fmt(value)}</span>
    </span>
  );
}

export type BarRaceEntry = { id: string; name: string; score: number; team?: number };

/** Ranked bars that grow, swap places and count up as scores change. */
export function BarRace({ label, entries }: { label: string; entries: BarRaceEntry[] }) {
  const ranked = [...entries].sort((a, b) => b.score - a.score);
  const max = ranked[0]?.score ?? 0;
  const flip = useFlip(ranked.map((e) => e.id));
  const tokens = useTheme()?.tokens;
  return (
    <ol aria-label={label} className="m-0 grid list-none gap-3 p-0">
      {ranked.map((e, i) => (
        <li
          key={e.id}
          ref={flip(e.id)}
          aria-label={`${i + 1}. ${e.name}, ${fmt(e.score)} points`}
          className="grid grid-cols-[2.5rem_1fr] items-center gap-3"
        >
          <span aria-hidden="true" className="font-gm-display text-3xl font-bold text-gm-accent">
            {i + 1}
          </span>
          <div aria-hidden="true" className="min-w-0">
            <div
              data-part="bar"
              className="flex h-12 min-w-fit items-center justify-between gap-3 rounded-gm px-3 font-bold motion-safe:transition-[width] motion-safe:duration-[var(--gm-motion-slow)] motion-safe:ease-[var(--gm-ease-out)]"
              style={{
                width: `${Math.round(barShare(e.score, max) * 100)}%`,
                background: `var(--gm-team-${e.team ?? (i % 8) + 1})`,
                color: readableInk(tokens?.[`team-${e.team ?? (i % 8) + 1}`] ?? "#555555"),
              }}
            >
              <span className="truncate">{e.name}</span>
              <span className="font-gm-display text-2xl">
                <CountUp value={e.score} />
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A "+N" that floats up from where points were earned, then removes itself. */
export function PointsBurst({ points, onDone }: { points: number; onDone?: () => void }) {
  const [alive, setAlive] = useState(true);
  const { slow } = useMotion();
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(() => {
      setAlive(false);
      done.current?.();
    }, slow + 100);
    return () => {
      clearTimeout(t);
    };
  }, [slow]);

  if (!alive) return null;
  return (
    <span className="pointer-events-none relative inline-block">
      <span role="status" className="sr-only">{`+${points} points`}</span>
      <span
        aria-hidden="true"
        className="inline-block font-gm-display text-2xl font-bold text-gm-accent motion-safe:animate-[gm-burst_var(--gm-motion-slow)_var(--gm-ease-out)_forwards]"
      >
        +{points}
      </span>
    </span>
  );
}
