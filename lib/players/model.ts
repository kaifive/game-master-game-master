import { z } from "zod";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 16;

/** What a phone may know about a player. */
export type PlayerSummary = { id: string; nickname: string };

/** A phone's players in one event (spec 02). */
export type DeviceView = { banned: boolean; players: PlayerSummary[] };

/** POST /api/events/[slug]/players. Name rules are checked by the service, not here. */
export const JoinBody = z.object({
  nickname: z.string().max(64),
  code: z.string().max(12).optional(),
});
export type JoinBody = z.infer<typeof JoinBody>;

/** How a phone identifies itself: Firebase anonymous auth, or a dev token without Firebase. */
export type Identity = "firebase" | "dev";
