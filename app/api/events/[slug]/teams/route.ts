import { defineRoute } from "@/lib/http";
import { requireDevice } from "@/lib/players/server";
import { TeamAction, teamAction, teamsFor } from "@/lib/teams/server";

/** GET ?playerId=: the phase, team size and every team, and that player's team (spec 03). Public. */
export const GET = defineRoute({
  handler: ({ params, request }) =>
    teamsFor(params.slug, new URL(request.url).searchParams.get("playerId")),
});

/** POST: join a team, or name your team as its captain. */
export const POST = defineRoute({
  auth: requireDevice,
  body: TeamAction,
  handler: ({ auth, body, params }) => teamAction(params.slug, auth, body),
});
