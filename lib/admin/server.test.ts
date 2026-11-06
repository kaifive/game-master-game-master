import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/events/[slug]/route";
import { DELETE, POST as SIGN_IN } from "@/app/api/admin/session/route";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: () => Promise.reject(new Error("no request")) }));

const signIn = (passphrase: string, ip = "9.9.9.9", url = "http://x/api/admin/session") =>
  SIGN_IN(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ passphrase }),
    }),
    { params: Promise.resolve({}) },
  );

const ctx = { params: Promise.resolve({ slug: "holiday-2026" }) };
const cookieOf = (res: Response) => res.headers.get("set-cookie")?.split(";")[0] ?? "";

beforeEach(() => {
  vi.stubEnv("ADMIN_PASSPHRASE", "snow-dragon");
  (globalThis as { __gmSignInLimiter?: unknown }).__gmSignInLimiter = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin routes", () => {
  it("S06-AC1 S06-AC3: the right passphrase sets a secure, HTTP-only, 7-day cookie", async () => {
    const res = await signIn("snow-dragon", "1.1.1.1", "https://x/api/admin/session");
    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(
      /^gm_admin=\d+\.[\w-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure$/,
    );
    const local = await signIn("snow-dragon", "1.1.1.2");
    expect(local.headers.get("set-cookie")).not.toContain("Secure");
  });

  it("S06-AC1: a wrong passphrase is refused", async () => {
    const res = await signIn("snow-tiger");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "That passphrase isn't right." });
  });

  it("S06-AC2: five wrong tries lock the IP, even for the right passphrase", async () => {
    for (let i = 0; i < 5; i++) await signIn("nope", "2.2.2.2");
    const res = await signIn("snow-dragon", "2.2.2.2");
    expect(res.status).toBe(429);
    expect((await signIn("snow-dragon", "3.3.3.3")).status).toBe(204);
  });

  it("S06-AC6: with no passphrase set, sign-in is refused plainly", async () => {
    vi.stubEnv("ADMIN_PASSPHRASE", "");
    const res = await signIn("anything");
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Admin sign-in isn't set up on this server." });
  });

  it("S06-AC4 S07-AC10: Controls routes need a valid session", async () => {
    expect((await GET(new Request("http://x/"), ctx)).status).toBe(401);
    const forged = new Request("http://x/", {
      headers: { cookie: "gm_admin=99999999999999.fake" },
    });
    expect((await GET(forged, ctx)).status).toBe(401);
    const cookie = cookieOf(await signIn("snow-dragon", "4.4.4.4"));
    const res = await GET(
      new Request("http://x/", { headers: { cookie: `other=1; ${cookie}` } }),
      ctx,
    );
    expect(res.status).toBe(200);
    const view = (await res.json()) as { status: unknown; players: unknown };
    expect(typeof view.status).toBe("string");
    expect(Array.isArray(view.players)).toBe(true);
  });

  it("S06-AC3: changing the passphrase signs everyone out", async () => {
    const cookie = cookieOf(await signIn("snow-dragon", "5.5.5.5"));
    vi.stubEnv("ADMIN_PASSPHRASE", "new-one");
    expect((await GET(new Request("http://x/", { headers: { cookie } }), ctx)).status).toBe(401);
  });

  it("S07-AC10: a Controls action runs and answers with the fresh view; bad bodies are refused", async () => {
    const cookie = cookieOf(await signIn("snow-dragon", "6.6.6.6"));
    const post = (body: unknown) =>
      POST(
        new Request("http://x/", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        ctx,
      );
    expect((await post({ action: "rebuild" })).status).toBe(200);
    expect((await post({ action: "fly" })).status).toBe(400);
    expect(
      (await post({ action: "adjust", playerId: "nobody", points: 5, reason: "x" })).status,
    ).toBe(404);
  });

  it("S06-AC5: sign out clears the cookie", async () => {
    const res = await DELETE(new Request("http://x/", { method: "DELETE" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/^gm_admin=; .*Max-Age=0/);
  });
});
