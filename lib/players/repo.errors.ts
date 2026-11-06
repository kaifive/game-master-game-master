import { AppError } from "@/lib/errors";
import { MESSAGES } from "./rules";

/** The failures every PlayerRepo raises, so all repos match. */
export const joinErrors = {
  banned: () => new AppError("FORBIDDEN", MESSAGES.banned, { details: { reason: "banned" } }),
  taken: () => new AppError("CONFLICT", MESSAGES.taken, { details: { reason: "taken" } }),
  hasPlayer: () =>
    new AppError("CONFLICT", MESSAGES.hasPlayer, { details: { reason: "has-player" } }),
  noRestarts: () =>
    new AppError("CONFLICT", MESSAGES.noRestarts, { details: { reason: "no-restarts" } }),
};
