import { checkName } from "@/lib/players";
import { TEAM_COLORS, TEAM_NAME_MAX, type Team, type TeamView } from "./model";

/** Team names follow the nickname rules, up to 20 characters (S03-AC2). */
export const checkTeamName = (raw: string, blocked: readonly string[] = []) =>
  checkName(raw, blocked, TEAM_NAME_MAX);

/**
 * A new team's color until its captain picks one: the first no team holds
 * (S03-AC2, S29-AC1). With at most 6 teams and 8 colors there's always one.
 */
export function nextColor(teams: readonly Team[]): number {
  const held = new Set(teams.map((t) => t.color));
  for (let c = 1; c <= TEAM_COLORS; c++) if (!held.has(c)) return c;
  return (teams.length % TEAM_COLORS) + 1;
}

/** A team as phones see it: its name or "Team <captain>", members and room left (S03-AC3). */
export function viewTeam(
  team: Team,
  nicknameOf: (id: string) => string | undefined,
  maxSize: number,
): TeamView {
  const members = team.memberIds.flatMap((id) => {
    const nickname = nicknameOf(id);
    return nickname ? [{ id, nickname }] : [];
  });
  const captainName = team.captainId ? nicknameOf(team.captainId) : undefined;
  return {
    id: team.id,
    name: team.name ?? (captainName ? `Team ${captainName}` : "New team"),
    named: team.name !== null,
    color: team.color,
    captain: team.captainId && captainName ? { id: team.captainId, nickname: captainName } : null,
    members,
    room: Math.max(0, maxSize - team.memberIds.length),
  };
}
