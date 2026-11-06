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
    vi.fn(() => Promise.resolve(Response.json(responses[Math.min(i++, responses.length - 1)]))),
  );
}

const show = () =>
  render(
    <PackRoot styleRef={holiday2026.style}>
      <DisplayView
        slug="holiday-2026"
        name="Nova Wushu Holiday Party"
        joinUrl="https://example.app/join?code=WUSH7"
        shortUrl="example.app/join"
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
      within(join).getByRole("img", { name: "QR code for example.app/join" }),
    ).toBeInTheDocument();
    expect(join).toHaveTextContent("example.app/join");
    expect(join).toHaveTextContent("WUSH7");
  });

  test("S05-AC4 S05-AC5: racing bars; new awards since the last update become toasts, none at first", async () => {
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
});
