import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { toPublicEvent, type FinalStandings } from "@/lib/events";
import { DeviceProvider } from "@/components/players/device";
import { HomeCodeEntry } from "./home";
import {
  EndedView,
  EventNotFound,
  GameView,
  LeaderboardView,
  LiveView,
  QuickEventView,
  hubRows,
  teamGameBlock,
  TeamView,
  UpcomingView,
} from "./views";

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
    const list = screen.getByRole("region", { name: "Tonight's games" });
    for (const g of event.games) expect(within(list).getByText(g.title)).toBeInTheDocument();
    expect(within(list).queryAllByRole("link")).toHaveLength(0);
    // Games a phone can play are locked; the rest say why they aren't up for grabs.
    expect(within(list).getAllByText("Locked").length).toBe(2);
    expect(within(list).getByText("Coming soon")).toBeInTheDocument();
    expect(within(list).getByText("On the TV when the host starts it")).toBeInTheDocument();
    // Nothing is up for grabs yet: every game is coming up, on a blank card.
    expect(within(list).getByRole("list", { name: "Coming up" })).toBeInTheDocument();
    expect(within(list).queryByRole("list", { name: "Up for grabs" })).toBeNull();
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
    expect(screen.getByRole("heading", { level: 1, name: "Holiday Trivia" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Tonight's games" })).toBeNull();
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
  test("grouped as scored and coming up, each with its score card; nothing unplayable says Play", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          Response.json(
            url.includes("/leaderboard")
              ? { top: [], me: null, phase: "individual", teams: [], myTeam: null }
              : url.includes("/teams")
                ? { phase: "individual", maxTeamSize: 1, teams: [], mine: null }
                : url.includes("/plays")
                  ? {
                      plays: {
                        trivia: { status: "finished", best: 80, runs: 2 },
                        "ornament-hunt": { status: "playing", best: 0, runs: 1 },
                      },
                      total: 80,
                    }
                  : { banned: false, player: { id: "p1", nickname: "Mai" }, restartsLeft: 1 },
          ),
        ),
      ),
    );
    inPack(
      <DeviceProvider slug={event.slug} identity="dev">
        <LiveView event={event} />
      </DeviceProvider>,
    );
    const list = await screen.findByRole("region", { name: "Tonight's games" });
    // Trivia is replayable in the party's event file: scored, and open again.
    const scored = await within(list).findByRole("list", { name: "Scored" });
    expect(within(scored).getByRole("img", { name: "Holiday Trivia: 80 points" })).toBeVisible();
    expect(within(scored).getByText("Again")).toBeInTheDocument();
    // Nothing else is playable on a phone yet: a live game and an unbuilt one
    // wait under Coming up instead of offering a dead-end Play.
    expect(within(list).queryByRole("list", { name: "Up for grabs" })).toBeNull();
    const later = within(list).getByRole("list", { name: "Coming up" });
    expect(within(later).getByText("Coming soon")).toBeInTheDocument();
    expect(within(later).getByText("On the TV when the host starts it")).toBeInTheDocument();
    expect(within(later).queryByRole("link")).toBeNull();
    // S03-AC5: a team game waits for the team phase.
    expect(within(later).getByText("Team phase")).toBeInTheDocument();
    expect(within(list).getByRole("progressbar", { name: "Games scored" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("S08-AC16: a game page names the game in the banner", () => {
  test("the banner shows the game's title, not the event's name", () => {
    inPack(<GameView event={event} game={event.games[0]!} status="upcoming" />);
    expect(screen.getByRole("heading", { level: 1, name: "Holiday Trivia" })).toBeInTheDocument();
    expect(screen.queryByText("Nova Wushu Holiday Party")).toBeNull();
  });

  test("a back arrow before the title goes to the games", () => {
    inPack(<GameView event={event} game={event.games[0]!} status="live" />);
    expect(screen.getByRole("link", { name: "Back to games" })).toHaveAttribute(
      "href",
      `/${event.slug}`,
    );
  });
});

describe("S02-AC14: before joining, the join form is the whole page", () => {
  test("no game names, no leaderboard: just the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ banned: false, player: null, restartsLeft: 1 }))),
    );
    inPack(
      <DeviceProvider slug={event.slug} identity="dev">
        <LiveView event={event} />
      </DeviceProvider>,
    );
    expect(await screen.findByRole("region", { name: "Join the party" })).toBeInTheDocument();
    expect(screen.queryByText("Holiday Trivia")).toBeNull();
    expect(screen.queryByRole("region", { name: "Tonight's games" })).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("S03-AC5: team games on the list", () => {
  test("only the captain gets a link; members see the team's result", () => {
    const team = { id: "t1", name: "Dragons", color: 1 };
    expect(teamGameBlock(null, undefined)).toBe("Team phase");
    expect(teamGameBlock({ phase: "team", team: null, isCaptain: false }, undefined)).toBe(
      "Join a team",
    );
    expect(teamGameBlock({ phase: "team", team, isCaptain: true }, undefined)).toBeNull();
    expect(teamGameBlock({ phase: "team", team, isCaptain: false }, undefined)).toBe(
      "Captain plays",
    );
    expect(
      teamGameBlock(
        { phase: "team", team, isCaptain: false },
        { status: "finished", best: 70, runs: 1 },
      ),
    ).toBe("Team · +70");
  });
});

describe("S05-AC2 S03-AC3: the Leaderboard and Team tabs", () => {
  const joined = (url: string) =>
    Promise.resolve(
      Response.json(
        url.includes("/leaderboard")
          ? { top: [], me: null, phase: "individual", teams: [], myTeam: null }
          : url.includes("/teams")
            ? { phase: "individual", maxTeamSize: 4, teams: [], mine: null }
            : url.includes("/plays")
              ? { plays: {}, total: 0, seat: null }
              : { banned: false, player: { id: "p1", nickname: "Mai" }, restartsLeft: 1 },
      ),
    );

  test("the Leaderboard tab is its own page", async () => {
    vi.stubGlobal("fetch", vi.fn(joined));
    inPack(
      <DeviceProvider slug={event.slug} identity="dev">
        <LeaderboardView event={event} />
      </DeviceProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Leaderboard" })).toBeInTheDocument();
    expect(await screen.findByText(/No scores yet/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  test("before the team phase, the Team tab says when teams open", async () => {
    vi.stubGlobal("fetch", vi.fn(joined));
    inPack(
      <DeviceProvider slug={event.slug} identity="dev">
        <TeamView event={event} />
      </DeviceProvider>,
    );
    expect(await screen.findByText(/Teams open when the host starts/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("S08-AC7: sorting the games", () => {
  test("a playable game is up for grabs with Play, then Continue; live and unbuilt games wait", () => {
    const rows = hubRows(event, "live", {}, null);
    const byId = Object.fromEntries(rows.map((r) => [r.game.id, r]));
    expect(byId.trivia).toMatchObject({ group: "open", note: "Play" });
    expect(byId.jeopardy).toMatchObject({ group: "later", href: null });
    expect(byId["ornament-hunt"]).toMatchObject({ group: "later", note: "Coming soon" });
    const playing = hubRows(
      event,
      "live",
      { trivia: { status: "playing", best: 0, runs: 1 } },
      null,
    );
    expect(playing.find((r) => r.game.id === "trivia")?.note).toBe("Continue");
  });
});
