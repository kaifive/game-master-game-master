import { cx } from "@/lib/ui";

/** Wrapping for the holiday games' presents: Stack Attack's boxes and Rapid Recall's squares. */

/** Two loops and a knot, sat on the box's lid. */
export function Bow({ color, inside = false }: { color: string; inside?: boolean }) {
  return (
    <svg
      data-bow
      viewBox="0 0 40 22"
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute left-1/2 -translate-x-1/2 overflow-visible drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]",
        // On a box's lid, poking above it; or tucked inside a square, where there's no room above.
        inside ? "top-[6%] h-[30%]" : "bottom-[calc(100%-5px)] h-[55%] max-h-6 min-h-3",
      )}
    >
      <path d="M20 15 C12 2, 2 4, 5 12 C7 18, 15 17, 20 15 Z" fill={color} />
      <path d="M20 15 C28 2, 38 4, 35 12 C33 18, 25 17, 20 15 Z" fill={color} />
      <path d="M18 16 L13 22 M22 16 L27 22" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="15" r="3.6" fill={color} stroke="rgb(0 0 0 / 0.25)" strokeWidth="1" />
    </svg>
  );
}

/** How a gift square looks: its paper, ribbon and bow colors. */
export type Wrap = { paper: string; ribbon: string; bow?: string };

/** A square wrapped as a present: ribbon both ways, and a bow when it has one. */
export function GiftWrap({ wrap }: { wrap: Wrap }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className="absolute inset-y-0 left-1/2 w-[14%] -translate-x-1/2"
        style={{ background: wrap.ribbon }}
      />
      <span
        className="absolute inset-x-0 top-1/2 h-[14%] -translate-y-1/2"
        style={{ background: wrap.ribbon }}
      />
      {wrap.bow && <Bow color={wrap.bow} inside />}
    </span>
  );
}
