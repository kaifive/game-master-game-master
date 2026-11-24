"use client";

import { useReducedMotion } from "@/components/motion";
import { cx } from "@/lib/ui";
import type { LiveRenderer } from "./types";

/**
 * One person in the room, seen from behind the sofa: a round, friendly face
 * and a sweater in a team color. The one calling out has an arm up.
 */
function Person({ color, cheering = false }: { color: number; cheering?: boolean }) {
  const sweater = `var(--gm-team-${String(color)})`;
  return (
    <svg viewBox="0 0 48 56" aria-hidden="true" className="h-full w-auto overflow-visible">
      {cheering && (
        <path
          d="M36 36 L44 18"
          stroke={sweater}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
      )}
      <path d="M6 56c0-14 8-22 18-22s18 8 18 22Z" fill={sweater} />
      <path d="M17 35l7 6 7-6" stroke="var(--gm-tile-present)" strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="19" r="12" fill="var(--gm-tile-present)" />
      <circle cx="19.5" cy="18" r="1.8" fill="var(--gm-tile-present-ink)" />
      <circle cx="28.5" cy="18" r="1.8" fill="var(--gm-tile-present-ink)" />
      <path
        d="M19 23.5q5 4.5 10 0"
        stroke="var(--gm-tile-present-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * The room under the demo's TV (Khai, 2026-11-24): people, one saying what a
 * team would answer, so it's clear what's on the screen and what players do.
 */
function Room({ say, size, still }: { say: string; size: "tv" | "phone"; still: boolean }) {
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
            // The call-out pops in once the demo has shown what to answer, each loop.
            !still && "motion-safe:animate-[gm-demo-answer_5s_linear_infinite]",
          )}
        >
          {say}
        </span>
        <Person color={2} cheering />
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
          {renderer.say && <Room say={renderer.say} size={size} still={still} />}
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
