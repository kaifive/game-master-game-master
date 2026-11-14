import { z } from "zod";
import { Media } from "./trivia/content";

/**
 * Photos a picture puzzle slices into its pieces (Number Slide, Block Fit).
 * Each play takes one, by its seed, so replays see different photos.
 */
export const Pictures = z.array(Media).min(1).max(20);
export type Pictures = z.infer<typeof Pictures>;

/** Which photo a play gets: spread by the seed. */
export const pictureFor = (pictures: Pictures, seed: number): number =>
  Math.abs(Math.imul(seed ^ 0x2c1b3c6d, 0x297a2d39) >>> 7) % pictures.length;

/** The photo a play shows, if the game has photos and the play picked one that still exists. */
export const pictureOf = (pictures: Pictures | undefined, index: number | undefined) =>
  pictures && index !== undefined ? pictures[index] : undefined;
