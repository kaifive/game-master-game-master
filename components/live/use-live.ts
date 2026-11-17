"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clockOffset, keepBest, type ClockSample, type LiveView } from "@/lib/live";

/** How often the live view is fetched while a game runs, and otherwise (S11-AC4). */
export const LIVE_POLL_MS = 700;
export const IDLE_POLL_MS = 4000;

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

/** The wall clock, read in effects and handlers only. */
const wallNow = () => Date.now();

/**
 * Follows the live session (S11-AC4, AC5): fetches the view about every
 * 700 ms while a game runs and every 4 s otherwise, not while the tab is
 * hidden, and estimates the server clock from the replies. `serverNow()`
 * is the server's time on this device.
 */
export function useLive<V extends { serverNow: number; active: boolean } = LiveView>(
  load: () => Promise<Result<V>>,
  { activeMs = LIVE_POLL_MS, idleMs = IDLE_POLL_MS }: { activeMs?: number; idleMs?: number } = {},
) {
  const [view, setView] = useState<V | null>(null);
  const [error, setError] = useState<string | null>(null);
  const samples = useRef<ClockSample[]>([]);
  const [offset, setOffset] = useState(0);
  const active = view?.active === true;
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const refresh = useCallback(async () => {
    const sent = wallNow();
    const res = await loadRef.current();
    const received = wallNow();
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError(null);
    samples.current = keepBest(samples.current, { sent, received, server: res.data.serverNow });
    setOffset(clockOffset(samples.current));
    setView(res.data);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(
      () => {
        if (!document.hidden) void refresh();
      },
      active ? activeMs : idleMs,
    );
    const onShow = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [refresh, active, activeMs, idleMs]);

  // Replaces the view at once with a reply to this device's own action.
  const show = useCallback((next: V) => {
    setView(next);
  }, []);
  const serverNow = useCallback(() => wallNow() + offset, [offset]);
  return { view, error, refresh, show, serverNow };
}

/** Re-renders on every animation frame while `on`, for clocks counting down (S11-AC5). */
export function useFrame(on: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [on]);
}
