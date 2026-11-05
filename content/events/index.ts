import type { EventConfig } from "@/lib/events";
import { holiday2026 } from "./holiday-2026";

/**
 * Every event, by slug. Server-only: event files hold join codes
 * (ADR-020). Add an event by adding its file and a line here.
 */
export const EVENTS: Record<string, EventConfig> = {
  [holiday2026.slug]: holiday2026,
};
