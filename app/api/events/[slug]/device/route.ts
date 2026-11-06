import { defineRoute } from "@/lib/http";
import { getDevice, requireDevice } from "@/lib/players/server";

/** GET: this phone's players in the event (spec 02). */
export const GET = defineRoute({
  auth: requireDevice,
  handler: ({ auth, params }) => getDevice(params.slug, auth),
});
