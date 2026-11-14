"use client";

import { useEffect, useRef, useState } from "react";
import type { TapsFilm, TapsView } from "@/lib/games";
import { cx } from "@/lib/ui";
import type { GameRendererProps } from "../types";

/** The last frame (or "Time!") stays up this long before the result shows. */
export const TAPS_HOLD_MS = 1200;

type Live = Extract<TapsView, { kind: "running" }>;

/** One frame of a film's sprite sheet, as a background. */
function frameStyle(film: TapsFilm, index: number) {
  const rows = Math.ceil(film.frames / film.columns);
  const col = index % film.columns;
  const row = Math.floor(index / film.columns);
  return {
    backgroundImage: `url("${film.sheet}")`,
    backgroundSize: `${String(film.columns * 100)}% ${String(rows * 100)}%`,
    backgroundPosition: `${String(film.columns > 1 ? (col * 100) / (film.columns - 1) : 0)}% ${String(rows > 1 ? (row * 100) / (rows - 1) : 0)}%`,
    aspectRatio: `${String(film.width)} / ${String(film.height)}`,
  };
}

/**
 * Tap Masher (spec 16): a countdown, then as many taps as you can. With a
 * film, every tap plays its next frame, and the last frame ends the run.
 */
export function TapsGame({ view: served, onMove }: GameRendererProps) {
  const raw = served as TapsView;
  // While the result holds, the last screen stays up.
  const [lastLive, setLastLive] = useState<Live | null>(raw.kind === "running" ? raw : null);
  if (raw.kind === "running" && raw !== lastLive) setLastLive(raw);
  const view: TapsView = raw.kind === "done" && lastLive ? lastLive : raw;

  const film = view.kind === "done" ? undefined : view.film;
  const sheet = film?.sheet;
  /** The server's go time on this phone's clock. */
  const serverGo = useRef<number | null>(null);
  const goAt = useRef<number | null>(null);
  const count = useRef(0);
  const sent = useRef(false);
  const [now, setNow] = useState(0);
  const [taps, setTaps] = useState(0);
  const [finished, setFinished] = useState(false);
  // Every frame loads before tapping starts (one sheet); a broken sheet doesn't block the game.
  const [loaded, setLoaded] = useState<string | null>(null);
  const ready = !sheet || loaded === sheet;
  const move = useRef(onMove);
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);
  const running = view.kind === "running";
  const goIn = running ? view.goInMs : 0;
  const seconds = view.kind === "running" ? view.seconds : 0;
  const kind = raw.kind;

  useEffect(() => {
    if (!sheet) return;
    const img = new Image();
    const done = () => {
      setLoaded(sheet);
    };
    img.onload = done;
    img.onerror = done;
    img.src = sheet;
  }, [sheet]);

  // A play made before auto-start still waits on Start: send it for them.
  useEffect(() => {
    if (kind === "ready") move.current({ type: "start" });
  }, [kind]);

  useEffect(() => {
    if (!running) return;
    serverGo.current ??= performance.now() + goIn;
    // Still loading the film: the countdown waits for it (the server allows a late finish).
    if (!ready) return;
    goAt.current ??= Math.max(serverGo.current, performance.now());
    let frame = requestAnimationFrame(function tick() {
      const t = performance.now();
      setNow(t);
      if (sent.current) return;
      if (goAt.current !== null && t >= goAt.current + seconds * 1000) {
        sent.current = true;
        move.current({ type: "finish", taps: count.current });
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running, goIn, seconds, ready]);

  if (view.kind !== "running") return null;

  const toGo =
    goAt.current === null
      ? Math.max(view.goInMs, serverGo.current === null ? 0 : serverGo.current - now)
      : goAt.current - now;
  const tapping = ready && goAt.current !== null && toGo <= 0 && !sent.current;
  const left = Math.max(0, view.seconds * 1000 + toGo);
  const frames = film?.frames ?? 0;

  const tap = () => {
    if (!tapping) return;
    count.current += 1;
    setTaps(count.current);
    // The last frame ends the run at once.
    if (film && count.current >= film.frames) {
      sent.current = true;
      setFinished(true);
      move.current({ type: "finish", taps: count.current });
    }
  };

  return (
    <section aria-label="Tap Masher" className="grid gap-3 text-center">
      <p className="m-0 font-gm-display text-2xl font-bold" aria-live="polite">
        {!ready
          ? "Loading the video…"
          : toGo > 0
            ? `Get ready… ${String(Math.ceil(toGo / 1000))}`
            : finished
              ? "Form complete!"
              : sent.current
                ? "Time!"
                : `${(left / 1000).toFixed(1)} s`}
      </p>
      {film && (
        <figure className="m-0 grid gap-2">
          <div className="relative">
            <div
              role="img"
              aria-label={`${film.alt}: move ${String(Math.min(taps, frames - 1) + 1)} of ${String(frames)}`}
              data-frame={Math.min(taps, frames - 1)}
              className={cx(
                "w-full rounded-gm bg-black bg-no-repeat shadow-lg ring-1 ring-gm-border",
                finished && "ring-4 ring-gm-tile-correct",
              )}
              style={frameStyle(film, Math.min(taps, frames - 1))}
            />
            {finished && (
              <span className="absolute inset-x-0 bottom-3 mx-auto w-max rounded-full bg-gm-tile-correct px-4 py-1 font-gm-display text-xl font-bold text-gm-tile-correct-ink shadow-lg motion-safe:animate-[gm-pop_300ms_ease-out_both]">
                Nailed it!
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Form"
            aria-valuemin={0}
            aria-valuemax={frames}
            aria-valuenow={Math.min(taps, frames)}
            className="h-2 overflow-hidden rounded-full bg-gm-surface ring-1 ring-gm-border"
          >
            <div
              className="h-full rounded-full bg-gm-accent transition-[width] duration-75 motion-reduce:transition-none"
              style={{ width: `${String((Math.min(taps, frames) / frames) * 100)}%` }}
            />
          </div>
        </figure>
      )}
      <button
        type="button"
        disabled={!tapping}
        onPointerDown={(e) => {
          e.preventDefault();
          tap();
        }}
        className={cx(
          "grid w-full touch-none place-items-center rounded-gm bg-gm-accent font-gm-display font-bold text-gm-text-on-accent select-none disabled:opacity-50",
          film ? "h-36 text-6xl" : "aspect-square text-8xl",
        )}
        aria-label={`Tap! ${String(taps)} taps`}
      >
        {film ? `${String(Math.min(taps, frames))}/${String(frames)}` : taps}
      </button>
    </section>
  );
}

export function tapsSummary(raw: unknown): string | null {
  const view = raw as TapsView;
  if (view.kind !== "done") return null;
  if (view.film)
    return view.taps >= view.target
      ? "Finished the whole form!"
      : `${String(view.taps)} of ${String(view.target)} moves`;
  return `${String(view.taps)} taps`;
}
