"use client";

import { useId, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import { toHex, type ColorView } from "@/lib/games";
import type { GameRendererProps } from "../types";

const CHANNELS = [
  { key: 0, name: "Red" },
  { key: 1, name: "Green" },
  { key: 2, name: "Blue" },
] as const;

/** Color Matcher (spec 18): three sliders and a live swatch; lock in the mix. */
export function ColorGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as ColorView;
  const id = useId();
  const [rgb, setRgb] = useState<[number, number, number]>([128, 128, 128]);
  if (view.kind === "done") return null;
  const hex = toHex(rgb);

  return (
    <section aria-label="Color Matcher" className="grid gap-5 py-2">
      <p className="m-0 font-gm-display text-2xl font-bold">{view.prompt}</p>
      <div
        role="img"
        aria-label={`Your color: red ${String(rgb[0])}, green ${String(rgb[1])}, blue ${String(rgb[2])}`}
        className="h-40 w-full rounded-gm ring-2 ring-gm-border"
        style={{ background: hex }}
      />
      {CHANNELS.map(({ key, name }) => (
        <div key={name} className="grid gap-1">
          <label htmlFor={`${id}-${name}`} className="flex justify-between text-base font-bold">
            <span>{name}</span>
            <span className="text-gm-text-muted tabular-nums">{rgb[key]}</span>
          </label>
          <input
            id={`${id}-${name}`}
            type="range"
            min={0}
            max={255}
            value={rgb[key]}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRgb((c) => {
                const next: [number, number, number] = [...c];
                next[key] = v;
                return next;
              });
            }}
            className="h-11 w-full accent-[var(--gm-accent-ink)]"
          />
        </div>
      ))}
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
  return view.kind === "done"
    ? `${String(view.match)}% match · yours ${view.picked}, the logo ${view.target}`
    : null;
}
