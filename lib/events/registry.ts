import "server-only";
import { EVENTS } from "@/content/events";
import { AppError } from "@/lib/errors";
import type { EventConfig } from "./model";

/** Event files by slug. Server-only: they hold join codes (ADR-020). */
export const getEvent = (slug: string): EventConfig | undefined => EVENTS[slug];
export const allEvents = (): Record<string, EventConfig> => EVENTS;

/** The event for a route's slug, or 404 NOT_FOUND. */
export function requireEvent(slug: string | string[] | undefined): EventConfig {
  const event = typeof slug === "string" ? getEvent(slug) : undefined;
  if (!event) throw new AppError("NOT_FOUND", "We couldn't find that event.");
  return event;
}
