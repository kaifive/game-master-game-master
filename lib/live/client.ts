import { apiCall } from "@/lib/players";
import type { ControlsLiveView, LiveView } from "./view";

/** Browser calls for live sessions (spec 11). */
const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export type AdminLiveView = ControlsLiveView & {
  games: { id: string; title: string; type: string }[];
};

export const liveApi = {
  /** The caller's view; the token proves a captain's phone (the TV sends none). */
  view: (slug: string, token: string, playerId: string | null) =>
    apiCall<LiveView>(
      `/api/events/${slug}/live${playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""}`,
      token,
    ),
  pick: (slug: string, token: string, playerId: string, round: number, who: string) =>
    apiCall<LiveView>(
      `/api/events/${slug}/live`,
      token,
      post({ action: "pick", playerId, round, who }),
    ),
  move: (slug: string, token: string, playerId: string, round: number, move: unknown) =>
    apiCall<LiveView>(
      `/api/events/${slug}/live`,
      token,
      post({ action: "move", playerId, round, move }),
    ),
};

export const adminLiveApi = {
  view: (slug: string) => apiCall<AdminLiveView>(`/api/admin/events/${slug}/live`, ""),
  act: (
    slug: string,
    body: { action: "start"; gameId: string } | { action: "next" } | { action: "end" },
  ) => apiCall<AdminLiveView>(`/api/admin/events/${slug}/live`, "", post(body)),
};
