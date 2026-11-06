"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Loads now and every `ms` after. `onData` sees each result with the
 * previous one, so callers can spot what changed (spec 05). A new `load`
 * (say, once the phone knows its player) loads again at once, so a panel
 * never waits a whole interval showing what a stranger would see.
 */
export function usePoll<T>(
  load: () => Promise<T | null>,
  ms: number,
  onData?: (next: T, previous: T | null) => void,
) {
  const [data, setData] = useState<T | null>(null);
  const last = useRef<T | null>(null);
  const handler = useRef(onData);
  useEffect(() => {
    handler.current = onData;
  }, [onData]);
  useEffect(() => {
    const alive = { current: true };
    const run = async () => {
      const next = await load();
      if (!alive.current || next === null) return;
      handler.current?.(next, last.current);
      last.current = next;
      setData(next);
    };
    void run();
    const timer = setInterval(() => void run(), ms);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, [load, ms]);
  return data;
}
