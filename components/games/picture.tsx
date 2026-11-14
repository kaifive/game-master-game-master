import type { CSSProperties } from "react";
import type { Media } from "@/lib/games";

/** How long the ripple takes to show the whole photo once a picture puzzle is solved. */
export const REVEAL_MS = 800;

/**
 * The background that shows one square's slice of a photo cut into a
 * cols × rows grid, turned `deg` degrees (picture puzzles: specs 21, 22).
 */
export function sliceStyle(
  src: string,
  cols: number,
  rows: number,
  [row, col]: readonly [number, number],
  deg = 0,
): CSSProperties {
  return {
    backgroundImage: `url("${src}")`,
    backgroundSize: `${String(cols * 100)}% ${String(rows * 100)}%`,
    backgroundPosition: `${String(cols > 1 ? (col * 100) / (cols - 1) : 0)}% ${String(rows > 1 ? (row * 100) / (rows - 1) : 0)}%`,
    ...(deg % 360 === 0 ? {} : { transform: `rotate(${String(deg)}deg)` }),
  };
}

/**
 * The finished photo, shown by a ripple that spreads from where the last
 * piece went (`x`, `y` in % of the board). Sits over the board, which must be
 * `relative overflow-hidden`. With reduced motion the photo just shows.
 */
export function PictureReveal({
  image,
  x,
  y,
  delayMs = 0,
}: {
  image: Media;
  x: number;
  y: number;
  delayMs?: number;
}) {
  const at = {
    "--gm-reveal-x": `${String(x)}%`,
    "--gm-reveal-y": `${String(y)}%`,
  } as CSSProperties;
  return (
    <div className="pointer-events-none absolute inset-0 z-10" style={at}>
      {/* eslint-disable-next-line @next/next/no-img-element -- already sized for the puzzle */}
      <img
        src={image.src}
        alt={`Solved: ${image.alt}`}
        className="size-full rounded-[inherit] bg-white object-cover motion-safe:animate-[gm-ripple-reveal_var(--gm-reveal-ms)_ease-out_both]"
        style={
          {
            "--gm-reveal-ms": `${String(REVEAL_MS)}ms`,
            animationDelay: `${String(delayMs)}ms`,
          } as CSSProperties
        }
      />
      {[0, 160].map((lag) => (
        <span
          key={lag}
          aria-hidden="true"
          className="absolute aspect-square w-[260%] rounded-full border-4 border-white/80 opacity-0 motion-safe:animate-[gm-ripple-ring_900ms_ease-out_both] motion-reduce:hidden"
          style={{
            left: `${String(x)}%`,
            top: `${String(y)}%`,
            animationDelay: `${String(delayMs + lag)}ms`,
          }}
        />
      ))}
    </div>
  );
}
