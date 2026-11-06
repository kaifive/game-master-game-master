import { AppError } from "@/lib/errors";
import { MESSAGES } from "./rules";

/** Turns a phone's token into its device uid, or null if the token isn't valid. */
export type DeviceVerifier = (token: string) => Promise<string | null>;

/** Tokens a phone makes for itself when the server runs without Firebase. */
export const DEV_TOKEN = /^dev:([A-Za-z0-9_-]{8,64})$/;

export const verifyDevDevice: DeviceVerifier = (token) =>
  Promise.resolve(DEV_TOKEN.exec(token)?.[1] ?? null);

export function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "");
  return match?.[1] ?? null;
}

/** The calling device, or 401 NOT_SIGNED_IN (S02-AC11). */
export async function deviceUid(request: Request, verify: DeviceVerifier): Promise<string> {
  const token = bearerToken(request);
  const uid = token ? await verify(token) : null;
  if (!uid) throw new AppError("NOT_SIGNED_IN", MESSAGES.notSignedIn);
  return uid;
}
