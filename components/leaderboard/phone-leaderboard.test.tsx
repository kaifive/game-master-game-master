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
  const full = { hidden: false, phase: "individual", teams: [], myTeam: null, ...(body as object) };
  const fetch = vi.fn((url: string) => Promise.resolve(Response.json(url ? full : null)));
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
    // Your row says so in words, not only in gold.
    expect(within(list).getByText("P3 (you)")).toBeInTheDocument();
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

  test("S03-AC8: in the team phase, your team's place and the team standings come first", async () => {
    stub({
      top,
      me: { rank: 13, points: 30 },
      phase: "team",
      teams: [
        { id: "t2", rank: 1, name: "Cranes", color: 2, points: 300 },
        { id: "t1", rank: 2, name: "Dragons", color: 1, points: 120 },
      ],
      myTeam: { id: "t1", rank: 2, points: 120 },
    });
    board();
    const teams = await screen.findByRole("list", { name: "Team standings" });
    expect(within(teams).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText(/is/, { selector: "p" })).toHaveTextContent(
      "Dragons is #2 with 120 points",
    );
    expect(screen.getByRole("list", { name: "Leaderboard" })).toBeInTheDocument();
  });

  test("S07-AC11: when the host hides the standings, the tab says so and shows none", async () => {
    stub({ hidden: true, top: [], me: null });
    board();
    expect(await screen.findByText(/keeping the scores secret/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Leaderboard" })).toBeNull();
  });
});
