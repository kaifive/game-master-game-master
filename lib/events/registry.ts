import "server-only";
import { EVENTS } from "@/content/events";
import { AppError } from "@/lib/errors";
import type { EventConfig } from "./model";
import { withoutOffGames } from "./rules";

const LIVE: Record<string, EventConfig> = Object.fromEntries(
  Object.entries(EVENTS).map(([slug, event]) => [slug, withoutOffGames(event)]),
);

/** Event files by slug, without their games that are off. Server-only: they hold join codes (ADR-020). */
export const getEvent = (slug: string): EventConfig | undefined => LIVE[slug];
export const allEvents = (): Record<string, EventConfig> => LIVE;

/** The event for a route's slug, or 404 NOT_FOUND. */
export function requireEvent(slug: string | string[] | undefined): EventConfig {
  const event = typeof slug === "string" ? getEvent(slug) : undefined;
  if (!event) throw new AppError("NOT_FOUND", "We couldn't find that event.");
  return event;
}
