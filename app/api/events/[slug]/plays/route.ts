import { playsFor } from "@/lib/games/server";
import { defineRoute } from "@/lib/http";
import { requireDevice } from "@/lib/players/server";

/** GET ?playerId=: that player's plays, for the hub's game list (spec 08). */
export const GET = defineRoute({
  auth: requireDevice,
  handler: ({ auth, params, request }) =>
    playsFor(params.slug, auth, new URL(request.url).searchParams.get("playerId")),
});
