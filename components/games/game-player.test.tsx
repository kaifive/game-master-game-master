import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PlayResponse } from "@/lib/games";
import { setReducedMotion } from "@/tests/motion";
import { GamePlayer, LEAVE_WARNING } from "./game-player";

const api = vi.hoisted(() => ({
  plays: vi.fn(),
  start: vi.fn(),
  move: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/games", async (original) => ({ ...(await original<object>()), gamesApi: api }));

type Active = { id: string; nickname: string } | null;
const device = vi.hoisted(() => {
  const state: {
    active: Active;
    token: () => Promise<string>;
    plays: Record<string, { status: string; best: number; runs: number }>;
    setLeaveWarning: (m: string | null) => void;
    refreshPlays: () => Promise<void>;
  } = {
    active: { id: "p1", nickname: "Mai" },
    token: () => Promise.resolve("dev:phone"),
    plays: {},
    setLeaveWarning: () => undefined,
    refreshPlays: () => Promise.resolve(),
  };
  return state;
});
vi.mock("@/components/players/device", () => ({
  useDevice: () => ({
    slug: "holiday-2026",
    load: {
      kind: "ready",
      device: { banned: false, players: device.active ? [device.active] : [] },
    },
    active: device.active,
    token: device.token,
    plays: device.plays,
    setLeaveWarning: device.setLeaveWarning,
    refreshPlays: device.refreshPlays,
  }),
}));

const ok = <T,>(data: T) => Promise.resolve({ ok: true as const, data });
const question: PlayResponse = {
  status: "playing",
  points: 0,
  best: 0,
  step: 0,
  view: {
    kind: "question",
    number: 1,
    total: 5,
    prompt: "Which reindeer has a red nose?",
    choices: [{ text: "Dasher" }, { text: "Rudolph" }],
    layout: "grid",
    seconds: 15,
    msLeft: 15_000,
  },
};
const finished: PlayResponse = {
  status: "finished",
  points: 80,
  best: 80,
  step: 10,
  view: { kind: "done", right: 4, total: 5 },
};
const rules = { title: "How to play", lines: ["5 quick questions."] };

const fly = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock("./fly", () => ({ flyPoints: fly }));

beforeEach(() => {
  vi.clearAllMocks();
  device.active = { id: "p1", nickname: "Mai" };
  device.plays = {};
  device.setLeaveWarning = vi.fn();
  device.refreshPlays = vi.fn(() => Promise.resolve());
});

const page = (replayable = false) =>
  render(<GamePlayer gameId="trivia" type="trivia" instructions={rules} replayable={replayable} />);

describe("GamePlayer", () => {
  test("S08-AC9: a new game shows the instructions and starts only on Start", async () => {
    api.plays.mockReturnValue(ok({ plays: {} }));
    api.start.mockReturnValue(ok(question));
    page();
    expect(await screen.findByRole("dialog", { name: "How to play" })).toBeInTheDocument();
    expect(api.start).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("button", { name: "Start" }));
    expect(
      await screen.findByRole("heading", { name: "Which reindeer has a red nose?" }),
    ).toBeInTheDocument();
    expect(api.start).toHaveBeenCalledWith("holiday-2026", "trivia", "dev:phone", "p1", false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("S08-AC9 S08-AC3: a started play resumes with no instructions", async () => {
    api.plays.mockReturnValue(ok({ plays: { trivia: { status: "playing", points: 0 } } }));
    api.start.mockReturnValue(ok(question));
    page();
    expect(
      await screen.findByRole("heading", { name: "Which reindeer has a red nose?" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("S08-AC2: moves go to the server with the current step", async () => {
    api.plays.mockReturnValue(ok({ plays: { trivia: { status: "playing", points: 0 } } }));
    api.start.mockReturnValue(ok(question));
    api.move.mockReturnValue(ok(finished));
    page();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Rudolph" }));
    expect(api.move).toHaveBeenCalledWith("holiday-2026", "trivia", "dev:phone", {
      playerId: "p1",
      step: 0,
      move: { type: "answer", choice: 1 },
    });
  });

  test("S08-AC11 S08-AC3: a finished play holds up its score card and the summary", async () => {
    setReducedMotion(true);
    api.plays.mockReturnValue(ok({ plays: { trivia: { status: "finished", points: 80 } } }));
    api.start.mockReturnValue(ok(finished));
    page();
    const score = await screen.findByRole("region", { name: "Your score" });
    expect(score).toHaveTextContent("4 of 5 right");
    expect(
      within(score).getByRole("img", { name: "This game, your score: 80 points" }),
    ).toHaveTextContent("80");
  });

  test("shows the server's message when a game can't start", async () => {
    api.plays.mockReturnValue(ok({ plays: {} }));
    api.start.mockReturnValue(Promise.resolve({ ok: false, message: "This game has closed." }));
    page();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Start" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This game has closed.");
  });

  test("asks a phone with no players to join first", () => {
    device.active = null;
    page();
    expect(screen.getByRole("link", { name: "Join now" })).toHaveAttribute("href", "/holiday-2026");
  });

  test("S08-AC12: a replayable game offers Play again and starts a new run", async () => {
    setReducedMotion(true);
    api.plays.mockReturnValue(ok({ plays: { trivia: { status: "finished", best: 80, runs: 1 } } }));
    api.start.mockReturnValueOnce(ok(finished)).mockReturnValueOnce(ok(question));
    page(true);
    expect(await screen.findByText("Your best: 80")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Play again" }));
    expect(api.start).toHaveBeenLastCalledWith("holiday-2026", "trivia", "dev:phone", "p1", true);
    expect(
      await screen.findByRole("heading", { name: "Which reindeer has a red nose?" }),
    ).toBeInTheDocument();
  });

  test("S08-AC14: warns before leaving while a run is in progress", async () => {
    api.plays.mockReturnValue(ok({ plays: { trivia: { status: "playing", best: 0, runs: 1 } } }));
    api.start.mockReturnValue(ok(question));
    const { unmount } = page();
    await screen.findByRole("heading", { name: "Which reindeer has a red nose?" });
    // The warning is set in an effect, which can land just after the render.
    await waitFor(() => {
      expect(device.setLeaveWarning).toHaveBeenLastCalledWith(LEAVE_WARNING);
    });
    unmount();
    expect(device.setLeaveWarning).toHaveBeenLastCalledWith(null);
  });

  test("S08-AC15: a new best flies to the header total, then the total refreshes", async () => {
    setReducedMotion(true);
    api.plays.mockReturnValue(ok({ plays: { trivia: { status: "playing", best: 0, runs: 1 } } }));
    api.start.mockReturnValue(ok(question));
    api.move.mockReturnValue(ok(finished));
    page();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Rudolph" }));
    await screen.findByRole("region", { name: "Your score" });
    await waitFor(() => {
      expect(device.refreshPlays).toHaveBeenCalled();
    });
    expect(fly).toHaveBeenCalledWith(expect.any(HTMLElement), "+80", true, expect.any(Element));
  });

  test("S08-AC15: no flight when the run didn't beat the best", async () => {
    setReducedMotion(true);
    device.plays = { trivia: { status: "playing", best: 90, runs: 2 } };
    api.plays.mockReturnValue(ok({ plays: device.plays }));
    api.start.mockReturnValue(ok(question));
    api.move.mockReturnValue(ok({ ...finished, best: 90 }));
    page(true);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Rudolph" }));
    expect(await screen.findByText("Your best: 90")).toBeInTheDocument();
    await waitFor(() => {
      expect(device.refreshPlays).toHaveBeenCalled();
    });
    expect(fly).not.toHaveBeenCalled();
  });

  test("S10-AC14: a reply asked for early waits until its moment", async () => {
    api.plays.mockReturnValue(ok({ plays: { trivia: { status: "playing", best: 0, runs: 1 } } }));
    api.start.mockReturnValue(
      ok({
        ...question,
        view: {
          ...(question.view as object),
          kind: "answered",
          chosen: 1,
          correct: 1,
          right: true,
        },
      }),
    );
    const second = {
      ...question,
      step: 2,
      view: { ...(question.view as object), number: 2, prompt: "Second question?" },
    };
    api.move.mockReturnValue(ok(second));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    page();
    await screen.findByRole("status");
    // Asked for straight away (from an effect, so allow it a tick).
    await waitFor(() => {
      expect(api.move).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole("heading", { name: "Second question?" })).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(await screen.findByRole("heading", { name: "Second question?" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  test("S17-AC4: an untimed game doesn't warn on leaving, and points banked mid-run refresh the total", async () => {
    const hunting = (best: number): PlayResponse => ({
      status: "playing",
      points: best,
      best,
      step: best,
      view: { kind: "hunting", found: [], total: 3, last: null, lockedForMs: 0 },
    });
    api.plays.mockReturnValue(ok({ plays: { geocache: { status: "playing", best: 0, runs: 1 } } }));
    api.start.mockReturnValue(ok(hunting(0)));
    api.move.mockReturnValue(ok(hunting(33)));
    render(<GamePlayer gameId="geocache" type="cache" instructions={rules} replayable={false} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Found a code? Type it here"), "SNOW1");
    await user.click(screen.getByRole("button", { name: "Check code" }));
    await waitFor(() => {
      expect(device.refreshPlays).toHaveBeenCalled();
    });
    expect(device.setLeaveWarning).not.toHaveBeenCalledWith(LEAVE_WARNING);
  });
});
