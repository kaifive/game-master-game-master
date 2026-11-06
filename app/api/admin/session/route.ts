import { signIn, SignInBody, signOut } from "@/lib/admin/server";
import { defineRoute } from "@/lib/http";

/** POST: sign in with the passphrase (spec 06). */
export const POST = defineRoute({
  body: SignInBody,
  handler: ({ body, request }) => signIn(request, body),
});

/** DELETE: sign out. */
export const DELETE = defineRoute({ handler: ({ request }) => signOut(request) });
