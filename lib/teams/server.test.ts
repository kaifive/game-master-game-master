import { describe, expect, it, vi } from "vitest";
import { GET as display } from "@/app/api/events/[slug]/display/route";
import { GET as leaderboard } from "@/app/api/events/[slug]/leaderboard/route";
import { holiday2026 } from "@/content/events/holiday-2026";
import { setBoardVisibility } from "./service";
import { teamDeps } from "./server";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => ({ value: "live" }) }),
}));

const ctx = { params: Promise.resolve({ slug: holiday2026.slug }) };
const get = (path: string) => new Request(`http://x/api/events/${holiday2026.slug}${path}`);

describe("standings routes", () => {
  it("S07-AC11: hidden standings send no scores to phones or the TV, and come back when shown", async () => {
    const deps = teamDeps();
    await setBoardVisibility(deps, holiday2026, { phones: false, tv: false });
    const phone = (await (await leaderboard(get("/leaderboard"), ctx)).json()) as {
      hidden: boolean;
      top: unknown[];
    };
    expect(phone).toMatchObject({ hidden: true, top: [], me: null, teams: [] });
    const tv = (await (await display(get("/display"), ctx)).json()) as { hidden: boolean };
    expect(tv).toMatchObject({ hidden: true, players: [], teams: [], recent: [] });

    await setBoardVisibility(deps, holiday2026, { phones: true });
    expect(await (await leaderboard(get("/leaderboard"), ctx)).json()).toMatchObject({
      hidden: false,
    });
    expect(await (await display(get("/display"), ctx)).json()).toMatchObject({ hidden: true });
    await setBoardVisibility(deps, holiday2026, { tv: true });
    expect(await (await display(get("/display"), ctx)).json()).toMatchObject({ hidden: false });
  });
});
