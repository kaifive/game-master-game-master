import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { PHONE_POLL_MS, PhoneLeaderboard } from "./phone-leaderboard";

type Active = { id: string; nickname: string } | null;
const device = vi.hoisted(() => {
  const state: { active: Active } = { active: { id: "p12", nickname: "Mai" } };
  return state;
});
vi.mock("@/components/players/device", () => ({
  useOptionalDevice: () => ({ active: device.active }),
}));

const top = Array.from({ length: 10 }, (_, i) => ({
  id: `p${String(i)}`,
  rank: i + 1,
  nickname: `P${String(i)}`,
  points: 200 - i * 10,
}));

function stub(body: unknown) {
  const fetch = vi.fn((url: string) => Promise.resolve(Response.json(url ? body : null)));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const board = () =>
  render(
    <PackRoot styleRef={holiday2026.style}>
      <PhoneLeaderboard slug="holiday-2026" />
    </PackRoot>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  device.active = { id: "p12", nickname: "Mai" };
});

describe("PhoneLeaderboard", () => {
  test("S05-AC2: the top 10, then your own place when you're further down", async () => {
    stub({ top, me: { rank: 13, points: 30 } });
    board();
    const list = await screen.findByRole("list", { name: "Leaderboard" });
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThanOrEqual(11);
    expect(within(list).getByText("P0")).toBeInTheDocument();
    expect(within(list).getByText("You")).toBeInTheDocument();
    expect(within(list).getByText("13")).toBeInTheDocument();
  });

  test("S05-AC2: in the top 10 you're highlighted in place, with no extra row", async () => {
    device.active = { id: "p3", nickname: "P3" };
    stub({ top, me: { rank: 4, points: 170 } });
    board();
    const list = await screen.findByRole("list", { name: "Leaderboard" });
    expect(within(list).queryByText("You")).toBeNull();
  });

  test("S05-AC2: refreshes every 15 seconds, and asks for this player's place", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetch = stub({ top: [], me: null });
    board();
    expect(await screen.findByText(/No scores yet/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("playerId=p12");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PHONE_POLL_MS);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
