/**
 * Ranked points for showdowns (spec 25): the best gets 100, then 70, 50, 30,
 * and 10 for every team after that. Ties share a place and its points, and
 * the next place is skipped (1, 2, 2, 4). A team with no answer scores 0.
 */
export const LADDER = [100, 70, 50, 30] as const;
export const REST = 10;

/** `score` is lower-is-better (a distance, time left); null means no answer. */
export function rankedPoints(
  teams: readonly string[],
  score: (teamId: string) => number | null,
): Record<string, number> {
  const answered = teams
    .map((t) => ({ t, v: score(t) }))
    .filter((x): x is { t: string; v: number } => x.v !== null)
    .sort((a, b) => a.v - b.v);
  const out: Record<string, number> = Object.fromEntries(teams.map((t) => [t, 0]));
  let place = 0;
  answered.forEach((x, i) => {
    const prev = answered[i - 1];
    if (!prev || prev.v !== x.v) place = i;
    out[x.t] = LADDER[place] ?? REST;
  });
  return out;
}

/** Exact 100, one off 50, otherwise 0: Fly-by Count and Snow Sum. */
export const nearPoints = (answer: number | undefined, truth: number) =>
  answer === undefined ? 0 : answer === truth ? 100 : Math.abs(answer - truth) === 1 ? 50 : 0;
