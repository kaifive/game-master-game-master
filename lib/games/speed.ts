/**
 * `base` of the points for solving (half by default), and the rest for speed:
 * all of it at or under `fastMs`, none at `slowMs` (Pathfinder, Number Slide,
 * Block Fit).
 */
export function solveAndSpeedShare(
  tookMs: number,
  fastMs: number,
  slowMs: number,
  base = 0.5,
): number {
  const speed = Math.min(1, Math.max(0, (slowMs - Math.max(tookMs, fastMs)) / (slowMs - fastMs)));
  return base + (1 - base) * speed;
}
