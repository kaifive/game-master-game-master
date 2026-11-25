import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { requireAdmin } from "@/lib/admin/server";
import { AppError } from "@/lib/errors";
import { requireEvent } from "@/lib/events/server";
import { codeMatches } from "@/lib/players";
import { guestRepo } from "./runtime";
import {
  AdminGuestAction,
  adminGuestAction,
  CheckinAction,
  checkinAction,
  guestsView,
  type GuestDeps,
} from "./service";

/** Server-only entry for check-in (spec 32). */
export const guestDeps = (): GuestDeps => ({
  guests: guestRepo(),
  now: () => Date.now(),
  id: () => randomUUID().replaceAll("-", "").slice(0, 16),
});

type Slug = string | string[] | undefined;

/** The header the check-in page sends its code in. */
export const CHECKIN_HEADER = "x-checkin-code";

/**
 * Check-in needs the event's join code (Khai, 2026-11-25: easy for helpers,
 * not secret) or the admin session (S32-AC5).
 */
export async function requireCheckin(request: Request, slug: Slug) {
  const event = requireEvent(slug);
  if (codeMatches(request.headers.get(CHECKIN_HEADER) ?? undefined, event.joinCode)) return event;
  try {
    await requireAdmin(request);
    return event;
  } catch {
    throw new AppError("NOT_SIGNED_IN", "That check-in code isn't right.");
  }
}

export { AdminGuestAction, CheckinAction };

export const guestsFor = async (request: Request, slug: Slug) =>
  guestsView(guestDeps(), await requireCheckin(request, slug));
export const runCheckin = async (
  request: Request,
  slug: Slug,
  body: z.infer<typeof CheckinAction>,
) => checkinAction(guestDeps(), await requireCheckin(request, slug), body);
export const runGuestAdmin = (slug: Slug, body: z.infer<typeof AdminGuestAction>) =>
  adminGuestAction(guestDeps(), requireEvent(slug), body);
export { guestRepo };
