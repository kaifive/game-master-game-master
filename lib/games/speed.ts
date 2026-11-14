/**
 * Half the points for solving, and up to half more for speed: all of it at
 * or under `fastMs`, none at `slowMs` (Pathfinder, Number Slide, Block Fit).
 */
export function solveAndSpeedShare(tookMs: number, fastMs: number, slowMs: number): number {
  const speed = Math.min(1, Math.max(0, (slowMs - Math.max(tookMs, fastMs)) / (slowMs - fastMs)));
  return 0.5 + 0.5 * speed;
}
