import { startGame, StartBody } from "@/lib/games/server";
import { defineRoute } from "@/lib/http";
import { requireDevice } from "@/lib/players/server";

/** POST: start or resume the player's play of a game (spec 08). */
export const POST = defineRoute({
  auth: requireDevice,
  body: StartBody,
  handler: ({ auth, body, params }) => startGame(params.slug, params.gameId, auth, body),
});
