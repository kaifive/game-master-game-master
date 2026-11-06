import { apiCall } from "@/lib/players";
import type { TeamsView } from "./service";

/** Browser calls for teams (spec 03). */

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const teamsApi = {
  view: (slug: string, playerId: string | null) =>
    apiCall<TeamsView>(
      `/api/events/${slug}/teams${playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""}`,
      "",
    ),
  join: (slug: string, token: string, playerId: string, teamId: string) =>
    apiCall<TeamsView>(
      `/api/events/${slug}/teams`,
      token,
      post({ action: "join", playerId, teamId }),
    ),
  name: (slug: string, token: string, playerId: string, name: string) =>
    apiCall<TeamsView>(
      `/api/events/${slug}/teams`,
      token,
      post({ action: "name", playerId, name }),
    ),
  donate: (slug: string, token: string, playerId: string, teamId: string, points: number) =>
    apiCall<TeamsView>(
      `/api/events/${slug}/teams`,
      token,
      post({ action: "donate", playerId, teamId, points }),
    ),
};
