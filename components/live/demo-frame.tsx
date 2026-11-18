"use client";

import { useReducedMotion } from "@/components/motion";
import { cx } from "@/lib/ui";
import type { LiveRenderer } from "./types";

/**
 * How to play, on the TV (S24-AC4): the game's short looping demo with one
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
      className="m-0 grid justify-items-center gap-6 text-center"
    >
      {Demo && (
        <div
          aria-hidden="true"
          className={cx(
            "grid place-items-center overflow-hidden rounded-gm bg-gm-surface ring-1 ring-gm-border",
            size === "tv" ? "aspect-video h-[42vh]" : "aspect-video w-full",
          )}
        >
          <Demo still={still} />
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
