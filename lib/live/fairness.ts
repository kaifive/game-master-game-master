/**
 * Fair leads (S24-AC6): the order teams go in, rotated so each team leads
 * once per cycle. `cycle` is 0-based: cycle 0 starts with the first team,
 * cycle 1 with the second, and so on round the table.
 */
export function leadOrder<T>(teams: readonly T[], cycle: number): T[] {
  const n = teams.length;
  if (n === 0) return [];
  const shift = ((cycle % n) + n) % n;
  return [...teams.slice(shift), ...teams.slice(0, shift)];
}

/** How many times each team led, given the order of each cycle: for the play tests. */
export function leadCounts(orders: readonly (readonly string[])[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    const lead = order[0];
    if (lead !== undefined) counts[lead] = (counts[lead] ?? 0) + 1;
  }
  return counts;
}

/** Fewest rounds a turn showdown plays, each harder than the last (Khai, 2026-11-24). */
export const MIN_TURN_ROUNDS = 3;

/**
 * Rounds for a turn showdown: at least three, in whole laps of the table so
 * every team leads equally often (S24-AC6). Two teams play 4, three play 3.
 */
export const lapRounds = (teams: number) => {
  const n = Math.max(1, teams);
  return n * Math.ceil(MIN_TURN_ROUNDS / n);
};
