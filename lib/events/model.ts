import { z } from "zod";
import { EntityId, Slug } from "@/lib/ids";
import { StyleRef } from "@/lib/themes";

/** Event and game codes: 5 characters, no look-alikes (no 0/O, 1/I/L). ADR-020. */
export const CODE_PATTERN = /^[A-HJKMNP-Z2-9]{5}$/;

/** Game types the platform knows (spec 08 adds their logic). */
export const GAME_TYPES = [
  "trivia",
  "timer",
  "taps",
  "trail",
  "stacker",
  "recall",
  "jar",
  "cache",
  "photo-challenge",
  "jeopardy",
] as const;

export const EVENT_STATUSES = ["upcoming", "live", "ended"] as const;

/** Which competition is on (ADR-030). Only `both` events switch. */
export const PHASES = ["individual", "team"] as const;
export type Phase = (typeof PHASES)[number];

/** What the host sets at runtime besides the status (spec 03, spec 07). */
export type EventSettings = {
  phase?: Phase;
  maxTeamSize?: number;
  /** The host hides the standings on phones or the TV, say for a reveal (S07-AC11). */
  boardHiddenOnPhones?: boolean;
  boardHiddenOnTv?: boolean;
};
export const EventStatus = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof EventStatus>;

export const GameCode = z.object({
  code: z.string().optional(),
  action: z.enum(["open", "unlock"]),
  unlockScope: z.enum(["player", "event"]).optional(),
  label: z.string().optional(),
});

export const GameConfig = z.object({
  id: EntityId,
  type: z.enum(GAME_TYPES),
  title: z.string().min(1),
  mode: z.enum(["solo", "live"]),
  phase: z.enum(["individual", "team"]).optional(),
  visibility: z.enum(["listed", "hidden"]),
  content: z.unknown(),
  style: z.object({ variant: z.string().optional() }).optional(),
  /** Solo games take the event's soloGamePoints and may not set points (S08-AC10). */
  scoring: z.object({
    points: z.number().int().nonnegative().optional(),
    awardTo: z.enum(["player", "team"]),
  }),
  /** Playable before the host starts the event, too (S08-AC13). Every game closes at the end. */
  alwaysOpen: z.boolean().optional(),
  /** Replaces the game type's default instructions box (S08-AC9). */
  instructions: z
    .object({ title: z.string().min(1), lines: z.array(z.string().min(1)).min(1) })
    .optional(),
  codes: z.array(GameCode).optional(),
});
export type GameConfig = z.infer<typeof GameConfig>;

/** One event, as written in content/events/<slug>.ts (ADR-003). */
export const EventConfig = z
  .object({
    slug: Slug,
    name: z.string().min(1),
    style: StyleRef,
    kind: z.enum(["event", "quick"]),
    /** Server-only (ADR-020): never send to a client. */
    joinCode: z.string(),
    joinPolicy: z.enum(["open", "approval"]),
    scoring: z.enum(["individual", "team", "both"]),
    /** One player per phone; how many times a phone may start over as someone new (ADR-027). */
    restartsPerDevice: z.number().int().min(0).max(10),
    /** Every solo game can be played again; each player's best run counts (S08-AC12). */
    replayable: z.boolean().optional(),
    /** What every solo game is worth; a game scores its share of it (S08-AC10). */
    soloGamePoints: z.number().int().min(0).max(10_000),
    /** Extra words the name filter blocks for this event (spec 02). */
    blockedNames: z.array(z.string().min(1)).optional(),
    games: z.array(GameConfig),
  })
  .strict();
export type EventConfig = z.infer<typeof EventConfig>;

/** What a page may show about an event: everything except codes. */
export type PublicEvent = Omit<
  EventConfig,
  "joinCode" | "games" | "blockedNames" | "replayable"
> & {
  replayable: boolean;
  games: Omit<GameConfig, "codes" | "content" | "instructions">[];
};
