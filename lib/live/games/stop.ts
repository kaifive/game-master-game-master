import { z } from "zod";
import type { MoveResult } from "../model";

/**
 * Phone-timed stops (spec 25, Blind Stop and Last Second): the phone times its
 * stop from the shared start, to the hundredth, and the server checks the
 * claim against its own clock, as T-Timer does (spec 16). A stop can't claim a
 * time after it arrived, nor long before (a stale or made-up time).
 */
export type Stops = { startsAt: number; stops: Record<string, number> };

/** How far a phone's time may sit from the server's, for clock error and network lag. */
export const CLOCK_SLACK_MS = 250;
export const MAX_LAG_MS = 3000;

export const StopMove = z.object({ elapsedMs: z.number().int().nonnegative() });

/** A time cut to the hundredth, as the clock shows it. */
export const hundredths = (ms: number) => Math.floor(ms / 10) * 10;

export function acceptStop<S extends Stops>(
  s: S,
  teamId: string,
  move: unknown,
  now: number,
  limitMs: number,
): MoveResult<S> {
  const parsed = StopMove.safeParse(move);
  if (!parsed.success) return { ok: false, message: "That isn't a stop." };
  const claimed = hundredths(parsed.data.elapsedMs);
  const arrived = now - s.startsAt;
  if (arrived < 0) return { ok: false, message: "Not yet!" };
  if (s.stops[teamId] !== undefined) return { ok: false, message: "You've stopped." };
  if (claimed > limitMs) return { ok: false, message: "Time's up." };
  if (claimed > arrived + CLOCK_SLACK_MS || arrived - claimed > MAX_LAG_MS)
    return { ok: false, message: "That stop didn't add up. Check your connection." };
  return { ok: true, state: { ...s, stops: { ...s.stops, [teamId]: claimed } } };
}

export const fmtSeconds = (ms: number) => (hundredths(ms) / 1000).toFixed(2);
