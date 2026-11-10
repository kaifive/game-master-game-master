import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { DISPLAY_POLL_MS, DisplayView } from "./display-view";

vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));

const row = (id: string, rank: number, nickname: string, points: number) => ({
  id,
  rank,
  nickname,
  points,
});
const award = (id: string, nickname: string, points: number, reason: string, at: number) => ({
  id,
  nickname,
  points,
  reason,
  at,
});

function serve(...responses: unknown[]) {
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        Response.json({
          hidden: false,
          phase: "individual",
          teams: [],
          ...(responses[Math.min(i++, responses.length - 1)] as object),
        }),
      ),
    ),
  );
}

const show = () =>
  render(
    <PackRoot styleRef={holiday2026.style}>
      <DisplayView
        slug="holiday-2026"
        name="Nova Wushu Holiday Party"
        joinUrl="https://example.app/join?code=WUSH7"
        shortUrl="example.app/join/WUSH7"
        joinCode="WUSH7"
      />
    </PackRoot>,
  );

const next = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DISPLAY_POLL_MS);
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("DisplayView", () => {
  test("S05-AC3: shows the QR code, the short URL and the join code", () => {
    serve({ players: [], recent: [] });
    show();
    const join = screen.getByRole("region", { name: "Join the party" });
    expect(
      within(join).getByRole("img", { name: "QR code for example.app/join/WUSH7" }),
    ).toBeInTheDocument();
    expect(join).toHaveTextContent("example.app/join/WUSH7");
    expect(join).toHaveTextContent("WUSH7");
  });

  test("S05-AC4 S05-AC5: a results board; new awards since the last update become toasts, none at first", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const first = {
      players: [row("p1", 1, "Mai", 60)],
      recent: [award("a1", "Mai", 60, "Holiday Trivia", 1)],
    };
    const second = {
      players: [row("p1", 1, "Mai", 70), row("p2", 2, "Bao", 40)],
      recent: [
        award("a3", "Bao", 40, "Holiday Trivia", 3),
        award("a2", "Mai", 10, "Holiday Trivia · new best", 2),
        ...first.recent,
      ],
    };
    serve(first, second);
    show();
    const bars = await screen.findByRole("list", { name: "Leaderboard" });
    expect(within(bars).getByText("Mai")).toBeInTheDocument();
    expect(screen.queryByText(/Mai \+60/)).toBeNull();
    await next();
    expect(await screen.findByText("Mai +10 · Holiday Trivia · new best")).toBeInTheDocument();
    expect(screen.getByText("Bao +40 · Holiday Trivia")).toBeInTheDocument();
    // The latest points stay on screen beside the board.
    const latest = screen.getByRole("list", { name: "Latest points" });
    expect(within(latest).getAllByRole("listitem")).toHaveLength(3);
    expect(within(latest).getByText("Bao · Holiday Trivia")).toBeInTheDocument();
  });

  test("S05-AC4: the top three stand on a podium, the rest of the top ten in rows below, sized to fit any screen", async () => {
    serve({
      players: Array.from({ length: 10 }, (_, i) =>
        row(`p${String(i)}`, i + 1, `P${String(i + 1)}`, 100 - i),
      ),
      recent: [],
    });
    const { container } = show();
    const board = await screen.findByRole("list", { name: "Leaderboard" });
    const podium = [...board.querySelectorAll("[data-podium]")];
    expect(
      podium.map((li) => [li.getAttribute("aria-label"), li.getAttribute("data-podium")]),
    ).toEqual([
      ["1. P1, 100 points", "1"],
      ["2. P2, 99 points", "2"],
      ["3. P3, 98 points", "3"],
    ]);
    const rest = within(board).getByRole("list", { name: "Places 4 and below" });
    expect(within(rest).getAllByRole("listitem")).toHaveLength(7);
    expect(within(rest).getByLabelText("10. P10, 91 points")).toBeInTheDocument();
    // The page scales with the screen's height as well as its width, so nothing is cut off.
    expect(container.querySelector("style")?.textContent).toMatch(/min\(1\.2vw,2\.1vh\)/);
  });

  test("S05-AC1: tied players share a rank on the bars", async () => {
    serve({
      players: [row("p1", 1, "Mai", 60), row("p2", 2, "Bao", 40), row("p3", 2, "Lan", 40)],
      recent: [],
    });
    show();
    expect(await screen.findByLabelText("2. Lan, 40 points")).toBeInTheDocument();
    expect(screen.getByLabelText("2. Bao, 40 points")).toBeInTheDocument();
  });

  test("S05-AC6: a new leader gets a callout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    serve(
      { players: [row("p1", 1, "Mai", 60), row("p2", 2, "Bao", 40)], recent: [] },
      {
        players: [row("p2", 1, "Bao", 90), row("p1", 2, "Mai", 60)],
        recent: [award("a2", "Bao", 50, "Holiday Trivia · new best", 2)],
      },
    );
    show();
    await screen.findByText("Mai");
    await next();
    expect(await screen.findByText("Bao takes the lead!")).toBeInTheDocument();
  });

  test("an empty board invites people to join", async () => {
    serve({ players: [], recent: [] });
    show();
    expect(await screen.findByText(/No scores yet/)).toBeInTheDocument();
  });

  test("S03-AC8: the team phase shows team bars, the top players, and donation toasts", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const teams = [
      { id: "t1", rank: 1, name: "Dragons", color: 1, points: 200 },
      { id: "t2", rank: 2, name: "Cranes", color: 2, points: 150 },
    ];
    serve(
      { phase: "team", teams, players: [row("p1", 1, "Mai", 60)], recent: [] },
      {
        phase: "team",
        teams,
        players: [row("p1", 1, "Mai", 60)],
        recent: [{ ...award("d1", "Dragons", 50, "Donation", 3), from: "Mai" }],
      },
    );
    show();
    expect(await screen.findByRole("list", { name: "Team standings" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Top players" })).toBeInTheDocument();
    await next();
    expect(await screen.findByText("Mai gave 50 to Dragons")).toBeInTheDocument();
  });

  test("S07-AC11: hidden on the TV, the board says scores are secret, with no toasts or latest points", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    serve(
      { hidden: true, players: [], recent: [] },
      { hidden: true, players: [], recent: [] },
      {
        hidden: false,
        players: [row("p1", 1, "Mai", 60)],
        recent: [award("a1", "Mai", 60, "Holiday Trivia", 1)],
      },
    );
    show();
    expect(await screen.findByText("Scores are secret for now")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Latest points" })).toBeNull();
    await next();
    await next();
    // Shown again: the board is back, and old awards aren't replayed as toasts.
    expect(await screen.findByRole("list", { name: "Leaderboard" })).toBeInTheDocument();
    expect(screen.queryByText(/Mai \+60/)).toBeNull();
  });
});
