import { AppError } from "@/lib/errors";
import { MESSAGES } from "./rules";

/** The failures every PlayerRepo raises from `join`, so all repos match. */
export const joinErrors = {
  banned: () => new AppError("FORBIDDEN", MESSAGES.banned, { details: { reason: "banned" } }),
  taken: () => new AppError("CONFLICT", MESSAGES.taken, { details: { reason: "taken" } }),
  full: () => new AppError("CONFLICT", MESSAGES.full, { details: { reason: "full" } }),
};
