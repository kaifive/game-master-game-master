import { moveGame, MoveBody } from "@/lib/games/server";
import { defineRoute } from "@/lib/http";
import { requireDevice } from "@/lib/players/server";

/** POST: one move in the player's play, run on the server (spec 08). */
export const POST = defineRoute({
  auth: requireDevice,
  body: MoveBody,
  handler: ({ auth, body, params }) => moveGame(params.slug, params.gameId, auth, body),
});
