import { sendPhoto } from "@/lib/games/server";
import { defineRoute } from "@/lib/http";
import { requireDevice } from "@/lib/players/server";

/** POST: a photo for a photo challenge, as form data (spec 20, ADR-034). */
export const POST = defineRoute({
  auth: requireDevice,
  handler: ({ auth, params, request }) => sendPhoto(params.slug, params.gameId, auth, request),
});
