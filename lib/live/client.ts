import { apiCall } from "@/lib/players";
import type { Screen } from "./model";
import type { Roster } from "./played";
import type { ControlsSessionView, LiveView } from "./view";

/** Browser calls for live sessions (spec 11). */
const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export type AdminLiveView = ControlsSessionView & {
  /** Why each game can't start with the teams there are, or null (S24-AC11). */
  games: { id: string; title: string; type: string; blocked: string | null }[];
  /** Who's played, per team (S24-AC2). */
  played: Roster[];
};

export type AdminLiveAct =
  | { action: "start"; gameId: string }
  | { action: "next" }
  | { action: "end" }
  | { action: "screen"; screen: Screen }
  | { action: "played"; teamId: string; personId: string; played: boolean }
  | { action: "add"; teamId: string; name: string }
  | { action: "remove"; teamId: string; personId: string }
  | { action: "reset"; teamId: string };

export const liveApi = {
  /** The caller's view; the token proves a captain's phone (the TV sends none). */
  view: (slug: string, token: string, playerId: string | null) =>
    apiCall<LiveView>(
      `/api/events/${slug}/live${playerId ? `?playerId=${encodeURIComponent(playerId)}` : ""}`,
      token,
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
  act: (slug: string, body: AdminLiveAct) =>
    apiCall<AdminLiveView>(`/api/admin/events/${slug}/live`, "", post(body)),
};
