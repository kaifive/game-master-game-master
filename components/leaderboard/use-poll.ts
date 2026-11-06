"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Loads now and every `ms` after. `onData` sees each result with the
 * previous one, so callers can spot what changed (spec 05).
 */
export function usePoll<T>(
  load: () => Promise<T | null>,
  ms: number,
  onData?: (next: T, previous: T | null) => void,
) {
  const [data, setData] = useState<T | null>(null);
  const last = useRef<T | null>(null);
  const loader = useRef(load);
  const handler = useRef(onData);
  useEffect(() => {
    loader.current = load;
    handler.current = onData;
  }, [load, onData]);
  useEffect(() => {
    const alive = { current: true };
    const run = async () => {
      const next = await loader.current();
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
  }, [ms]);
  return data;
}
