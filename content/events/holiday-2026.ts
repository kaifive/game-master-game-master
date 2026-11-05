import type { EventConfig } from "@/lib/events";

/** The Wushu Holiday Party. Started and ended by hand from Controls (ADR-024). */
export const holiday2026: EventConfig = {
  slug: "holiday-2026",
  name: "Wushu Holiday Party",
  timeZone: "America/New_York",
  schedule: { start: "2026-12-19T16:30:00-05:00" },
  style: { pack: "judges-table", variant: "winter", colorMode: "dark" },
  kind: "event",
  joinCode: "WUSH7",
  joinPolicy: "open",
  scoring: "both",
  maxPlayersPerDevice: 4,
  games: [
    {
      id: "daily-word",
      type: "word-guess",
      title: "Daily Word",
      mode: "solo",
      visibility: "listed",
      content: {},
      scoring: { points: 100, awardTo: "player" },
    },
    {
      id: "ornament-hunt",
      type: "photo-challenge",
      title: "Ornament Hunt",
      mode: "solo",
      visibility: "listed",
      content: {},
      scoring: { points: 50, awardTo: "player" },
    },
    {
      id: "jeopardy",
      type: "jeopardy",
      title: "Jeopardy",
      mode: "live",
      phase: "team",
      visibility: "listed",
      content: {},
      scoring: { points: 0, awardTo: "team" },
    },
  ],
};
