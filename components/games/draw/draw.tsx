"use client";

import { useEffect, useRef, useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { DrawView } from "@/lib/games";
import type { GameRendererProps } from "../types";

type Point = [number, number];
/** Points closer than this (as a share of the canvas) are skipped, so a drawing stays small. */
const MIN_STEP = 0.004;

/** Quick Draw (spec 18): one pen, a square canvas and a clock; the server judges it. */
export function DrawGame({ view: raw, onMove, busy }: GameRendererProps) {
  const { Button } = useSlots();
  const view = raw as DrawView;
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);
  const sent = useRef(false);
  const move = useRef(onMove);
  const endsAt = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [inked, setInked] = useState(false);
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);
  const running = view.kind === "drawing";
  const msLeft = view.kind === "done" ? 0 : view.msLeft;

  const submit = () => {
    if (sent.current) return;
    sent.current = true;
    move.current({ type: "submit", strokes: strokes.current.filter((s) => s.length > 0) });
  };

  useEffect(() => {
    if (!running) return;
    endsAt.current ??= performance.now() + msLeft;
    const t = setInterval(() => {
      const ms = (endsAt.current ?? 0) - performance.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) {
        clearInterval(t);
        if (!sent.current) {
          sent.current = true;
          move.current({ type: "submit", strokes: strokes.current.filter((s) => s.length > 0) });
        }
      }
    }, 200);
    return () => {
      clearInterval(t);
    };
  }, [running, msLeft]);

  if (view.kind === "done") return null;

  const at = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const box = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return [clamp((e.clientX - box.left) / box.width), clamp((e.clientY - box.top) / box.height)];
  };
  const paint = (from: Point | undefined, to: Point) => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    ctx.strokeStyle = getComputedStyle(el).color;
    ctx.lineWidth = el.width / 80;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const [fx, fy] = from ?? to;
    ctx.moveTo(fx * el.width, fy * el.height);
    ctx.lineTo(to[0] * el.width, to[1] * el.height);
    ctx.stroke();
  };

  return (
    <section aria-label="Quick Draw" className="grid gap-3">
      <p className="m-0 font-gm-display text-xl font-bold">{view.prompt}</p>
      <p className="m-0 font-gm-display text-3xl font-bold tabular-nums" aria-live="off">
        {running ? `${String(Math.ceil((left ?? msLeft) / 1000))} s` : `${String(view.seconds)} s`}
      </p>
      <canvas
        ref={canvas}
        width={600}
        height={600}
        aria-label="Drawing area"
        className="aspect-square w-full touch-none rounded-gm bg-gm-surface text-gm-text ring-2 ring-gm-border"
        onPointerDown={(e) => {
          if (!running || sent.current) return;
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = at(e);
          strokes.current.push([p]);
          paint(undefined, p);
          setInked(true);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const stroke = strokes.current[strokes.current.length - 1];
          const last = stroke?.[stroke.length - 1];
          const p = at(e);
          if (!stroke || (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_STEP)) return;
          stroke.push(p);
          paint(last, p);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
      />
      {view.kind === "ready" ? (
        <Button
          size="lg"
          disabled={busy}
          onClick={() => {
            onMove({ type: "start" });
          }}
        >
          Start drawing
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" disabled={busy || !inked} onClick={submit}>
            I&apos;m done
          </Button>
          <Button
            tone="secondary"
            disabled={busy || !inked}
            onClick={() => {
              strokes.current = [];
              const el = canvas.current;
              el?.getContext("2d")?.clearRect(0, 0, el.width, el.height);
              setInked(false);
            }}
          >
            Clear
          </Button>
        </div>
      )}
    </section>
  );
}

export function drawSummary(raw: unknown): string | null {
  const view = raw as DrawView;
  if (view.kind !== "done") return null;
  return view.match === null
    ? "Time ran out before it was sent"
    : `The judge says ${String(Math.round(view.match * 100))}% like the logo`;
}
