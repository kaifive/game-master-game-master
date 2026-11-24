/**
 * Showdown points (ADR-045, Khai 2026-11-24): every showdown is worth up to
 * 150 a game, split evenly over its rounds (50 a round over three), and a
 * team scores on how well it did itself, never by how it ranked against the
 * other teams. Points are never negative.
 */
export const GAME_POINTS = 150;

/** One round's share of a game's points. */
export const roundShare = (rounds: number) => GAME_POINTS / Math.max(1, rounds);

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** A round's points for how close a team got, 0 to 1; no answer scores 0. */
export const closePoints = (closeness: number | null | undefined, rounds: number) =>
  closeness === null || closeness === undefined
    ? 0
    : Math.round(clamp01(closeness) * roundShare(rounds));

/** Points for a share of a round's best result (a pot, a present, a prize). */
export const sharePoints = (won: number, best: number, rounds: number) =>
  best <= 0 ? 0 : Math.round(clamp01(won / best) * roundShare(rounds));
