"use client";

import { useEffect, useId, useState } from "react";
import { useDevice } from "@/components/players/device";
import { useSlots } from "@/components/slots/registry";
import { gamesApi, type PhotoView } from "@/lib/games";
import type { GameRendererProps } from "../types";
import { shrinkPhoto } from "./shrink";

type Picked = { blob: Blob; preview: string };

/**
 * Photo challenge (spec 20): take or pick a photo, check it, send it. Sent
 * photos wait for the host's rating (S20-AC3).
 */
export function PhotoGame({ view: raw, gameId, onPlay }: GameRendererProps) {
  const { Button } = useSlots();
  const { slug, token, active } = useDevice();
  const view = raw as PhotoView;
  const inputId = useId();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The preview's object URL is freed when it's replaced or the screen goes.
  useEffect(
    () => () => {
      if (picked) URL.revokeObjectURL(picked.preview);
    },
    [picked],
  );

  if (view.kind === "done") return null;
  const left = view.max - view.photos.length;

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const blob = await shrinkPhoto(file);
      setPicked({ blob, preview: URL.createObjectURL(blob) });
    } catch {
      setError("We couldn't open that photo. Try another one.");
    }
  };

  const send = async () => {
    if (!picked || !active || !gameId) return;
    setSending(true);
    setError(null);
    const res = await gamesApi.photo(slug, gameId, await token(), active.id, picked.blob);
    setSending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setPicked(null);
    onPlay?.(res.data);
  };

  return (
    <section aria-label="Photo challenge" className="grid gap-4">
      <p className="m-0 text-xl font-bold text-balance">{view.prompt}</p>
      {view.photos.length > 0 && (
        <ul aria-label="Your photos" className="m-0 grid list-none grid-cols-3 gap-2 p-0">
          {view.photos.map((p, i) => (
            <li key={p.id} className="grid gap-1 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- the player's own upload, already shrunk */}
              <img
                src={p.url}
                alt={`Your photo ${String(i + 1)}`}
                className="aspect-square w-full rounded-gm object-cover ring-1 ring-gm-border"
              />
              <span className="text-sm font-bold text-gm-text-muted">
                {p.rating === null ? "Waiting for a rating" : `Rated ${String(p.rating)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {picked ? (
        <div className="grid gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local preview before sending */}
          <img
            src={picked.preview}
            alt="The photo you picked"
            className="max-h-[50dvh] w-full rounded-gm object-contain ring-1 ring-gm-border"
          />
          <Button size="lg" disabled={sending} onClick={() => void send()}>
            {sending ? "Sending…" : "Send it"}
          </Button>
          <Button
            tone="secondary"
            disabled={sending}
            onClick={() => {
              setPicked(null);
            }}
          >
            Pick another
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {/* The label is the button: it opens the camera or the photo library. */}
          <label
            htmlFor={inputId}
            className="grid min-h-14 cursor-pointer place-items-center rounded-gm bg-gm-accent px-5 font-gm-display text-lg font-bold text-gm-text-on-accent focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-gm-accent-ink"
          >
            Take or choose a photo
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void choose(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="m-0 text-center text-sm font-bold text-gm-text-muted">
            {`${String(left)} of ${String(view.max)} ${view.max === 1 ? "photo" : "photos"} left`}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 font-bold text-gm-danger">
          {error}
        </p>
      )}
    </section>
  );
}

export function photoSummary(raw: unknown): string | null {
  const view = raw as PhotoView;
  if (view.kind !== "done") return null;
  const rated = view.photos.filter((p) => p.rating !== null);
  if (rated.length < view.photos.length) return "Points come when the host rates your photos.";
  return `Best rating ${String(Math.max(...rated.map((p) => p.rating ?? 0)))}`;
}
