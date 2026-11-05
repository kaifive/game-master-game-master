"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme/context";
import { parseDuration } from "@/lib/motion";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
  };
};

/** True when the viewer asked their device for less motion. */
export const useReducedMotion = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );

const FALLBACK = { fast: 150, base: 300, slow: 600, stage: 1200 };

/** Durations (ms) and easings from the current theme's motion tokens. */
export function useMotion() {
  const t = useTheme()?.tokens;
  const ms = (name: string, fallback: number) =>
    t?.[name] ? parseDuration(t[name]) || fallback : fallback;
  return {
    fast: ms("motion-fast", FALLBACK.fast),
    base: ms("motion-base", FALLBACK.base),
    slow: ms("motion-slow", FALLBACK.slow),
    stage: ms("motion-stage", FALLBACK.stage),
    easeOut: t?.["ease-out"] ?? "cubic-bezier(0.16, 1, 0.3, 1)",
    easeEmphasized: t?.["ease-emphasized"] ?? "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}
