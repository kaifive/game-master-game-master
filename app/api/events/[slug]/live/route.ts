import { defineRoute } from "@/lib/http";
import { liveForPhone, PlayerLiveAction, runPlayerLiveAction } from "@/lib/live/server";
import { optionalDevice, requireDevice } from "@/lib/players/server";

/** GET ?playerId=: the caller's live view, with the server's time (S11-AC3). Public; a captain proves their phone. */
export const GET = defineRoute({
  auth: optionalDevice,
  handler: ({ auth, params, request }) =>
    liveForPhone(params.slug, new URL(request.url).searchParams.get("playerId"), auth),
});

/** POST: a captain makes a move for their team (S11-AC6). */
export const POST = defineRoute({
  auth: requireDevice,
  body: PlayerLiveAction,
  handler: ({ auth, body, params }) => runPlayerLiveAction(params.slug, auth, body),
});
