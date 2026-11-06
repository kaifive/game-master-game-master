import { AppError } from "@/lib/errors";

/** The failures every TeamRepo raises, so all repos match. */
export const teamErrors = {
  onTeam: () =>
    new AppError("CONFLICT", "You're already on a team.", { details: { reason: "on-team" } }),
  full: () =>
    new AppError("CONFLICT", "That team is full. Pick another.", { details: { reason: "full" } }),
  nameTaken: () =>
    new AppError("CONFLICT", "Another team has that name. Pick another.", {
      details: { reason: "name-taken" },
    }),
  noTeam: () =>
    new AppError("NOT_FOUND", "We couldn't find that team.", { details: { reason: "no-team" } }),
  notMember: () =>
    new AppError("BAD_REQUEST", "The captain has to be on the team.", {
      details: { reason: "not-member" },
    }),
};
