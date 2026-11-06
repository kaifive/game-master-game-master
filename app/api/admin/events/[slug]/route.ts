import { ControlsAction, controlsFor, requireAdmin, runAction } from "@/lib/admin/server";
import { defineRoute } from "@/lib/http";

/** GET: the event's status and players, for Controls (spec 07). Admin only. */
export const GET = defineRoute({
  auth: requireAdmin,
  handler: ({ params }) => controlsFor(params.slug),
});

/** POST: one Controls action, answered with the updated view. Admin only. */
export const POST = defineRoute({
  auth: requireAdmin,
  body: ControlsAction,
  handler: ({ body, params }) => runAction(params.slug, body),
});
