import "server-only";
import { EVENTS } from "@/content/events";
import type { EventConfig } from "./model";

/** Event files by slug. Server-only: they hold join codes (ADR-020). */
export const getEvent = (slug: string): EventConfig | undefined => EVENTS[slug];
export const allEvents = (): Record<string, EventConfig> => EVENTS;
