import { CheckinAction, guestsFor, runCheckin } from "@/lib/guests/server";
import { defineRoute } from "@/lib/http";

/** GET: the guest list for check-in (spec 32). Needs the check-in code or the admin session. */
export const GET = defineRoute({
  handler: ({ params, request }) => guestsFor(request, params.slug),
});

/** POST: check guests in or out, or add one at the door (S32-AC3, AC4). */
export const POST = defineRoute({
  body: CheckinAction,
  handler: ({ body, params, request }) => runCheckin(request, params.slug, body),
});
