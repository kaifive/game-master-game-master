import { apiCall } from "@/lib/players";
import type { HubPlays, PlayResponse } from "./model";

/** Browser calls for games (spec 08). */

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const gamesApi = {
  plays: (slug: string, token: string, playerId: string) =>
    apiCall<{ plays: HubPlays }>(
      `/api/events/${slug}/plays?playerId=${encodeURIComponent(playerId)}`,
      token,
    ),
  start: (slug: string, gameId: string, token: string, playerId: string) =>
    apiCall<PlayResponse>(`/api/events/${slug}/games/${gameId}/play`, token, post({ playerId })),
  move: (
    slug: string,
    gameId: string,
    token: string,
    body: { playerId: string; step: number; move: unknown },
  ) => apiCall<PlayResponse>(`/api/events/${slug}/games/${gameId}/move`, token, post(body)),
};
