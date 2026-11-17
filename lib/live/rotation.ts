import type { LiveTeam } from "./model";

/**
 * Who's up (S24-AC2): nobody plays again until everyone on their team has
 * had a turn. A team's rotation is the ids who've gone since it last started
 * over, kept for the whole event so turns spread across every showdown.
 */
export type Rotation = Record<string, string[]>;

/** Teammates who can be picked now: everyone not yet used, or everyone once all have gone. */
export function available(team: LiveTeam, used: readonly string[]): string[] {
  const ids = team.members.map((m) => m.id);
  const left = ids.filter((id) => !used.includes(id));
  return left.length > 0 ? left : ids;
}

/** The next teammate in rotation: the first available, in team order (captain first). */
export const nextUp = (team: LiveTeam, used: readonly string[]): string | null =>
  available(team, used)[0] ?? null;

/** The rotation after `playerId` takes a turn: it starts over once everyone has gone. */
export function afterTurn(team: LiveTeam, used: readonly string[], playerId: string): string[] {
  const base = available(team, used).length === team.members.length ? [] : [...used];
  const next = base.includes(playerId) ? base : [...base, playerId];
  return team.members.every((m) => next.includes(m.id)) ? [] : next;
}
