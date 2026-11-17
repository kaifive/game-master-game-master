/**
 * Who's played (S24-AC2, ADR-038): the host's list per team of who has had a
 * showdown turn. Not everyone has a phone, so the host adds names by hand
 * alongside the team's joined players, and marks people as they play.
 */

export type TeamPlayed = {
  /** People the host added by name: no phone. */
  added: { id: string; name: string }[];
  /** Ids (players or added people) marked as having played. */
  played: string[];
};

/** Per team id. Kept for the whole event. */
export type Played = Record<string, TeamPlayed>;

export type RosterPerson = { id: string; name: string; added: boolean; played: boolean };
export type Roster = {
  teamId: string;
  name: string;
  color: number;
  people: RosterPerson[];
  /** How many have played, of how many. */
  done: number;
  total: number;
  /** Everyone has played: the host can start the team over. */
  everyone: boolean;
};

export const MAX_ADDED = 20;
export const MAX_NAME = 28;

const team = (p: Played, teamId: string): TeamPlayed => p[teamId] ?? { added: [], played: [] };

/** One team's list: joined players first, in join order, then added names. */
export function roster(
  t: {
    id: string;
    name: string;
    color: number;
    members: readonly { id: string; nickname: string }[];
  },
  played: Played,
): Roster {
  const mine = team(played, t.id);
  const people: RosterPerson[] = [
    ...t.members.map((m) => ({ id: m.id, name: m.nickname, added: false })),
    ...mine.added.map((a) => ({ ...a, added: true })),
  ].map((p) => ({ ...p, played: mine.played.includes(p.id) }));
  const done = people.filter((p) => p.played).length;
  return {
    teamId: t.id,
    name: t.name,
    color: t.color,
    people,
    done,
    total: people.length,
    everyone: people.length > 0 && done === people.length,
  };
}

/** Marks someone played or not. */
export function markPlayed(p: Played, teamId: string, personId: string, on: boolean): Played {
  const mine = team(p, teamId);
  const rest = mine.played.filter((id) => id !== personId);
  return { ...p, [teamId]: { ...mine, played: on ? [...rest, personId] : rest } };
}

/** Checks a name the host types; returns it trimmed, or a reason it can't be used. */
export function checkName(
  name: string,
): { ok: true; name: string } | { ok: false; message: string } {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, message: "Type a name." };
  if (trimmed.length > MAX_NAME) return { ok: false, message: "That name is too long." };
  return { ok: true, name: trimmed };
}

/** Adds a person with no phone to a team. */
export function addPerson(p: Played, teamId: string, id: string, name: string): Played {
  const mine = team(p, teamId);
  return { ...p, [teamId]: { ...mine, added: [...mine.added, { id, name }] } };
}

/** Removes an added person, and their played mark. */
export function removePerson(p: Played, teamId: string, personId: string): Played {
  const mine = team(p, teamId);
  return {
    ...p,
    [teamId]: {
      added: mine.added.filter((a) => a.id !== personId),
      played: mine.played.filter((id) => id !== personId),
    },
  };
}

/** Clears a team's played marks, keeping the added names. */
export const resetTeam = (p: Played, teamId: string): Played => ({
  ...p,
  [teamId]: { ...team(p, teamId), played: [] },
});
