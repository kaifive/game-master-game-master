import { requireAdmin } from "@/lib/admin/server";
import { defineRoute } from "@/lib/http";
import { AdminLiveAction, liveForAdmin, runLiveAction } from "@/lib/live/server";

/** GET: the live session for Controls (spec 11). Admin only. */
export const GET = defineRoute({
  auth: requireAdmin,
  handler: ({ params }) => liveForAdmin(params.slug),
});

/** POST: start, Next or end a live game, switch the TV screen, or update Who's played (S11-AC1, S24-AC2, AC9). Admin only. */
export const POST = defineRoute({
  auth: requireAdmin,
  body: AdminLiveAction,
  handler: ({ body, params }) => runLiveAction(params.slug, body),
});
