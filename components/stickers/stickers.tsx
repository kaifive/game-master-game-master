"use client";

import type { CSSProperties, ReactNode } from "react";
import { STICKER_PALETTE } from "@/lib/themes";
import { cx } from "@/lib/ui";

/**
 * The stickers the host puts on team selfies (spec 31), drawn as inline SVG
 * in the event's colors: no emoji, no images. Each is drawn on a viewBox
 * 100 wide, so a sticker's `size` (a share of the photo's width) sizes it.
 */

// Stickers keep their own colors in every theme (lib/themes/stickers.ts).
const RED = "var(--sticker-red)";
const WHITE = "var(--sticker-white)";
const INK = "var(--sticker-ink)";
const GOLD = "var(--sticker-gold)";
const GREEN = "var(--sticker-green)";
const BROWN = "var(--sticker-brown)";

type Art = { name: string; height: number; draw: ReactNode };

export const STICKERS: Record<string, Art> = {
  "santa-hat": {
    name: "Santa hat",
    height: 80,
    draw: (
      <>
        <path d="M14 62C20 30 42 8 66 10c14 1 22 14 24 30-8-6-16-8-22-4L82 62Z" fill={RED} />
        <circle cx="88" cy="44" r="9" fill={WHITE} />
        <rect x="6" y="56" width="84" height="20" rx="10" fill={WHITE} />
      </>
    ),
  },
  "elf-hat": {
    name: "Elf hat",
    height: 90,
    draw: (
      <>
        <path d="M16 70 50 6l34 64Z" fill={GREEN} />
        <path
          d="M50 6c12 2 24 10 30 22"
          stroke={GREEN}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="82" cy="30" r="7" fill={GOLD} />
        <rect x="10" y="64" width="80" height="16" rx="5" fill={GOLD} />
        <path d="M14 72h72" stroke={RED} strokeWidth="4" strokeDasharray="6 6" />
      </>
    ),
  },
  crown: {
    name: "Crown",
    height: 70,
    draw: (
      <>
        <path d="M8 60 4 14l24 22L50 6l22 30 24-22-4 46Z" fill={GOLD} />
        <rect x="8" y="54" width="84" height="12" rx="3" fill={GOLD} />
        <circle cx="50" cy="40" r="7" fill={RED} />
        <circle cx="26" cy="44" r="5" fill={WHITE} />
        <circle cx="74" cy="44" r="5" fill={WHITE} />
      </>
    ),
  },
  antlers: {
    name: "Antlers",
    height: 60,
    draw: (
      <g stroke={BROWN} strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M30 58C24 40 22 26 12 10M22 30 6 26M26 42 12 46M18 18l8-12" />
        <path d="M70 58c6-18 8-32 18-48M78 30l16-4M74 42l14 4M82 18 74 6" />
      </g>
    ),
  },
  mustache: {
    name: "Mustache",
    height: 34,
    draw: (
      <path
        d="M50 12c-8-10-24-10-30 2-6 12-16 14-20 6 0 14 14 18 26 14 10-3 18-8 24-12 6 4 14 9 24 12 12 4 26 0 26-14-4 8-14 6-20-6-6-12-22-12-30-2Z"
        fill={INK}
      />
    ),
  },
  beard: {
    name: "Beard",
    height: 90,
    draw: (
      <path
        d="M4 8c6 4 14 4 20 0 6 8 14 10 26 10s20-2 26-10c6 4 14 4 20 0 2 30-6 56-22 70-8 8-18 12-24 12s-16-4-24-12C10 64 2 38 4 8Z"
        fill={WHITE}
        stroke="var(--sticker-fur-line)"
        strokeWidth="1.5"
      />
    ),
  },
  glasses: {
    name: "Glasses",
    height: 36,
    draw: (
      <g stroke={INK} strokeWidth="5" fill="none">
        <circle cx="26" cy="20" r="14" fill={WHITE} fillOpacity="0.35" />
        <circle cx="74" cy="20" r="14" fill={WHITE} fillOpacity="0.35" />
        <path d="M40 18c6-4 14-4 20 0M12 16 2 10M88 16l10-6" strokeLinecap="round" />
      </g>
    ),
  },
  "bow-tie": {
    name: "Bow tie",
    height: 50,
    draw: (
      <>
        <path d="M6 6 44 20v10L6 44Z" fill={RED} />
        <path d="m94 6-38 14v10l38 14Z" fill={RED} />
        <rect x="40" y="15" width="20" height="20" rx="4" fill={RED} stroke={INK} strokeWidth="2" />
      </>
    ),
  },
  "red-nose": {
    name: "Red nose",
    height: 100,
    draw: (
      <>
        <circle cx="50" cy="50" r="46" fill={RED} />
        <circle cx="36" cy="34" r="12" fill={WHITE} fillOpacity="0.55" />
      </>
    ),
  },
  holly: {
    name: "Holly",
    height: 70,
    draw: (
      <>
        <path
          d="M50 40C40 20 20 14 4 20c8 4 6 12 14 14-6 4-2 12 6 12 4 8 14 6 26-6Z"
          fill={GREEN}
        />
        <path
          d="M50 40c10-20 30-26 46-20-8 4-6 12-14 14 6 4 2 12-6 12-4 8-14 6-26-6Z"
          fill={GREEN}
        />
        <circle cx="44" cy="48" r="8" fill={RED} />
        <circle cx="58" cy="50" r="8" fill={RED} />
        <circle cx="50" cy="60" r="8" fill={RED} />
      </>
    ),
  },
};

export const STICKER_ORDER = Object.keys(STICKERS);

/** One sticker's drawing, filling its box's width. */
export function StickerArt({ kind, className }: { kind: string; className?: string }) {
  const art = STICKERS[kind];
  if (!art) return null;
  return (
    <svg
      viewBox={`0 0 100 ${String(art.height)}`}
      aria-hidden="true"
      className={cx("block h-auto w-full overflow-visible", className)}
      style={STICKER_PALETTE as CSSProperties}
    >
      {art.draw}
    </svg>
  );
}

export type PlacedSticker = {
  id: string;
  kind: string;
  x: number;
  y: number;
  size: number;
  angle: number;
  flip: boolean;
};

/** Where a sticker sits on its photo, by its center, size, angle and flip. */
export const placeSticker = (s: PlacedSticker): CSSProperties => ({
  left: `${String(s.x * 100)}%`,
  top: `${String(s.y * 100)}%`,
  width: `${String(s.size * 100)}%`,
  transform: `translate(-50%, -50%) rotate(${String(s.angle)}deg) scaleX(${s.flip ? -1 : 1})`,
});

/**
 * A team selfie with its stickers on top, back to front. `pop` brings the
 * stickers on one by one (the finale); `children` can add more on top, such
 * as the editor's handles.
 */
export function DressedSelfie({
  url,
  width,
  height,
  stickers,
  alt,
  pop = false,
  className,
  children,
}: {
  url: string;
  width: number;
  height: number;
  stickers: readonly PlacedSticker[];
  alt: string;
  pop?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cx("relative overflow-hidden", className)}
      style={{ aspectRatio: `${String(width)} / ${String(height)}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the team's own upload from Blob */}
      <img
        src={url}
        alt={alt}
        className="absolute inset-0 size-full object-cover select-none"
        draggable={false}
      />
      {stickers.map((s, i) => (
        <div key={s.id} className="pointer-events-none absolute" style={placeSticker(s)}>
          <div
            className={cx(
              pop &&
                "opacity-0 motion-safe:animate-[gm-pop_var(--gm-motion-base)_var(--gm-ease-out)_forwards] motion-reduce:opacity-100",
            )}
            style={pop ? { animationDelay: `${String(600 + i * 450)}ms` } : undefined}
          >
            <StickerArt kind={s.kind} />
          </div>
        </div>
      ))}
      {children}
    </div>
  );
}
