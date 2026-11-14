"use client";

import { useEffect, useState } from "react";

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`;
};

/** A running m:ss clock for untimed puzzles, picking up from the server's count (specs 21, 22). */
export function PuzzleClock({ startMs, stopped = false }: { startMs: number; stopped?: boolean }) {
  const [ms, setMs] = useState(startMs);
  useEffect(() => {
    if (stopped) return;
    const at = performance.now();
    const t = setInterval(() => {
      setMs(startMs + performance.now() - at);
    }, 250);
    return () => {
      clearInterval(t);
    };
  }, [startMs, stopped]);
  return (
    <span className="font-gm-display text-2xl font-bold tabular-nums" aria-label="Time">
      {fmt(ms)}
    </span>
  );
}

export const formatClock = fmt;
