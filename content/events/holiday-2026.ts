import type { EventConfig } from "@/lib/events";
import { holidayTrivia } from "./holiday-2026-trivia";

/** The Nova Wushu Holiday Party. Started and ended by hand from Controls (ADR-024). */
export const holiday2026: EventConfig = {
  slug: "holiday-2026",
  name: "Nova Wushu Holiday Party",
  timeZone: "America/New_York",
  schedule: { start: "2026-12-19T16:30:00-05:00" },
  style: { pack: "judges-table", variant: "winter", colorMode: "dark" },
  kind: "event",
  joinCode: "WUSH7",
  joinPolicy: "open",
  scoring: "both",
  maxPlayersPerDevice: 4,
  soloGamePoints: 100,
  games: [
    {
      id: "trivia",
      type: "trivia",
      title: "Holiday Trivia",
      mode: "solo",
      visibility: "listed",
      content: holidayTrivia,
      scoring: { awardTo: "player" },
    },
    {
      id: "ornament-hunt",
      type: "photo-challenge",
      title: "Ornament Hunt",
      mode: "solo",
      visibility: "listed",
      content: {},
      scoring: { awardTo: "player" },
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
