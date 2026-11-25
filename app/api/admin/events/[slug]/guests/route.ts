import { requireAdmin } from "@/lib/admin/server";
import { AdminGuestAction, runGuestAdmin } from "@/lib/guests/server";
import { defineRoute } from "@/lib/http";

/** POST: upload the RSVP list, set extra tickets, or remove a guest (S32-AC1, AC2, AC7). Admin only. */
export const POST = defineRoute({
  auth: requireAdmin,
  body: AdminGuestAction,
  handler: ({ body, params }) => runGuestAdmin(params.slug, body),
});
