import { describe, expect, it, vi } from "vitest";
import { POST as move } from "@/app/api/events/[slug]/games/[gameId]/move/route";
import { POST as play } from "@/app/api/events/[slug]/games/[gameId]/play/route";
import { GET as plays } from "@/app/api/events/[slug]/plays/route";
import { POST as join } from "@/app/api/events/[slug]/players/route";
import { holiday2026 } from "@/content/events/holiday-2026";
import { instructionsFor } from "./server";

vi.mock("server-only", () => ({}));
// The in-memory backend reads the status from a cookie; make every event live.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: () => ({ value: "live" }) }),
}));

const SLUG = "holiday-2026";
const headers = { authorization: "Bearer dev:gamephone01", "content-type": "application/json" };
const post = (path: string, body: unknown) =>
  new Request(`http://x/api/events/${SLUG}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
const ctx = (params: Record<string, string>) => ({
  params: Promise.resolve({ slug: SLUG, ...params }),
});

describe("game routes", () => {
  it("S08-AC2 S08-AC7: start, move and list a play through the real routes", async () => {
    const joined = await join(post("/players", { nickname: "Route Kim", code: "WUSH7" }), ctx({}));
    const { player } = (await joined.json()) as { player: { id: string } };

    const started = await play(
      post("/games/trivia/play", { playerId: player.id }),
      ctx({ gameId: "trivia" }),
    );
    expect(started.status).toBe(200);
    const first = (await started.json()) as { step: number; view: { kind: string } };
    expect(first.view.kind).toBe("question");

    const moved = await move(
      post("/games/trivia/move", {
        playerId: player.id,
        step: first.step,
        move: { type: "answer", choice: 0 },
      }),
      ctx({ gameId: "trivia" }),
    );
    expect(((await moved.json()) as { view: { kind: string } }).view.kind).toBe("answered");

    const listed = await plays(
      new Request(`http://x/api/events/${SLUG}/plays?playerId=${player.id}`, { headers }),
      ctx({}),
    );
    expect(await listed.json()).toEqual({
      plays: { trivia: { status: "playing", best: 0, runs: 1 } },
    });
  });

  it("S08-AC6: a player that isn't on the calling phone can't play", async () => {
    const res = await play(
      post("/games/trivia/play", { playerId: "someone-else" }),
      ctx({ gameId: "trivia" }),
    );
    expect(res.status).toBe(403);
  });

  it("S08-AC9: game pages get the game's instructions", () => {
    expect(instructionsFor(holiday2026, "trivia")?.title).toBe("How to play");
    expect(instructionsFor(holiday2026, "jeopardy")).toBeNull();
  });
});
