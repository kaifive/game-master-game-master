import type { EventConfig } from "@/lib/events";
import { holidayTrivia } from "./holiday-2026-trivia";
import { wushuTrivia } from "./holiday-2026-wushu-trivia";

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
    {
      // Spec 19: every answer is a wushu word; the instructions don't say so (Khai, 2026-11-13).
      id: "secret-word",
      type: "word",
      title: "Secret Word",
      mode: "solo",
      visibility: "listed",
      content: {
        answers: [
          "SPEAR",
          "SWORD",
          "STAFF",
          "BLADE",
          "FLOOR",
          "HORSE",
          "FRONT",
          "PUNCH",
          "BLOCK",
          "SWEEP",
          "SPLIT",
          "LOTUS",
          "JUMPS",
          "FORMS",
          "KICKS",
          "PALMS",
          "FISTS",
          "COACH",
          "JUDGE",
          "MEDAL",
          "SCORE",
          "STEPS",
          "STAND",
          "SPINS",
          "FLIPS",
          "WUSHU",
          "NANDU",
          "TAOLU",
        ],
      },
      scoring: { awardTo: "player" },
      alwaysOpen: true,
    },
    {
      // Khai, 2026-11-13: club facts and rule codes, apart from the easy holiday set.
      id: "wushu-trivia",
      type: "trivia",
      title: "Wushu Trivia",
      mode: "solo",
      visibility: "listed",
      content: wushuTrivia,
      scoring: { awardTo: "player" },
      alwaysOpen: true,
    },
    // Quick games (spec 16). Open now for testing, like trivia; decide before the party.
    ...(
      [
        ["t-timer", "timer", "T-Timer", { targetSeconds: 7, visibleSeconds: 3 }],
        // Every tap plays the next frame of Coach's spear form (Khai, 2026-11-14): 50 frames
        // sampled evenly from the 2009 Team Trials video, one sprite sheet (scripts/film-sheet.sh).
        [
          "tap-masher",
          "taps",
          "Tap Masher",
          {
            seconds: 5,
            film: {
              sheet: "/events/holiday-2026/tap-form/coach-form.jpg",
              frames: 50,
              columns: 10,
              width: 320,
              height: 240,
              alt: "Coach's spear form at the 2009 US Wushu Team Trials",
            },
          },
        ],
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
      // Spec 21: the 3×3 sliding tile puzzle (Khai, 2026-11-14).
      id: "number-slide",
      type: "slide",
      title: "Number Slide",
      mode: "solo",
      visibility: "listed",
      // A picture instead of numbers (Khai, 2026-11-14): swap in any square photo.
      content: {
        size: 3,
        image: { src: "/events/nova-wushu-logo.png", alt: "The Nova Wushu logo" },
      },
      scoring: { awardTo: "player" },
      alwaysOpen: true,
    },
    {
      // Spec 22: fit the pieces into the board; tap to turn.
      id: "block-fit",
      type: "blocks",
      title: "Block Fit",
      mode: "solo",
      visibility: "listed",
      content: { width: 5, height: 4 },
      scoring: { awardTo: "player" },
      alwaysOpen: true,
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
      // Spec 20: the host rates each photo in Controls (Khai, 2026-11-13).
      id: "spot-and-snipe",
      type: "photo-challenge",
      title: "Spot and Snipe",
      mode: "solo",
      visibility: "listed",
      content: {
        prompt: "Snipe a photo of Coach. The funnier, the more points!",
        // One chance: make it count (Khai, 2026-11-13).
        maxPhotos: 1,
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
      // Off the games list for the party (Khai, 2026-11-13); kept for later.
      visibility: "hidden",
      content: holidayTrivia,
      scoring: { awardTo: "team" },
    },
    {
      id: "jeopardy",
      type: "jeopardy",
      title: "Jeopardy",
      mode: "live",
      phase: "team",
      // Off the games list for the party (Khai, 2026-11-13); kept for later.
      visibility: "hidden",
      content: {},
      scoring: { points: 0, awardTo: "team" },
    },
  ],
};
