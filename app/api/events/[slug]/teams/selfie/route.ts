import { defineRoute } from "@/lib/http";
import { requireDevice } from "@/lib/players/server";
import { captainSelfieFor } from "@/lib/teams/server";

/** POST: the captain's team selfie, as form data, before the team is named (spec 31). */
export const POST = defineRoute({
  auth: requireDevice,
  handler: ({ auth, params, request }) => captainSelfieFor(params.slug, auth, request),
});
