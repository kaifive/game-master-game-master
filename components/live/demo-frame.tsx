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
  size = "tv",
}: {
  renderer: LiveRenderer | undefined;
  line: string;
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
            size === "tv" ? "aspect-video w-[min(70vw,110vh)]" : "aspect-video w-full",
          )}
        >
          <Demo still={still} />
        </div>
      )}
      <figcaption
        className={cx(
          "max-w-[40ch] font-gm-display font-bold text-balance",
          size === "tv" ? "text-[clamp(1.5rem,3.5vmin,3rem)]" : "text-xl",
        )}
      >
        {line}
      </figcaption>
    </figure>
  );
}
