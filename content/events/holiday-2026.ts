import type { EventConfig } from "@/lib/events";
import { holidayTrivia } from "./holiday-2026-trivia";

/** The Nova Wushu Holiday Party. Started and ended by hand from Controls (ADR-024). */
export const holiday2026: EventConfig = {
  slug: "holiday-2026",
  name: "Nova Wushu Holiday Party",
  style: { pack: "judges-table", variant: "winter", colorMode: "dark" },
  kind: "event",
  joinCode: "WUSH7",
  joinPolicy: "open",
  scoring: "both",
  restartsPerDevice: 1,
  soloGamePoints: 100,
  // Games can be played again; each player's best run counts. Decide before the party.
  replayable: true,
  games: [
    {
      id: "trivia",
      type: "trivia",
      title: "Holiday Trivia",
      mode: "solo",
      visibility: "listed",
      content: holidayTrivia,
      scoring: { awardTo: "player" },
      // Open now for testing. Decide before the party (runbooks/event-checklist.md).
      alwaysOpen: true,
    },
    // Quick games (spec 16). Open now for testing, like trivia; decide before the party.
    ...(
      [
        ["t-timer", "timer", "T-Timer", { targetSeconds: 7, visibleSeconds: 3 }],
        ["tap-masher", "taps", "Tap Masher", { seconds: 5, target: 50 }],
        ["pathfinder", "trail", "Pathfinder", { size: 7, checkpoints: 8 }],
        ["stack-attack", "stacker", "Stack Attack", { rows: 12, width: 7 }],
        ["rapid-recall", "recall", "Rapid Recall", {}],
      ] as const
    ).map(([id, type, title, content]) => ({
      id,
      type,
      title,
      mode: "solo" as const,
      visibility: "listed" as const,
      content,
      scoring: { awardTo: "player" as const },
      alwaysOpen: true,
    })),
    {
      // Spec 18: the target is the logo's purple (public/events/nova-wushu-logo.png).
      id: "color-matcher",
      type: "color",
      title: "Color Matcher",
      mode: "solo",
      visibility: "listed",
      content: { target: "#882E7E", prompt: "Pick the color of the Nova Wushu logo" },
      scoring: { awardTo: "player" },
      alwaysOpen: true,
    },
    {
      // Spec 18: judged against the logo's outline (lib/games/draw/nova-logo.ts).
      id: "quick-draw",
      type: "draw",
      title: "Quick Draw",
      mode: "solo",
      visibility: "listed",
      content: {
        prompt: "Draw the Nova Wushu logo from memory",
        reference: "nova-logo",
      },
      scoring: { awardTo: "player" },
      alwaysOpen: true,
      // ADR-032: each drawing is kept in Blob for the host (Controls → Drawings).
      keepDrawings: true,
    },
    {
      // Spec 17: one guess; points when the host scores it in Controls.
      id: "guessing-jar",
      type: "jar",
      title: "Guessing Jar",
      mode: "solo",
      visibility: "listed",
      content: { prompt: "How many candies are in the jar?" },
      scoring: { awardTo: "player" },
      alwaysOpen: true,
    },
    {
      // Spec 17: placeholder codes and spots. Replace them before the party, then print the codes.
      id: "geocache",
      type: "cache",
      title: "Geocache",
      mode: "solo",
      visibility: "listed",
      content: {
        caches: [
          { id: "c1", label: "Placeholder: by the front door", code: "SNOW1" },
          { id: "c2", label: "Placeholder: under the snack table", code: "HOLLY2" },
          { id: "c3", label: "Placeholder: behind the TV", code: "GIFT3" },
        ],
      },
      scoring: { awardTo: "player" },
      alwaysOpen: true,
    },
    {
      // A team game: the captain plays on their phone for the team (spec 03). Placeholder questions.
      id: "team-trivia",
      type: "trivia",
      title: "Team Trivia",
      mode: "solo",
      phase: "team",
      visibility: "listed",
      content: holidayTrivia,
      scoring: { awardTo: "team" },
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
