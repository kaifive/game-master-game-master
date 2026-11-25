import { apiCall } from "@/lib/players";
import type { RaffleView } from "@/lib/guests";
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
  /** The raffle (spec 32). */
  raffle: RaffleView;
  /** Said after a raffle step that couldn't go on: "Nobody left to draw." */
  notice?: string;
};

export type AdminLiveAct =
  | { action: "start"; gameId: string }
  /** `at`: the step Next was pressed on; a press for a step that's already passed does nothing. */
  | { action: "next"; at?: { step: string; round: number } }
  | { action: "end" }
  | { action: "host"; act: unknown }
  | { action: "screen"; screen: Screen }
  | { action: "played"; teamId: string; personId: string; played: boolean }
  | { action: "add"; teamId: string; name: string }
  | { action: "remove"; teamId: string; personId: string }
  | { action: "reset"; teamId: string }
  | { action: "raffle"; step: "start" | "stop" | "claim" | "notHere"; drawId?: string };

export const liveApi = {
  /** The caller's view; the token proves a captain's phone (the TV sends none). */
  view: (slug: string, token: string, playerId: string | null, tv = false) =>
    apiCall<LiveView>(
      `/api/events/${slug}/live${playerId ? `?playerId=${encodeURIComponent(playerId)}` : tv ? "?tv=1" : ""}`,
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
