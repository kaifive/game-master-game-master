import { defineRoute } from "@/lib/http";
import { leaderboardFor } from "@/lib/points/server";

/** GET ?playerId=: the top 10 and that player's place (spec 05). Public. */
export const GET = defineRoute({
  handler: ({ params, request }) =>
    leaderboardFor(params.slug, new URL(request.url).searchParams.get("playerId")),
});
