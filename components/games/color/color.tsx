"use client";

import { useId, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { toHex, type ColorView } from "@/lib/games";
import type { GameRendererProps } from "../types";

type Hsv = { h: number; s: number; v: number };

/** Hue (0–360), saturation and brightness (0–1) to red, green and blue. */
export function hsvToRgb({ h, s, v }: Hsv): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

/** Where a touch on the wheel lands: the angle picks the hue, the distance from the middle how strong. */
export function wheelPick(x: number, y: number): { h: number; s: number } {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  return { h, s: Math.min(1, Math.hypot(dx, dy) / 0.5) };
}

const WHEEL =
  "radial-gradient(closest-side, #fff, rgba(255,255,255,0)), conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

/** Color Matcher (spec 18): a color wheel and a brightness slider; lock in the swatch. */
export function ColorGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as ColorView;
  const id = useId();
  const [hsv, setHsv] = useState<Hsv>({ h: 0, s: 0, v: 0.75 });
  const [dragging, setDragging] = useState(false);
  if (view.kind === "done") return null;
  const hex = toHex(hsvToRgb(hsv));
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
    <section aria-label="Color Matcher" className="grid gap-4 py-2">
      <p className="m-0 font-gm-display text-2xl font-bold">{view.prompt}</p>
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
          onMove({ type: "pick", color: hex });
        }}
      >
        Lock in this color
      </Button>
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
