import { apiCall } from "@/lib/players";
import type { GuestsView } from "./service";

/** Browser calls for check-in (spec 32). The code rides in a header; the admin's cookie works too. */
const headers = (code: string | null) => ({
  "content-type": "application/json",
  ...(code ? { "x-checkin-code": code } : {}),
});

export type CheckinAct =
  | { action: "checkIn"; ids: string[]; checkedIn: boolean }
  | { action: "add"; name: string; family?: string };

export type GuestAdminAct =
  | { action: "upload"; csv: string }
  | { action: "tickets"; id: string; extra: number }
  | { action: "remove"; id: string };

export const guestsApi = {
  list: (slug: string, code: string | null) =>
    apiCall<GuestsView>(`/api/events/${slug}/guests`, "", { headers: headers(code) }),
  act: (slug: string, code: string | null, body: CheckinAct) =>
    apiCall<GuestsView>(`/api/events/${slug}/guests`, "", {
      method: "POST",
      headers: headers(code),
      body: JSON.stringify(body),
    }),
  admin: (slug: string, body: GuestAdminAct) =>
    apiCall<GuestsView>(`/api/admin/events/${slug}/guests`, "", {
      method: "POST",
      headers: headers(null),
      body: JSON.stringify(body),
    }),
};
