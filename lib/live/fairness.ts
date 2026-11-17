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
