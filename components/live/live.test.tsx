import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import type { AdminLiveView, LiveView } from "@/lib/live";
import { setReducedMotion } from "@/tests/motion";
import { DemoFrame } from "./demo-frame";
import { GameMenu, TvHostBar } from "./game-menu";
import { LiveCard, WhosPlayed } from "./live-controls";
import { LivePanel } from "./live-phone";
import { ShowdownScreen, standingsRows } from "./live-tv";
import { STANDINGS_HOLD_MS, StandingsUpdate } from "./standings-update";
import type { ActiveLiveView, LiveRenderer } from "./types";
import { IDLE_POLL_MS, LIVE_POLL_MS, useLive } from "./use-live";

const wrap = (ui: React.ReactNode) =>
  render(<PackRoot styleRef={holiday2026.style}>{ui}</PackRoot>);

const stand: LiveRenderer = {
  Tv: () => <p>tv board</p>,
  Controller: ({ send }) => (
    <button type="button" onClick={() => void send("tap")}>
      Tap
    </button>
  ),
  Demo: ({ still }) => <p>{still ? "still frame" : "moving demo"}</p>,
};

const active = (over: Partial<ActiveLiveView> = {}): ActiveLiveView => ({
  active: true,
  serverNow: 0,
  screen: "showdown",
  session: {
    id: "s",
    gameId: "g",
    type: "tap",
    title: "Tap Off",
    step: "play",
    round: 1,
    rounds: 3,
    revision: 1,
  },
  demo: "Tap when it says go.",
  teams: [
    { id: "t1", name: "Reds", color: 1, score: 40, roundPoints: null },
    { id: "t2", name: "Blues", color: 2, score: 10, roundPoints: null },
  ],
  game: null,
  you: null,
  ...over,
});

const idle: LiveView = { active: false, serverNow: 0, screen: "showdown" };

const adminView = (over: Partial<AdminLiveView> = {}): AdminLiveView =>
  ({
    active: false,
    serverNow: 0,
    screen: "leaderboard",
    next: null,
    games: [
      { id: "g1", title: "Tap Off", type: "tap", blocked: null },
      { id: "g2", title: "Pairs", type: "pairs", blocked: "This game needs at least 3 teams." },
    ],
    played: [],
    ...over,
  }) as AdminLiveView;

describe("live hooks (spec 11)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function Probe({ load }: { load: () => Promise<{ ok: true; data: LiveView }> }) {
    const { view, serverNow } = useLive(load);
    return (
      <p>
        {view?.active ? "on" : "off"} {Math.round(serverNow() / 1000)}
      </p>
    );
  }

  test("S11-AC4: polls about every 700 ms while a game runs, every 4 s otherwise, and not while hidden", async () => {
    let on = false;
    const load = vi.fn((): Promise<{ ok: true; data: LiveView }> =>
      Promise.resolve({ ok: true, data: on ? active() : { ...idle, serverNow: Date.now() } }),
    );
    render(<Probe load={load} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_POLL_MS);
    });
    expect(load).toHaveBeenCalledTimes(2);
    on = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_POLL_MS);
    });
    const before = load.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 3);
    });
    expect(load.mock.calls.length - before).toBeGreaterThanOrEqual(3);
    // A hidden tab stops asking.
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    const hidden = load.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_POLL_MS * 5);
    });
    expect(load.mock.calls.length).toBe(hidden);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  test("S11-AC5: the device's clock follows the server's time from the replies", async () => {
    vi.setSystemTime(1_000_000);
    const load = (): Promise<{ ok: true; data: LiveView }> =>
      Promise.resolve({ ok: true, data: { ...idle, serverNow: 61_000_000 } });
    render(<Probe load={load} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText(/off 61000/)).toBeInTheDocument();
  });
});

describe("captain and member phones (spec 24)", () => {
  test("S24-AC3: the captain's phone is the controller during play and sends moves", async () => {
    const user = userEvent.setup();
    const send = vi.fn(() => Promise.resolve());
    wrap(
      <LivePanel
        view={active({ you: { teamId: "t1", captain: true } })}
        serverNow={() => 0}
        send={send}
        busy={false}
        error={null}
        renderers={{ tap: stand }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Tap" }));
    expect(send).toHaveBeenCalledWith("tap");
  });

  test("S24-AC3: other phones show Watch the TV with their team's points, and no controls", () => {
    wrap(
      <LivePanel
        view={active({ you: { teamId: "t1", captain: false } })}
        serverNow={() => 0}
        send={vi.fn()}
        busy={false}
        error={null}
        renderers={{ tap: stand }}
      />,
    );
    const watch = screen.getByRole("region", { name: "Watch the TV" });
    expect(within(watch).getByText("Reds")).toBeInTheDocument();
    expect(within(watch).getByText("40")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tap" })).not.toBeInTheDocument();
  });

  test("S24-AC3: at a round's results the rest of the team sees what the team scored, on the phone", () => {
    wrap(
      <LivePanel
        view={active({
          you: { teamId: "t1", captain: false },
          session: { ...active().session, step: "results" },
          teams: [
            { id: "t1", name: "Reds", color: 1, score: 75, roundPoints: 35 },
            { id: "t2", name: "Blues", color: 2, score: 10, roundPoints: 0 },
          ],
        })}
        serverNow={() => 0}
        send={vi.fn()}
        busy={false}
        error={null}
        renderers={{ tap: stand }}
      />,
    );
    const watch = screen.getByRole("region", { name: "Watch the TV" });
    expect(within(watch).getByText("+35 this round")).toBeInTheDocument();
    expect(within(watch).getByText("75")).toBeInTheDocument();
  });
});

describe("the TV (spec 24)", () => {
  afterEach(() => {
    setReducedMotion(false);
    vi.useRealTimers();
  });

  test("S24-AC4: the intro plays the game's demo with its one line, and holds a still frame under reduced motion", () => {
    const { unmount } = wrap(<DemoFrame renderer={stand} line="Tap when it says go." />);
    expect(screen.getByText("moving demo")).toBeInTheDocument();
    expect(screen.getByText("Tap when it says go.")).toBeInTheDocument();
    unmount();
    setReducedMotion(true);
    wrap(<DemoFrame renderer={stand} line="Tap when it says go." />);
    expect(screen.getByText("still frame")).toBeInTheDocument();
  });

  test("S24-AC9: between showdowns the Showdown screen shows the menu of showdowns, with no subtitles and the played ones marked, and the team standings; during one, the game", () => {
    const totals = [
      { id: "t1", name: "Reds", color: 1, points: 300 },
      { id: "t2", name: "Blues", color: 2, points: 500 },
    ];
    const menu = [
      { id: "fly", title: "Fly-by Count", type: "flyby" },
      { id: "nerve", title: "Share or Snatch", type: "snatch" },
    ];
    const { unmount } = wrap(
      <ShowdownScreen
        view={{ ...idle, finished: ["nerve"] }}
        serverNow={() => 0}
        totals={totals}
        renderers={{ tap: stand }}
        menu={menu}
      />,
    );
    const showdowns = screen.getByRole("region", { name: "Showdowns" });
    expect(showdowns).toHaveTextContent("Fly-by Count");
    expect(showdowns).toHaveTextContent("Share or SnatchPlayed");
    expect(showdowns).not.toHaveTextContent("Fly-by CountPlayed");
    expect(showdowns).not.toHaveTextContent("Like");
    // Not signed in as the host: nothing to tap.
    expect(screen.queryByRole("button", { name: /Start/ })).toBeNull();
    expect(screen.getByRole("region", { name: "Team standings" })).toHaveTextContent(/Blues.*Reds/);
    unmount();
    wrap(
      <ShowdownScreen
        view={active()}
        serverNow={() => 0}
        totals={totals}
        renderers={{ tap: stand }}
      />,
    );
    expect(screen.getByText("tv board")).toBeInTheDocument();
  });

  test("S24-AC9: a TV signed in as the host starts a showdown from the menu, and steps it with its own buttons", async () => {
    const user = userEvent.setup();
    const act = vi.fn();
    const host = {
      act,
      busy: false,
      next: "Start round 1",
      at: { step: "intro", round: 0 },
      blocked: { fly: null, path: "This game needs at least 2 teams." },
    };
    const menu = [
      { id: "fly", title: "Fly-by Count", type: "flyby" },
      { id: "path", title: "Memory Path", type: "path" },
    ];
    const { unmount } = wrap(<GameMenu games={menu} totals={[]} host={host} />);
    await user.click(screen.getByRole("button", { name: "Start Fly-by Count" }));
    expect(act).toHaveBeenCalledWith({ action: "start", gameId: "fly" });
    expect(screen.getByRole("button", { name: "Start Memory Path" })).toBeDisabled();
    expect(screen.getByText("This game needs at least 2 teams.")).toBeInTheDocument();
    unmount();
    wrap(<TvHostBar host={host} running screen="showdown" />);
    await user.click(screen.getByRole("button", { name: "Start round 1" }));
    // Next says the step it was pressed on, so a late press does nothing.
    expect(act).toHaveBeenCalledWith({ action: "next", at: { step: "intro", round: 0 } });
    await user.click(screen.getByRole("button", { name: "End early" }));
    expect(act).toHaveBeenCalledWith({ action: "end" });
    await user.click(screen.getByRole("button", { name: "Leaderboard" }));
    expect(act).toHaveBeenCalledWith({ action: "screen", screen: "leaderboard" });
  });

  test("S24-AC4: the demo shows the room in front of the TV, someone calling out an answer", () => {
    wrap(<DemoFrame renderer={{ ...stand, say: "7!" }} line="Count them." />);
    expect(screen.getByText("7!")).toBeInTheDocument();
  });

  const rows = standingsRows(
    active({
      session: { ...active().session, step: "final" },
      teams: [
        { id: "t1", name: "Reds", color: 1, score: 300, roundPoints: null },
        { id: "t2", name: "Blues", color: 2, score: 0, roundPoints: null },
      ],
    }),
    [
      { id: "t1", name: "Reds", color: 1, points: 500 },
      { id: "t2", name: "Blues", color: 2, points: 400 },
      { id: "t3", name: "Greens", color: 3, points: 450 },
    ],
  );

  const order = () =>
    within(screen.getByRole("list", { name: "Team standings" }))
      .getAllByRole("listitem")
      .map((li) => li.getAttribute("aria-label"));

  test("S24-AC10: the standings update starts from before the showdown, then rolls the points on and moves teams up", async () => {
    vi.useFakeTimers();
    expect(rows.find((r) => r.id === "t1")).toMatchObject({ before: 200, after: 500 });
    wrap(<StandingsUpdate rows={rows} />);
    expect(order()).toEqual([
      "1. Greens, 450 points",
      "2. Blues, 400 points",
      "3. Reds, 200 points",
    ]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STANDINGS_HOLD_MS + 10);
    });
    expect(order()).toEqual([
      "1. Reds, 500 points, +300, up 2",
      "2. Greens, 450 points",
      "3. Blues, 400 points",
    ]);
  });

  test("S24-AC10: under reduced motion the new standings show at once", () => {
    setReducedMotion(true);
    wrap(<StandingsUpdate rows={rows} />);
    expect(order()[0]).toBe("1. Reds, 500 points, +300, up 2");
  });
});

describe("Controls (spec 11, spec 24)", () => {
  test("S11-AC1 S24-AC9: the host switches the TV, picks a showdown and starts it, then steps with Next and ends it", async () => {
    const user = userEvent.setup();
    const act = vi.fn();
    const { rerender } = wrap(<LiveCard view={adminView()} act={act} busy={false} />);
    await user.click(screen.getByRole("button", { name: "Showdown" }));
    expect(act).toHaveBeenLastCalledWith({ action: "screen", screen: "showdown" });
    expect(screen.getByRole("button", { name: "Leaderboard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Start on the TV" }));
    expect(act).toHaveBeenLastCalledWith({ action: "start", gameId: "g1" });
    const running = { ...adminView(), ...active(), next: "Show results" } as AdminLiveView;
    rerender(
      <PackRoot styleRef={holiday2026.style}>
        <LiveCard view={running} act={act} busy={false} />
      </PackRoot>,
    );
    expect(screen.getByText(/Playing · round 1 of 3/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show results" }));
    expect(act).toHaveBeenLastCalledWith({ action: "next", at: { step: "play", round: 1 } });
    await user.click(screen.getByRole("button", { name: "End early" }));
    expect(act).toHaveBeenLastCalledWith({ action: "end" });
  });

  test("S24-AC11: a showdown that needs more teams can't be started, and says why", async () => {
    const user = userEvent.setup();
    wrap(<LiveCard view={adminView()} act={vi.fn()} busy={false} />);
    await user.selectOptions(screen.getByLabelText("Showdown to start"), "g2");
    expect(screen.getByRole("button", { name: "Start on the TV" })).toBeDisabled();
    expect(screen.getByText("This game needs at least 3 teams.")).toBeInTheDocument();
  });

  test("S24-AC2: Who's played marks people by tapping, adds and removes names, and offers Start over once everyone has gone", async () => {
    const user = userEvent.setup();
    const act = vi.fn();
    const team = (done: boolean) => ({
      teamId: "t1",
      name: "Reds",
      color: 1,
      people: [
        { id: "c1", name: "Cap", added: false, played: done },
        { id: "x1", name: "Grandma", added: true, played: true },
      ],
      done: done ? 2 : 1,
      total: 2,
      everyone: done,
    });
    const { rerender } = wrap(
      <WhosPlayed view={adminView({ played: [team(false)] })} act={act} busy={false} />,
    );
    expect(screen.getByText("1 of 2 played")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grandma" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Cap" }));
    expect(act).toHaveBeenLastCalledWith({
      action: "played",
      teamId: "t1",
      personId: "c1",
      played: true,
    });
    await user.click(screen.getByRole("button", { name: "Grandma" }));
    expect(act).toHaveBeenLastCalledWith({
      action: "played",
      teamId: "t1",
      personId: "x1",
      played: false,
    });
    await user.type(screen.getByLabelText("Add someone to Reds"), "Uncle Bo");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(act).toHaveBeenLastCalledWith({ action: "add", teamId: "t1", name: "Uncle Bo" });
    await user.click(screen.getByRole("button", { name: "Remove Grandma" }));
    expect(act).toHaveBeenLastCalledWith({ action: "remove", teamId: "t1", personId: "x1" });
    // Only joined players can't be removed.
    expect(screen.queryByRole("button", { name: "Remove Cap" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start over/ })).not.toBeInTheDocument();
    rerender(
      <PackRoot styleRef={holiday2026.style}>
        <WhosPlayed view={adminView({ played: [team(true)] })} act={act} busy={false} />
      </PackRoot>,
    );
    await user.click(screen.getByRole("button", { name: /start over/ }));
    expect(act).toHaveBeenLastCalledWith({ action: "reset", teamId: "t1" });
  });
});
