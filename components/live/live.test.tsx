import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import type { AdminLiveView, LiveView } from "@/lib/live";
import { setReducedMotion } from "@/tests/motion";
import { DemoFrame } from "./demo-frame";
import { LiveCard } from "./live-controls";
import { LivePanel } from "./live-phone";
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
  session: {
    id: "s",
    gameId: "g",
    type: "tap",
    title: "Tap Off",
    step: "pick",
    round: 1,
    rounds: 3,
    revision: 1,
  },
  demo: "Tap when it says go.",
  teams: [
    { id: "t1", name: "Reds", color: 1, score: 40, roundPoints: null, up: null },
    { id: "t2", name: "Blues", color: 2, score: 10, roundPoints: null, up: null },
  ],
  game: null,
  you: null,
  ...over,
});

const captainView = active({
  you: {
    teamId: "t1",
    captain: true,
    canPick: true,
    pickable: [
      { id: "a", nickname: "Ana", available: false },
      { id: "b", nickname: "Bo", available: true },
    ],
  },
});

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
      Promise.resolve({
        ok: true,
        data: on ? active() : { active: false, serverNow: Date.now() },
      }),
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
      Promise.resolve({ ok: true, data: { active: false, serverNow: 61_000_000 } });
    render(<Probe load={load} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText(/off 61000/)).toBeInTheDocument();
  });
});

describe("captain and member phones (spec 24)", () => {
  test("S24-AC2: the captain picks who's up; teammates who've had a turn are greyed out", async () => {
    const user = userEvent.setup();
    const act = vi.fn(() => Promise.resolve());
    wrap(
      <LivePanel
        view={captainView}
        serverNow={() => 0}
        act={act}
        busy={false}
        error={null}
        renderers={{ tap: stand }}
      />,
    );
    const list = screen.getByRole("region", { name: "Who's up" });
    expect(within(list).getByRole("button", { name: "Ana" })).toBeDisabled();
    await user.click(within(list).getByRole("button", { name: "Bo" }));
    expect(act).toHaveBeenCalledWith({ action: "pick", who: "b" });
  });

  test("S24-AC2: during play the captain's phone is the controller and sends moves", async () => {
    const user = userEvent.setup();
    const act = vi.fn(() => Promise.resolve());
    const playing = { ...captainView, session: { ...captainView.session, step: "play" as const } };
    const you = captainView.you;
    if (!you) throw new Error("no you");
    wrap(
      <LivePanel
        view={{ ...playing, you: { ...you, canPick: false } }}
        serverNow={() => 0}
        act={act}
        busy={false}
        error={null}
        renderers={{ tap: stand }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Tap" }));
    expect(act).toHaveBeenCalledWith({ action: "move", move: "tap" });
  });

  test("S24-AC3: other phones show Watch the TV with their team's player and points, and no controls", () => {
    const view = active({
      session: { ...captainView.session, step: "play" },
      teams: [
        {
          id: "t1",
          name: "Reds",
          color: 1,
          score: 40,
          roundPoints: null,
          up: { id: "b", nickname: "Bo" },
        },
      ],
      you: { teamId: "t1", captain: false, canPick: false, pickable: [] },
    });
    wrap(
      <LivePanel
        view={view}
        serverNow={() => 0}
        act={vi.fn()}
        busy={false}
        error={null}
        renderers={{ tap: stand }}
      />,
    );
    const watch = screen.getByRole("region", { name: "Watch the TV" });
    expect(within(watch).getByText("Up now: Bo")).toBeInTheDocument();
    expect(within(watch).getByText("40")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tap" })).not.toBeInTheDocument();
  });
});

describe("the TV demo (spec 24)", () => {
  afterEach(() => {
    setReducedMotion(false);
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
});

describe("the Controls Live card (spec 11)", () => {
  test("S11-AC1: the host picks a live game and starts it, then steps with Next and ends it", async () => {
    const user = userEvent.setup();
    const act = vi.fn();
    const idle: AdminLiveView = {
      active: false,
      serverNow: 0,
      next: null,
      games: [
        { id: "g1", title: "Tap Off", type: "tap" },
        { id: "g2", title: "Pass It", type: "pass" },
      ],
    };
    const { rerender } = wrap(<LiveCard view={idle} act={act} busy={false} />);
    await user.selectOptions(screen.getByLabelText("Game"), "g2");
    await user.click(screen.getByRole("button", { name: "Start on the TV" }));
    expect(act).toHaveBeenLastCalledWith({ action: "start", gameId: "g2" });
    const running = { ...active(), next: "Start the round", games: idle.games } as AdminLiveView;
    rerender(
      <PackRoot styleRef={holiday2026.style}>
        <LiveCard view={running} act={act} busy={false} />
      </PackRoot>,
    );
    expect(screen.getByText(/Who's up · round 1 of 3/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start the round" }));
    expect(act).toHaveBeenLastCalledWith({ action: "next" });
    await user.click(screen.getByRole("button", { name: "End early" }));
    expect(act).toHaveBeenLastCalledWith({ action: "end" });
  });
});
