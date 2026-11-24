"use client";

import { useId, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { useAutoSubmit } from "../auto-submit";
import { hsvToRgb, toHex, type ColorView } from "@/lib/games";
import type { GameRendererProps } from "../types";

type Hsv = { h: number; s: number; v: number };

/** Hue to RGB lives with the game logic, so dealing colors can use it (spec 30). */
export { hsvToRgb };

/** Where a touch on the wheel lands: the angle picks the hue, the distance from the middle how strong. */
export function wheelPick(x: number, y: number): { h: number; s: number } {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  return { h, s: Math.min(1, Math.hypot(dx, dy) / 0.5) };
}

const WHEEL =
  "radial-gradient(closest-side, #fff, rgba(255,255,255,0)), conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

/**
 * The color wheel, brightness slider and swatch, with Lock in: solo Color
 * Matcher (spec 18) and the captain's phone in its showdown (spec 30).
 */
export function ColorWheel({
  busy,
  onLock,
  closesIn,
}: {
  busy: boolean;
  onLock: (hex: string) => void;
  /** Time left to answer, in ms: a color that's been picked is sent as it runs out. */
  closesIn?: number;
}) {
  const { Button } = useSlots();
  const id = useId();
  const [hsv, setHsvNow] = useState<Hsv>({ h: 0, s: 0, v: 0.75 });
  const [touched, setTouched] = useState(false);
  const setHsv = (next: Hsv | ((c: Hsv) => Hsv)) => {
    setHsvNow(next);
    setTouched(true);
  };
  const [dragging, setDragging] = useState(false);
  const hex = toHex(hsvToRgb(hsv));
  useAutoSubmit(closesIn, touched && !busy, () => {
    onLock(hex);
  });
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const at = wheelPick((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
    setHsv((c) => ({ ...c, ...at }));
  };
  // The dot on the wheel, from the hue and strength.
  const angle = (hsv.h * Math.PI) / 180;
  const dot = {
    left: `${String(50 + Math.sin(angle) * hsv.s * 50)}%`,
    top: `${String(50 - Math.cos(angle) * hsv.s * 50)}%`,
  };
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="relative aspect-square w-3/5 shrink-0 touch-none rounded-full shadow-lg ring-2 ring-gm-border"
          style={{ background: WHEEL }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            pick(e);
          }}
          onPointerMove={(e) => {
            if (dragging) pick(e);
          }}
          onPointerUp={() => {
            setDragging(false);
          }}
        >
          {/* The wheel darkens with the brightness slider, so it shows what you'll get. */}
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-black"
            style={{ opacity: 1 - hsv.v }}
          />
          <span
            className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-[0_0_0_2px_black]"
            style={{ ...dot, background: hex }}
          />
        </div>
        <div
          role="img"
          aria-label={`Your color: ${hex}`}
          className="aspect-square min-w-0 flex-1 rounded-gm shadow-lg ring-2 ring-gm-border"
          style={{ background: hex }}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${id}-v`} className="text-base font-bold">
          Brightness
        </label>
        <input
          id={`${id}-v`}
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          onChange={(e) => {
            setHsv((c) => ({ ...c, v: Number(e.target.value) / 100 }));
          }}
          className="h-11 w-full accent-[var(--gm-accent-ink)]"
        />
      </div>
      {/* The wheel by keyboard or screen reader: the same two choices as sliders. */}
      <div className="sr-only">
        <label htmlFor={`${id}-h`}>Shade around the wheel</label>
        <input
          id={`${id}-h`}
          type="range"
          min={0}
          max={359}
          value={Math.round(hsv.h)}
          onChange={(e) => {
            setHsv((c) => ({ ...c, h: Number(e.target.value) }));
          }}
        />
        <label htmlFor={`${id}-s`}>Strength of the color</label>
        <input
          id={`${id}-s`}
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.s * 100)}
          onChange={(e) => {
            setHsv((c) => ({ ...c, s: Number(e.target.value) / 100 }));
          }}
        />
      </div>
      <Button
        size="lg"
        disabled={busy}
        onClick={() => {
          onLock(hex);
        }}
      >
        Lock in this color
      </Button>
    </div>
  );
}

/** Color Matcher (spec 18): a color wheel and a brightness slider; lock in the swatch. */
export function ColorGame({ view: raw, onMove, busy }: GameRendererProps) {
  const view = raw as ColorView;
  if (view.kind === "done") return null;
  return (
    <section aria-label="Color Matcher" className="grid gap-4 py-2">
      <p className="m-0 font-gm-display text-2xl font-bold">{view.prompt}</p>
      <ColorWheel
        busy={busy}
        onLock={(hex) => {
          onMove({ type: "pick", color: hex });
        }}
      />
    </section>
  );
}

export function colorSummary(raw: unknown): string | null {
  const view = raw as ColorView;
  if (view.kind !== "done") return null;
  return view.target === null
    ? `${String(view.match)}% match`
    : `${String(view.match)}% match · yours ${view.picked}, the logo ${view.target}`;
}
