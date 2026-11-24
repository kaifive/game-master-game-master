"use client";

import { useEffect, useRef } from "react";

/** How long before the timer ends the controller sends what it has (network time to reach the server). */
export const AUTO_SUBMIT_MS = 500;

/**
 * Sends whatever is on a controller just before its timer runs out (Khai,
 * 2026-11-24), once, and only if there's something to send: a typed number,
 * a moved staff, a pick. `left` is the time left in ms, or undefined where
 * there's no timer.
 */
export function useAutoSubmit(left: number | undefined, ready: boolean, submit: () => void) {
  const fired = useRef(false);
  const send = useRef(submit);
  useEffect(() => {
    send.current = submit;
  }, [submit]);
  useEffect(() => {
    if (fired.current || left === undefined || !ready || left > AUTO_SUBMIT_MS || left < 0) return;
    fired.current = true;
    send.current();
  }, [left, ready]);
}
