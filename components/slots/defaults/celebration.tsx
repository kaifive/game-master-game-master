"use client";

import { useEffect, useRef } from "react";
import { fireConfetti } from "@/components/motion/confetti";
import { useMotion, useReducedMotion } from "@/components/motion/hooks";
import { useTheme } from "@/components/theme/context";
import type { MomentKind } from "@/lib/motion";
import type { CelebrationProps } from "@/lib/themes";
import { cx } from "@/lib/ui";

export type DefaultAnimation = "confetti" | "shake" | "callout";

/** Which animation the default Celebration plays for each moment (S14-AC8). */
export const DEFAULT_ANIMATIONS: Record<MomentKind, DefaultAnimation> = {
  "game-finished": "confetti",
  points: "callout",
  "rank-change": "callout",
  "lead-change": "confetti",
  "team-created": "callout",
  "big-donation": "confetti",
  "judged-right": "confetti",
  "judged-wrong": "shake",
  "phase-change": "callout",
  "photo-winner": "confetti",
  "final-standings": "confetti",
};

/**
 * Runs a celebration's side effects once: optional confetti (never under
 * reduced motion), then onDone after the stage duration.
 */
export function useCelebrationTimer(onDone: () => void, confetti: (() => void) | null) {
  const reduced = useReducedMotion();
  const { fast, stage } = useMotion();
  const done = useRef(onDone);
  const fire = useRef(confetti);
  useEffect(() => {
    done.current = onDone;
    fire.current = confetti;
  });
  useEffect(() => {
    if (!reduced) fire.current?.();
    const t = setTimeout(
      () => {
        done.current();
      },
      reduced ? fast : stage,
    );
    return () => {
      clearTimeout(t);
    };
  }, [reduced, fast, stage]);
  return reduced;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/** The default celebration: a callout, with token-colored confetti for big wins. */
export function Celebration({ moment, onDone }: CelebrationProps) {
  const tokens = useTheme()?.tokens ?? {};
  const animation = DEFAULT_ANIMATIONS[moment.kind];
  const colors = [tokens.accent, tokens["tile-correct"], tokens["team-1"], tokens["team-2"]].filter(
    (c): c is string => Boolean(c),
  );
  useCelebrationTimer(
    onDone,
    animation === "confetti" ? () => void fireConfetti({ colors }) : null,
  );
  return (
    <div
      role="status"
      data-slot="celebration"
      data-animation={animation}
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-6"
    >
      <p
        className={cx(
          "m-0 rounded-gm bg-gm-surface-raised px-6 py-4 text-center font-gm-display text-3xl font-bold text-gm-text shadow-xl",
          animation === "shake"
            ? "motion-safe:animate-[gm-shake_var(--gm-motion-base)_ease-in-out]"
            : "motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-emphasized)]",
        )}
      >
        {moment.value !== undefined && (
          <span className="block text-5xl text-gm-accent-ink">{fmt(moment.value)}</span>
        )}
        {moment.text}
      </p>
    </div>
  );
}
