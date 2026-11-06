import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { toPublicEvent, type FinalStandings } from "@/lib/events";
import { DeviceProvider } from "@/components/players/device";
import { HomeCodeEntry } from "./home";
import { EndedView, EventNotFound, LiveView, QuickEventView, UpcomingView } from "./views";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));

const event = toPublicEvent(holiday2026);
const inPack = (node: ReactNode) =>
  render(<PackRoot styleRef={holiday2026.style}>{node}</PackRoot>);

describe("S01-AC4: event pages show the event's banner in its own style", () => {
  test("the banner names the event, with no date (ADR-026)", () => {
    const { container } = inPack(<UpcomingView event={event} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Nova Wushu Holiday Party" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Dec 19|PM|AM/)).toBeNull();
    expect(
      container.querySelector('[data-pack="judges-table"][data-color-mode="dark"]'),
    ).not.toBeNull();
  });
});

describe("S01-AC5: an upcoming event waits for the host and lists its games, locked", () => {
  test("lists every listed game as locked, with no links", () => {
    const closed = { ...event, games: event.games.map((g) => ({ ...g, alwaysOpen: false })) };
    inPack(<UpcomingView event={closed} />);
    expect(screen.getByText("Waiting for the host to start the games.")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Tonight's games" });
    for (const g of event.games) expect(within(list).getByText(g.title)).toBeInTheDocument();
    expect(within(list).queryAllByRole("link")).toHaveLength(0);
    expect(within(list).getAllByText("Locked").length).toBe(closed.games.length);
  });

  test("S08-AC13: an alwaysOpen game can be played before the start", () => {
    inPack(<UpcomingView event={event} />);
    expect(screen.getByText(/Some games are open now/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Holiday Trivia/ })).toHaveAttribute(
      "href",
      "/holiday-2026/play/trivia",
    );
  });

  test("hidden games stay hidden", () => {
    const withHidden = {
      ...event,
      games: [
        ...event.games,
        { ...event.games[0]!, id: "secret", title: "Secret Game", visibility: "hidden" as const },
      ],
    };
    inPack(<UpcomingView event={withHidden} />);
    expect(screen.queryByText("Secret Game")).toBeNull();
  });
});

describe("a live event", () => {
  test("links each game to its page", () => {
    inPack(<LiveView event={event} />);
    expect(screen.getByRole("link", { name: /Holiday Trivia/ })).toHaveAttribute(
      "href",
      "/holiday-2026/play/trivia",
    );
  });
});

describe("S01-AC6: an ended event shows final standings", () => {
  const standings: FinalStandings = {
    teams: [
      { id: "t2", name: "Team Crane", points: 2010, team: 2 },
      { id: "t1", name: "Team Dragon", points: 1840, team: 1 },
    ],
    players: [{ id: "p1", name: "Mai", points: 540 }],
  };

  test("thanks everyone and ranks teams and players", () => {
    inPack(<EndedView event={event} standings={standings} />);
    expect(screen.getByRole("heading", { name: "Thanks for playing" })).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "1. Team Crane, 2,010 points" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "1. Mai, 540 points" })).toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: /Holiday Trivia/ })).toHaveLength(0);
  });

  test("says so when there are no standings", () => {
    inPack(<EndedView event={event} standings={null} />);
    expect(screen.getByText("No scores were recorded for this event.")).toBeInTheDocument();
  });
});

describe("S01-AC7: a quick event's page is its one game", () => {
  test("shows the game itself, not a list", () => {
    const quick = { ...event, kind: "quick" as const, games: [event.games[0]!] };
    inPack(<QuickEventView event={quick} status="live" />);
    expect(screen.getByRole("heading", { level: 2, name: "Holiday Trivia" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tonight's games" })).toBeNull();
  });
});

describe("S01-AC3: unknown events and games get a friendly not-found page", () => {
  test("explains and links home", () => {
    inPack(<EventNotFound what="game" />);
    expect(screen.getByRole("heading", { name: "We couldn't find that game" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
  });
});

describe("S01-AC8: the home page takes a code", () => {
  test("shows the code box and an admin link, and submits the code uppercased", async () => {
    render(<HomeCodeEntry />);
    expect(screen.getByText(/Scan the QR code at your event, or enter a code/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    await userEvent.type(screen.getByLabelText("Code"), "wush7");
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(push).toHaveBeenCalledWith("/join?code=WUSH7");
  });

  test("shows an error after an unknown code", () => {
    render(<HomeCodeEntry error="code" />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't find that code");
  });
});

describe("S08-AC7: the hub lists each game for the active player", () => {
  test("Play, Continue and Done · +N", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          Response.json(
            url.includes("/plays")
              ? {
                  plays: {
                    trivia: { status: "finished", best: 80, runs: 2 },
                    "ornament-hunt": { status: "playing", best: 0, runs: 1 },
                  },
                }
              : { banned: false, players: [{ id: "p1", nickname: "Mai" }] },
          ),
        ),
      ),
    );
    inPack(
      <DeviceProvider slug={event.slug} identity="dev">
        <LiveView event={event} />
      </DeviceProvider>,
    );
    const list = screen.getByRole("list", { name: "Tonight's games" });
    // Trivia is replayable in the party's event file.
    expect(await within(list).findByText("Best 80 · Again →")).toBeInTheDocument();
    expect(within(list).getByText("Continue →")).toBeInTheDocument();
    expect(within(list).getByText("Play →")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
