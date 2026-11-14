import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";

/** Faster than this isn't a person (S16-AC3). */
export const MAX_TAPS_PER_SECOND = 20;

/**
 * A video cut into frames on one sprite sheet (frames left to right, then row
 * by row): each tap plays the next frame (S16-AC13). Without a `target`,
 * playing them all is the target; with one, the film is just for show and may
 * run longer than anyone can tap. `width` and `height` are one frame's size.
 */
export const Film = z.object({
  sheet: z.string().min(1),
  frames: z.number().int().min(2).max(400),
  columns: z.number().int().min(1).max(50),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
  /** Who the film shows, for the instructions ("Help Coach finish the form!"). */
  who: z.string().min(1).optional(),
  /** The instructions' first line instead, e.g. for a clip of the opening moves. */
  intro: z.string().min(1).max(80).optional(),
});
export type Film = z.infer<typeof Film>;

/** Tap Masher (spec 16): as many taps as you can in a few seconds. */
export const TapsContent = z
  .object({
    seconds: z.number().int().min(2).max(30).optional(),
    target: z.number().int().min(5).max(500).optional(),
    film: Film.optional(),
  })
  .strict()
  // With no target, the frames are the target, so every frame must be reachable in the time.
  .refine(
    (c) =>
      !c.film || c.target !== undefined || c.film.frames <= (c.seconds ?? 5) * MAX_TAPS_PER_SECOND,
    { message: "The film has more frames than anyone can tap in the time." },
  );
export type TapsContent = z.infer<typeof TapsContent>;

const seconds = (c: TapsContent) => c.seconds ?? 5;
const goal = (c: TapsContent) => c.target ?? c.film?.frames ?? 50;

/** The countdown before tapping starts. */
export const COUNTDOWN_MS = 3000;
/** How early a finish may arrive (clocks and network). */
export const EARLY_SLACK_MS = 1000;
/** A run never finished by then times out with no taps. */
export const TIMEOUT_MS = 15_000;

export type TapsState = {
  phase: "ready" | "running" | "done";
  /** When tapping starts: after the countdown. */
  goAt: number | null;
  taps: number;
  seconds: number;
  target: number;
  step: number;
};

export type TapsView =
  | { kind: "ready"; seconds: number; target: number; film?: Film }
  | { kind: "running"; seconds: number; goInMs: number; film?: Film }
  | { kind: "done"; taps: number; target: number; film?: Film };

const Move = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("finish"), taps: z.number().int().nonnegative() }),
]);

const fail = (message: string): MoveResult<TapsState> => ({ ok: false, message });

export const taps: GameLogic<TapsContent, TapsState, TapsView> = {
  content: TapsContent,
  instructions: (c) => ({
    title: "How to play",
    lines: c.film
      ? [
          c.film.intro ?? `Help ${c.film.who ?? "Coach"} finish the form!`,
          `After the countdown, tap the button as fast as you can for ${String(seconds(c))} seconds.`,
          c.target === undefined
            ? "Every tap plays the next move. Finish the whole form for all the points."
            : "Every tap plays the next move. More taps, more points.",
        ]
      : [
          `After the countdown, tap the button as fast as you can for ${String(seconds(c))} seconds.`,
          "More taps, more points.",
        ],
  }),
  // The countdown starts with the game: no second Start button.
  create: (c, _seed, { now }) => ({
    phase: "running",
    goAt: now + COUNTDOWN_MS,
    taps: 0,
    seconds: seconds(c),
    target: goal(c),
    step: 0,
  }),
  tick(s, _c, { now }) {
    if (s.phase !== "running" || s.goAt === null) return s;
    if (now <= s.goAt + s.seconds * 1000 + TIMEOUT_MS) return s;
    return { ...s, phase: "done", step: s.step + 1 };
  },
  view(s, c, { now }) {
    const film = c.film ? { film: c.film } : {};
    if (s.phase === "ready")
      return { kind: "ready", seconds: s.seconds, target: s.target, ...film };
    if (s.phase === "running")
      return { kind: "running", seconds: s.seconds, goInMs: (s.goAt ?? now) - now, ...film };
    return { kind: "done", taps: s.taps, target: s.target, ...film };
  },
  move(s, c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    if (parsed.data.type === "start") {
      if (s.phase !== "ready") return fail("You've already started.");
      return {
        ok: true,
        state: { ...s, phase: "running", goAt: now + COUNTDOWN_MS, step: s.step + 1 },
      };
    }
    if (s.phase !== "running" || s.goAt === null) return fail("Tap Start first.");
    const count = parsed.data.taps;
    // A film ends as soon as its last frame plays, if a person could have tapped that fast (S16-AC13).
    const filmFrames = c.film?.frames;
    const finishedFilm = filmFrames !== undefined && count >= filmFrames;
    const earliest = finishedFilm
      ? s.goAt + (filmFrames / MAX_TAPS_PER_SECOND) * 1000
      : s.goAt + s.seconds * 1000;
    if (now < earliest - EARLY_SLACK_MS) return fail("Time isn't up yet.");
    if (count > s.seconds * MAX_TAPS_PER_SECOND)
      return fail("That's more taps than a person can make.");
    return { ok: true, state: { ...s, phase: "done", taps: count, step: s.step + 1 } };
  },
  isOver: (s) => s.phase === "done",
  score: (s, points) => Math.round(points * Math.min(1, s.taps / s.target)),
  step: (s) => s.step,
};
