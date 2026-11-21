import { backupFor, pruneFor, PruneBody, requireAdmin } from "@/lib/admin/server";
import { defineRoute } from "@/lib/http";

/** GET: every photo and kept drawing still in Blob, for `npm run photos:export` (ADR-012). Admin only. */
export const GET = defineRoute({
  auth: requireAdmin,
  handler: ({ params }) => backupFor(params.slug),
});

/** POST: delete them from Blob and mark them archived, for `npm run photos:prune` (ADR-012). Admin only. */
export const POST = defineRoute({
  auth: requireAdmin,
  body: PruneBody,
  handler: ({ body, params }) => pruneFor(params.slug, body),
});
