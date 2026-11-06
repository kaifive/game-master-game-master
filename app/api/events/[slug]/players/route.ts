import { defineRoute } from "@/lib/http";
import { JoinBody } from "@/lib/players";
import { joinPlayer, requireDevice } from "@/lib/players/server";

/** POST: join a player to the event from this phone (spec 02). */
export const POST = defineRoute({
  auth: requireDevice,
  body: JoinBody,
  status: 201,
  handler: ({ auth, body, params }) => joinPlayer(params.slug, auth, body),
});
