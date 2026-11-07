/**
 * Stack Attack's rules as plain functions (spec 16), shared by the phone,
 * which runs the game, and the tests. Positions are whole squares.
 */
export type Bar = { start: number; length: number };

export const START_LENGTH = 3;

/** Squares per second the bar slides on row `row` (0 is the bottom). It speeds up as you climb. */
export const speedFor = (row: number) => 4 + row * 0.75;

/** Where a sliding bar is at `ms`: bouncing between the row's edges, one square at a time. */
export function barStart(width: number, length: number, row: number, ms: number): number {
  const span = width - length;
  if (span <= 0) return 0;
  const steps = Math.floor((ms / 1000) * speedFor(row));
  const cycle = steps % (span * 2);
  return cycle <= span ? cycle : span * 2 - cycle;
}

/** The part of a stopped bar that sits on the bar below; null when it misses completely (S16-AC5). */
export function trim(below: Bar | null, stopped: Bar): Bar | null {
  if (!below) return stopped;
  const start = Math.max(below.start, stopped.start);
  const end = Math.min(below.start + below.length, stopped.start + stopped.length);
  return end > start ? { start, length: end - start } : null;
}
