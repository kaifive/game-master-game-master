import { checkName } from "@/lib/players";
import { TEAM_COLORS, TEAM_NAME_MAX, type Team, type TeamView } from "./model";

/** Team names follow the nickname rules, up to 20 characters (S03-AC2). */
export const checkTeamName = (raw: string, blocked: readonly string[] = []) =>
  checkName(raw, blocked, TEAM_NAME_MAX);

/** The next team's color, in order, wrapping after eight (S03-AC2). */
export const nextColor = (teams: readonly Team[]) => (teams.length % TEAM_COLORS) + 1;

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
