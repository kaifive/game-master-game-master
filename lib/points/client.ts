import { apiCall } from "@/lib/players";
import type { Ranked } from "./rules";

/** Browser calls for standings (spec 05). Public routes, so no device token is needed. */

export type PhoneStandings = { top: Ranked[]; me: { rank: number; points: number } | null };
export type DisplayAward = {
  id: string;
  nickname: string;
  points: number;
  reason: string;
  at: number;
};
export type DisplayStandings = { players: Ranked[]; recent: DisplayAward[] };

export const standingsApi = {
  phone: (slug: string, playerId: string | null) =>
    apiCall<PhoneStandings>(
      `/api/events/${slug}/leaderboard${playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""}`,
      "",
    ),
  display: (slug: string) => apiCall<DisplayStandings>(`/api/events/${slug}/display`, ""),
};
