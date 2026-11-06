import { apiCall } from "@/lib/players";
import type { Ranked, RankedTeam } from "./rules";

/** Browser calls for standings (spec 05). Public routes, so no device token is needed. */

type Phase = "individual" | "team";

export type PhoneStandings = {
  top: Ranked[];
  me: { rank: number; points: number } | null;
  phase: Phase;
  /** Ranked teams, in the team phase only (S03-AC8). */
  teams: RankedTeam[];
  myTeam: { id: string; rank: number; points: number } | null;
};
export type DisplayAward = {
  id: string;
  nickname: string;
  points: number;
  reason: string;
  at: number;
  /** A donation's giver (S03-AC8). */
  from?: string;
};
export type DisplayStandings = {
  phase: Phase;
  players: Ranked[];
  teams: RankedTeam[];
  recent: DisplayAward[];
};

export const standingsApi = {
  phone: (slug: string, playerId: string | null) =>
    apiCall<PhoneStandings>(
      `/api/events/${slug}/leaderboard${playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""}`,
      "",
    ),
  display: (slug: string) => apiCall<DisplayStandings>(`/api/events/${slug}/display`, ""),
};
