/**
 * The shared clock (S11-AC5): each device estimates how far its clock is
 * from the server's, from replies that carry the server's time. The reply
 * with the shortest round trip gives the best estimate, since the server's
 * time was read somewhere inside that trip, most likely near its middle.
 */
export type ClockSample = { sent: number; received: number; server: number };

/** Server time minus local time, from the best sample; 0 with none. */
export function clockOffset(samples: readonly ClockSample[]): number {
  let best: ClockSample | null = null;
  for (const s of samples)
    if (s.received >= s.sent && (!best || s.received - s.sent < best.received - best.sent))
      best = s;
  return best ? best.server - (best.sent + best.received) / 2 : 0;
}

/** Keeps the few best samples, so one slow reply can't spoil the estimate. */
export function keepBest(
  samples: readonly ClockSample[],
  next: ClockSample,
  max = 8,
): ClockSample[] {
  return [...samples, next]
    .sort((a, b) => a.received - a.sent - (b.received - b.sent))
    .slice(0, max);
}
