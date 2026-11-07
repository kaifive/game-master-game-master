/** Teams (spec 03, ADR-030). A team plays team games as one player, on its captain's phone. */
export type Team = {
  id: string;
  /** Null until the captain names it; shows as "Team <captain>" until then. */
  name: string | null;
  /** 1–8, into the theme's --gm-team-N colors. */
  color: number;
  captainId: string | null;
  memberIds: string[];
  createdAt: number;
};

export const TEAM_NAME_MAX = 20;
export const TEAM_COLORS = 8;

/** What phones see about a team. */
export type TeamView = {
  id: string;
  name: string;
  named: boolean;
  color: number;
  captain: { id: string; nickname: string } | null;
  members: { id: string; nickname: string }[];
  room: number;
};

/**
 * What phones see of teams, written by the server after every team change
 * (spec 03) so polling phones read one Realtime Database value, not Firestore.
 */
export type TeamsSummary = {
  phase: "individual" | "team";
  maxTeamSize: number;
  teams: TeamView[];
  /** Whether the standings show on phones and on the TV (S07-AC11). */
  board: BoardVisibility;
};

export type BoardVisibility = { phones: boolean; tv: boolean };
export const BOARD_SHOWN: BoardVisibility = { phones: true, tv: true };
