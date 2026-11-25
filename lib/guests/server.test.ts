import { describe, expect, it, vi } from "vitest";
import { POST as adminPost } from "@/app/api/admin/events/[slug]/guests/route";
import { GET, POST } from "@/app/api/events/[slug]/guests/route";
import { holiday2026 } from "@/content/events/holiday-2026";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

const ctx = { params: Promise.resolve({ slug: holiday2026.slug }) };
const url = `http://x/api/events/${holiday2026.slug}/guests`;
const req = (code: string | null, body?: unknown) =>
  new Request(url, {
    method: body ? "POST" : "GET",
    headers: {
      "content-type": "application/json",
      ...(code === null ? {} : { "x-checkin-code": code }),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

describe("check-in routes (spec 32)", () => {
  it("S32-AC5: the event's join code opens check-in; a wrong code doesn't; upload and tickets need the admin", async () => {
    const code = holiday2026.joinCode.toLowerCase();
    expect((await GET(req(code), ctx)).status).toBe(200);
    expect((await GET(req("NOPE"), ctx)).status).toBe(401);
    expect((await GET(req(null), ctx)).status).toBe(401);
    const added = await POST(req(code, { action: "add", name: "Walk In" }), ctx);
    expect(added.status).toBe(200);
    expect(((await added.json()) as { here: number }).here).toBeGreaterThan(0);
    const upload = new Request(`http://x/api/admin/events/${holiday2026.slug}/guests`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-checkin-code": code },
      body: JSON.stringify({ action: "upload", csv: "Khai" }),
    });
    expect((await adminPost(upload, ctx)).status).toBe(401);
  });
});
