import { apiCall } from "@/lib/players";
import type { HubPlays, PlayResponse, Seat } from "./model";

/** Browser calls for games (spec 08). */

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const gamesApi = {
  plays: (slug: string, token: string, playerId: string) =>
    apiCall<{ plays: HubPlays; total: number; seat: Seat | null }>(
      `/api/events/${slug}/plays?playerId=${encodeURIComponent(playerId)}`,
      token,
    ),
  start: (slug: string, gameId: string, token: string, playerId: string, again = false) =>
    apiCall<PlayResponse>(
      `/api/events/${slug}/games/${gameId}/play`,
      token,
      post(again ? { playerId, again } : { playerId }),
    ),
  move: (
    slug: string,
    gameId: string,
    token: string,
    body: { playerId: string; step: number; move: unknown },
  ) => apiCall<PlayResponse>(`/api/events/${slug}/games/${gameId}/move`, token, post(body)),
  /** A photo for a photo challenge, as form data (spec 20). */
  photo: (slug: string, gameId: string, token: string, playerId: string, photo: Blob) => {
    const form = new FormData();
    form.append("playerId", playerId);
    form.append("photo", photo, "photo.jpg");
    return apiCall<PlayResponse>(`/api/events/${slug}/games/${gameId}/photo`, token, {
      method: "POST",
      body: form,
    });
  },
};
