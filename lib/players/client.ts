import type { DeviceView, Identity, JoinBody, PlayerSummary } from "./model";
import { MESSAGES } from "./rules";

/** Browser helpers for joining (spec 02): device tokens, the player API and the active player. */

const DEVICE_KEY = "gm.device";

// Local storage can be missing or throw (private mode); nothing here must depend on it.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Only a convenience: the phone just asks again.
  }
}

/** A device id the phone makes for itself when the server runs without Firebase. */
export function devToken(): string {
  let id = read(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    write(DEVICE_KEY, id);
  }
  return `dev:${id}`;
}

/** A token proving which device this is. Firebase loads only when it is used. */
export async function deviceToken(identity: Identity): Promise<string> {
  if (identity === "dev") return devToken();
  const { firebaseDeviceToken } = await import("@/lib/firebase/device");
  return firebaseDeviceToken();
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function apiCall<T>(
  url: string,
  token: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    const res = await fetch(url, { ...init, headers });
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (res.ok) return { ok: true, data: body as T };
    return { ok: false, message: body?.error ?? MESSAGES.notSignedIn };
  } catch {
    return {
      ok: false,
      message: "We couldn't reach the server. Check your connection and try again.",
    };
  }
}

export const playersApi = {
  device: (slug: string, token: string) => apiCall<DeviceView>(`/api/events/${slug}/device`, token),
  join: (slug: string, token: string, body: JoinBody) =>
    apiCall<{ player: PlayerSummary }>(`/api/events/${slug}/players`, token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
};
