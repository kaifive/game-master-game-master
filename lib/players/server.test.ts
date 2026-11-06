import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/events/[slug]/device/route";
import { POST } from "@/app/api/events/[slug]/players/route";
import { deviceIdentity } from "./server";

vi.mock("server-only", () => ({}));

// The real player routes, on the in-memory backend used without Firebase.
const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const auth = (device: string) => ({ authorization: `Bearer dev:${device}` });

const getDevice = (device: string | null, slug = "holiday-2026") =>
  GET(
    new Request(`http://x/api/events/${slug}/device`, device ? { headers: auth(device) } : {}),
    ctx(slug),
  );

const postPlayer = (device: string, body: unknown, slug = "holiday-2026") =>
  POST(
    new Request(`http://x/api/events/${slug}/players`, {
      method: "POST",
      headers: { ...auth(device), "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx(slug),
  );

describe("player routes", () => {
  it("S02-AC1 S02-AC2: a phone joins and then sees its player", async () => {
    const res = await postPlayer("routephone01", { nickname: "Route Mai", code: "WUSH7" });
    expect(res.status).toBe(201);
    const { player } = (await res.json()) as { player: { id: string; nickname: string } };
    expect(player.nickname).toBe("Route Mai");
    const device = await getDevice("routephone01");
    expect(await device.json()).toEqual({ banned: false, players: [player] });
  });

  it("S02-AC11: refuses calls without a device token", async () => {
    const res = await getDevice(null);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "NOT_SIGNED_IN" });
  });

  it("S02-AC3: refuses a body that isn't a join request", async () => {
    expect((await postPlayer("routephone02", { name: "Mai" })).status).toBe(400);
  });

  it("answers 404 for an unknown event", async () => {
    expect((await getDevice("routephone03", "no-such-party")).status).toBe(404);
    expect((await postPlayer("routephone03", { nickname: "Mai" }, "no-such-party")).status).toBe(
      404,
    );
  });

  it("tells phones to use dev tokens when the server runs without Firebase", () => {
    expect(deviceIdentity()).toBe("dev");
  });
});
