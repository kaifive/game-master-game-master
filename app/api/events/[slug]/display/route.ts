import { defineRoute } from "@/lib/http";
import { displayFor } from "@/lib/teams/server";

/** GET: the display's top 10 and latest awards (spec 05). Public. */
export const GET = defineRoute({ handler: ({ params }) => displayFor(params.slug) });
