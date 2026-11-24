"use client";

import { useReducedMotion } from "@/components/motion";
import { cx } from "@/lib/ui";
import type { LiveRenderer } from "./types";

/** One person in the room, drawn simply: a head and shoulders in a team color. */
function Person({ color }: { color: number }) {
  return (
    <svg viewBox="0 0 40 48" aria-hidden="true" className="h-full w-auto">
      <circle cx="20" cy="13" r="10" fill="var(--gm-text-muted)" />
      <path d="M2 48c0-12 8-20 18-20s18 8 18 20Z" fill={`var(--gm-team-${String(color)})`} />
    </svg>
  );
}

/**
 * The room under the demo's TV (Khai, 2026-11-24): people, one saying what a
 * team would answer, so it's clear what's on the screen and what players do.
 */
function Room({ say, size }: { say: string; size: "tv" | "phone" }) {
  return (
    <div
      aria-hidden="true"
      className={cx("flex items-end justify-center gap-[4vh]", size === "tv" ? "h-[9vh]" : "h-14")}
    >
      <Person color={1} />
      <div className="relative h-full">
        <span
          className={cx(
            "absolute bottom-[55%] left-[85%] rounded-gm bg-gm-tile-present px-[0.5em] py-[0.1em] font-gm-display font-bold whitespace-nowrap text-gm-tile-present-ink shadow-md",
            size === "tv" ? "text-[clamp(1.1rem,3vh,2.4rem)]" : "text-lg",
            "after:absolute after:top-[60%] after:right-full after:border-8 after:border-transparent after:border-r-gm-tile-present",
          )}
        >
          {say}
        </span>
        <Person color={2} />
      </div>
      <Person color={4} />
    </div>
  );
}

/**
 * How to play, on the TV (S24-AC4): the game's short looping demo on a drawn
 * TV, the room in front of it with someone calling out an answer, and one
 * line under it. Under reduced motion the demo holds still.
 */
export function DemoFrame({
  renderer,
  line,
  timeout,
  size = "tv",
}: {
  renderer: LiveRenderer | undefined;
  line: string;
  /** What happens if a team runs out of time. */
  timeout?: string | undefined;
  size?: "tv" | "phone";
}) {
  const still = useReducedMotion();
  const Demo = renderer?.Demo;
  return (
    <figure
      aria-label="How to play"
      data-still={still ? "" : undefined}
      className="m-0 grid justify-items-center gap-[2vh] text-center"
    >
      {Demo && (
        <div className="grid justify-items-center gap-[1.5vh]">
          <div
            aria-hidden="true"
            className={cx(
              "grid place-items-center overflow-hidden rounded-gm bg-gm-surface ring-[0.8vh] ring-gm-border",
              size === "tv" ? "aspect-video h-[30vh]" : "aspect-video w-full",
            )}
          >
            <Demo still={still} />
          </div>
          {renderer.say && <Room say={renderer.say} size={size} />}
        </div>
      )}
      <figcaption className="grid max-w-[56ch] gap-[1.2vh]">
        <span
          className={cx(
            "font-gm-display font-bold text-balance",
            size === "tv" ? "text-[clamp(1.4rem,3.4vh,2.6rem)]" : "text-xl",
          )}
        >
          {line}
        </span>
        {timeout && (
          <span
            className={cx(
              "font-bold text-balance text-gm-tile-correct",
              size === "tv" ? "text-[clamp(1.1rem,2.6vh,2rem)]" : "text-lg",
            )}
          >
            {timeout}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
