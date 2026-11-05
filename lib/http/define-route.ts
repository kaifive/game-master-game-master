import "server-only";
import type { z } from "zod";
import { AppError, isAppError } from "@/lib/errors";
import { log } from "@/lib/log";

type Params = Record<string, string | string[]>;
type NextContext = { params: Promise<Params> };

type RouteConfig<B extends z.ZodType | undefined, A, R> = {
  /** Schema for the JSON body. Leave out for routes without a body. */
  body?: B;
  /** Resolves who is calling (player, admin) or throws an AppError. */
  auth?: (request: Request) => Promise<A>;
  /** Success status. Defaults to 200. */
  status?: number;
  handler: (ctx: {
    body: B extends z.ZodType ? z.infer<B> : undefined;
    auth: A;
    params: Params;
    request: Request;
  }) => R | Promise<R>;
};

const errorResponse = (err: AppError) =>
  Response.json({ code: err.code, error: err.message, ...err.details }, { status: err.status });

async function readBody(request: Request, schema: z.ZodType): Promise<unknown> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Something in the request isn't right.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))];
    throw new AppError("BAD_REQUEST", "Something in the request isn't right.", {
      details: { fields },
    });
  }
  return parsed.data;
}

/**
 * The one way to write a route handler: auth, body validation and error
 * mapping happen here, so route files only call a service (ADR-016).
 */
export function defineRoute<
  B extends z.ZodType | undefined = undefined,
  A = undefined,
  R = unknown,
>(config: RouteConfig<B, A, R>) {
  return async (request: Request, context: NextContext): Promise<Response> => {
    try {
      const auth = (config.auth ? await config.auth(request) : undefined) as A;
      const body = (config.body ? await readBody(request, config.body) : undefined) as Parameters<
        typeof config.handler
      >[0]["body"];
      const params = await context.params;
      const result = await config.handler({ body, auth, params, request });
      return Response.json(result ?? null, { status: config.status ?? 200 });
    } catch (err) {
      if (isAppError(err)) return errorResponse(err);
      log.error("route failed", { url: request.url, method: request.method, err });
      return errorResponse(new AppError("INTERNAL", "Something went wrong. Try again."));
    }
  };
}
