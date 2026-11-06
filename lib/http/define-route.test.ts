import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { defineRoute } from "./define-route";

vi.mock("server-only", () => ({}));

const post = (body: unknown, raw = false) =>
  new Request("http://test/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
const ctx = { params: Promise.resolve({ slug: "holiday-2026" }) };
const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("defineRoute", () => {
  test("passes the parsed body and params to the handler and returns its JSON", async () => {
    const route = defineRoute({
      body: z.object({ points: z.number().int().positive() }),
      handler: ({ body, params }) => ({ got: body.points, slug: params.slug }),
    });
    const res = await route(post({ points: 5 }), ctx);
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ got: 5, slug: "holiday-2026" });
  });

  test("rejects a body that doesn't match the schema with 400 and the fields at fault", async () => {
    const handler = vi.fn();
    const route = defineRoute({ body: z.object({ points: z.number() }), handler });
    const res = await route(post({ points: "lots" }), ctx);
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ code: "BAD_REQUEST", fields: ["points"] });
    expect(handler).not.toHaveBeenCalled();
  });

  test("rejects malformed JSON with 400", async () => {
    const route = defineRoute({ body: z.object({}), handler: () => ({}) });
    const res = await route(post("{nope", true), ctx);
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ code: "BAD_REQUEST" });
  });

  test("runs auth first and hands its result to the handler", async () => {
    const route = defineRoute({
      auth: () => Promise.resolve({ playerId: "p1" }),
      handler: ({ auth }) => ({ who: auth.playerId }),
    });
    expect(await json(await route(new Request("http://test"), ctx))).toEqual({ who: "p1" });
  });

  test("stops at auth failures without calling the handler", async () => {
    const handler = vi.fn();
    const route = defineRoute({
      auth: () => Promise.reject(new AppError("NOT_SIGNED_IN", "Join the event first.")),
      handler,
    });
    const res = await route(new Request("http://test"), ctx);
    expect(res.status).toBe(401);
    expect(await json(res)).toEqual({ code: "NOT_SIGNED_IN", error: "Join the event first." });
    expect(handler).not.toHaveBeenCalled();
  });

  test("turns an AppError from the handler into its status and message", async () => {
    const route = defineRoute({
      handler: () => {
        throw new AppError("CONFLICT", "That name is taken.");
      },
    });
    const res = await route(new Request("http://test"), ctx);
    expect(res.status).toBe(409);
    expect(await json(res)).toEqual({ code: "CONFLICT", error: "That name is taken." });
  });

  test("hides unexpected errors behind a generic message and logs them", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const route = defineRoute({
      handler: () => {
        throw new Error("secret internals");
      },
    });
    const res = await route(new Request("http://test"), ctx);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("secret internals");
    expect(logged).toHaveBeenCalled();
  });

  test("answers null when the handler returns nothing", async () => {
    const route = defineRoute({ handler: () => undefined });
    expect(await (await route(new Request("http://test"), ctx)).json()).toBeNull();
  });

  test("can answer with another success status", async () => {
    const route = defineRoute({ status: 201, handler: () => ({ id: "p1" }) });
    expect((await route(new Request("http://test"), ctx)).status).toBe(201);
  });

  test("passes through a response the handler built, such as one setting a cookie", async () => {
    const route = defineRoute({
      handler: () => new Response(null, { status: 204, headers: { "set-cookie": "a=b" } }),
    });
    const res = await route(new Request("http://x/"), { params: Promise.resolve({}) });
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toBe("a=b");
  });
});
