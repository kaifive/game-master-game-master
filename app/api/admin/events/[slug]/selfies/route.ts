import { requireAdmin } from "@/lib/admin/server";
import { AppError } from "@/lib/errors";
import { defineRoute } from "@/lib/http";
import { hostSelfieFor, selfiesList, stickersFor, StickersBody } from "@/lib/teams/server";

/** GET: every team's selfie and stickers, for Controls (spec 31). Admin only. */
export const GET = defineRoute({
  auth: requireAdmin,
  handler: ({ params }) => selfiesList(params.slug),
});

/** POST ?teamId=: add or replace a team's selfie, as form data (spec 31). Admin only. */
export const POST = defineRoute({
  auth: requireAdmin,
  handler: ({ params, request }) => {
    const teamId = new URL(request.url).searchParams.get("teamId");
    if (!teamId || teamId.length > 64) throw new AppError("BAD_REQUEST", "Say which team.");
    return hostSelfieFor(params.slug, teamId, request);
  },
});

/** PUT: one team's stickers, saved as the host places them (spec 31). Admin only. */
export const PUT = defineRoute({
  auth: requireAdmin,
  body: StickersBody,
  handler: ({ params, body }) => stickersFor(params.slug, body),
});
