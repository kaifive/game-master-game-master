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
  name: (slug: string, token: string, playerId: string, name: string, color?: number) =>
    apiCall<TeamsView>(
      `/api/events/${slug}/teams`,
      token,
      post({ action: "name", playerId, name, ...(color !== undefined ? { color } : {}) }),
    ),
  /** The captain's team selfie, shrunk on the phone, before naming (spec 31). */
  selfie: (
    slug: string,
    token: string,
    playerId: string,
    photo: Blob,
    size: { width: number; height: number },
  ) => {
    const form = new FormData();
    form.append("playerId", playerId);
    form.append("photo", photo, "selfie.jpg");
    form.append("width", String(size.width));
    form.append("height", String(size.height));
    return apiCall<{ selfie: true }>(`/api/events/${slug}/teams/selfie`, token, {
      method: "POST",
      body: form,
    });
  },
  donate: (slug: string, token: string, playerId: string, teamId: string, points: number) =>
    apiCall<TeamsView>(
      `/api/events/${slug}/teams`,
      token,
      post({ action: "donate", playerId, teamId, points }),
    ),
};

/** One team's selfie and stickers, as Controls dresses it up (spec 31). */
export type AdminTeamSelfie = {
  teamId: string;
  name: string;
  color: number;
  selfie: { url: string; width: number; height: number } | null;
  stickers: AdminSticker[];
};
export type AdminSticker = {
  id: string;
  kind: string;
  x: number;
  y: number;
  size: number;
  angle: number;
  flip: boolean;
};
export type AdminSelfies = { keeping: boolean; teams: AdminTeamSelfie[] };

/** Controls' calls for team selfies (spec 31); the admin session cookie signs them. */
export const adminSelfiesApi = {
  list: (slug: string) => apiCall<AdminSelfies>(`/api/admin/events/${slug}/selfies`, ""),
  upload: (slug: string, teamId: string, photo: Blob, size: { width: number; height: number }) => {
    const form = new FormData();
    form.append("photo", photo, "selfie.jpg");
    form.append("width", String(size.width));
    form.append("height", String(size.height));
    return apiCall<AdminSelfies>(
      `/api/admin/events/${slug}/selfies?teamId=${encodeURIComponent(teamId)}`,
      "",
      { method: "POST", body: form },
    );
  },
  stickers: (slug: string, teamId: string, stickers: AdminSticker[]) =>
    apiCall<{ ok: true }>(`/api/admin/events/${slug}/selfies`, "", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, stickers }),
    }),
};
