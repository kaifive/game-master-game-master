import { z } from "zod";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 16;

/** What a phone may know about a player. */
export type PlayerSummary = { id: string; nickname: string };

/** A phone in one event: its one player, and how many times it may still start over (spec 02). */
export type DeviceView = { banned: boolean; player: PlayerSummary | null; restartsLeft: number };

/**
 * POST /api/events/[slug]/players. Name rules are checked by the service.
 * `restart` replaces the phone's player, forfeiting the old one (S02-AC7).
 */
export const JoinBody = z.object({
  nickname: z.string().max(64),
  code: z.string().max(12).optional(),
  restart: z.boolean().optional(),
});
export type JoinBody = z.infer<typeof JoinBody>;

/** How a phone identifies itself: Firebase anonymous auth, or a dev token without Firebase. */
export type Identity = "firebase" | "dev";
