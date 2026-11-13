import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/**
 * Photo challenge (spec 20): photos for a prompt, rated by the host. Photos
 * arrive through the upload route, never as a phone's move, so a phone can't
 * add a picture from anywhere else.
 */
export const PhotoContent = z
  .object({
    prompt: z.string().min(1).max(200),
    maxPhotos: z.number().int().min(1).max(10).optional(),
  })
  .strict();
export type PhotoContent = z.infer<typeof PhotoContent>;

/** One photo by default: one chance, so make it count (Khai, 2026-11-13). */
export const maxPhotos = (c: PhotoContent) => c.maxPhotos ?? 1;

export type Photo = { id: string; url: string; rating: number | null; at: number };
export type PhotoState = { photos: Photo[]; max: number; step: number };
export type PhotoView = {
  kind: "snapping" | "done";
  prompt: string;
  max: number;
  photos: { id: string; url: string; rating: number | null }[];
};

/** A player's share of the points: their best photo's rating (S20-AC4). */
export const photoShare = (s: PhotoState): number =>
  Math.max(0, ...s.photos.map((p) => p.rating ?? 0)) / 100;

/** Adds an uploaded photo; the route has checked it (S20-AC2). */
export function withPhoto(s: PhotoState, photo: Omit<Photo, "rating">): PhotoState {
  return { ...s, photos: [...s.photos, { ...photo, rating: null }], step: s.step + 1 };
}

/** The host's rating, 0 to 100 (S20-AC4). */
export function withRating(s: PhotoState, photoId: string, rating: number): PhotoState {
  return {
    ...s,
    photos: s.photos.map((p) => (p.id === photoId ? { ...p, rating } : p)),
    step: s.step + 1,
  };
}

const fail = (message: string): MoveResult<PhotoState> => ({ ok: false, message });

export const photo: GameLogic<PhotoContent, PhotoState, PhotoView> = {
  content: PhotoContent,
  // Photos add up inside one play rather than starting again (S20-AC1).
  once: true,
  instructions: (c) => ({
    title: "How to play",
    lines:
      maxPhotos(c) === 1
        ? [
            c.prompt,
            "You get just one photo, so make it count!",
            "Your score shows as soon as the host rates it.",
          ]
        : [
            c.prompt,
            `Send up to ${String(maxPhotos(c))} photos. The host rates each one, and your best counts.`,
            "Your score shows as soon as the host rates them.",
          ],
  }),
  create: (c) => ({ photos: [], max: maxPhotos(c), step: 0 }),
  tick: (s) => s,
  view: (s, c) => ({
    kind: s.photos.length >= s.max ? "done" : "snapping",
    prompt: c.prompt,
    max: s.max,
    photos: s.photos.map(({ id, url, rating }) => ({ id, url, rating })),
  }),
  move: () => fail("Send a photo with the camera button."),
  isOver: (s) => s.photos.length >= s.max,
  waiting: (s) => s.photos.some((p) => p.rating === null),
  score: (s, points) => Math.round(points * photoShare(s)),
  step: (s) => s.step,
};
