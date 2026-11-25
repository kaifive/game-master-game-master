import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { MomentsProvider } from "@/components/motion";
import { TvHostBar, type TvHost } from "@/components/live/game-menu";
import { holiday2026 } from "@/content/events/holiday-2026";
import { LAND_MS, type RaffleView } from "@/lib/guests";
import { setReducedMotion } from "@/tests/motion";
import { DisplayView, SCREEN_POLL_MS } from "./display-view";
import { nameAt, RaffleScreen } from "./raffle-screen";

vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));

const raffle = (over: Partial<RaffleView> = {}): RaffleView => ({
  status: "flipping",
  drawId: "d1",
  landsAt: null,
  winner: null,
  names: ["Mai", "Bao", "Lan"],
  people: 3,
  tickets: 4,
  ...over,
});

const wrap = (node: React.ReactNode) =>
  render(
    <PackRoot styleRef={holiday2026.style}>
      <MomentsProvider surface="display">{node}</MomentsProvider>
    </PackRoot>,
  );

afterEach(() => {
  setReducedMotion(false);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("the TV raffle (spec 32)", () => {
  test("S32-AC9: names flip, slow after Stop, and land on the winner at landsAt, whatever was showing", () => {
    const r = raffle();
    const seen = new Set([0, 70, 140, 210].map((t) => nameAt(r, 10_000 + t)));
    expect(seen.size).toBeGreaterThan(1);
    const landing = raffle({ status: "landing", landsAt: 20_000, winner: "Lan" });
    expect(["Mai", "Bao", "Lan"]).toContain(nameAt(landing, 20_000 - LAND_MS / 2));
    expect(nameAt(landing, 20_000)).toBe("Lan");
    expect(nameAt(raffle({ status: "landed", winner: "Bao" }), 0)).toBe("Bao");
  });

  test("S32-AC9: idle shows who's in; landed shows the winner; reduced motion says Drawing… instead of flipping", () => {
    const { unmount } = wrap(
      <RaffleScreen raffle={raffle({ status: "idle" })} serverNow={() => 0} />,
    );
    expect(screen.getByText("3 people · 4 tickets")).toBeInTheDocument();
    unmount();
    const landed = wrap(
      <RaffleScreen raffle={raffle({ status: "landed", winner: "Bao" })} serverNow={() => 0} />,
    );
    expect(screen.getByText("Winner!")).toBeInTheDocument();
    expect(screen.getByText("Bao")).toBeInTheDocument();
    landed.unmount();
    setReducedMotion(true);
    wrap(<RaffleScreen raffle={raffle()} serverNow={() => 0} />);
    expect(screen.getByText("Drawing…")).toBeInTheDocument();
  });

  test("S32-AC12: the host bar has Start, then Stop, then Claimed and Not here once landed", () => {
    const act_ = vi.fn();
    const host = (r: RaffleView, landsIn: number | null = null): TvHost => ({
      act: act_,
      busy: false,
      blocked: {},
      next: null,
      nextInMs: null,
      at: null,
      raffle: r,
      raffleLandsIn: landsIn,
    });
    const { rerender } = wrap(
      <TvHostBar
        host={host(raffle({ status: "idle", drawId: "d0" }))}
        running={false}
        screen="raffle"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(act_).toHaveBeenLastCalledWith({ action: "raffle", step: "start", drawId: "d0" });
    rerender(
      <PackRoot styleRef={holiday2026.style}>
        <TvHostBar
          host={host(raffle({ status: "landing", landsAt: 1, winner: "Mai" }), 3000)}
          running={false}
          screen="raffle"
        />
      </PackRoot>,
    );
    expect(screen.getByRole("button", { name: "Claimed" })).toBeDisabled();
    rerender(
      <PackRoot styleRef={holiday2026.style}>
        <TvHostBar
          host={host(raffle({ status: "landed", winner: "Mai" }))}
          running={false}
          screen="raffle"
        />
      </PackRoot>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Not here" }));
    expect(act_).toHaveBeenLastCalledWith({ action: "raffle", step: "notHere", drawId: "d1" });
  });

  test("S32-AC12: on a signed-in TV space starts and stops the raffle; a TV not signed in ignores it", async () => {
    let view: RaffleView = raffle({ status: "idle" });
    const posts: unknown[] = [];
    let signedIn = true;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init: RequestInit = {}) => {
        if (url.includes("/api/admin/events/") && url.endsWith("/live")) {
          if (!signedIn) return Promise.resolve(Response.json({ error: "no" }, { status: 401 }));
          if (init.method === "POST") {
            const body = JSON.parse(init.body as string) as { step: string };
            posts.push(body);
            view = raffle({
              status: body.step === "start" ? "flipping" : "landing",
              landsAt: 99_999,
            });
          }
          return Promise.resolve(
            Response.json({
              active: false,
              serverNow: 0,
              screen: "raffle",
              raffle: view,
              games: [],
              played: [],
              next: null,
              nextInMs: null,
              host: null,
            }),
          );
        }
        if (url.includes("/live"))
          return Promise.resolve(
            Response.json({ active: false, serverNow: 0, screen: "raffle", raffle: view }),
          );
        return Promise.resolve(
          Response.json({ hidden: false, phase: "individual", teams: [], players: [], recent: [] }),
        );
      }),
    );
    const show = () =>
      render(
        <PackRoot styleRef={holiday2026.style}>
          <DisplayView
            slug="holiday-2026"
            name="Party"
            joinUrl="https://x/join?code=WUSH7"
            shortUrl="x/join/WUSH7"
            joinCode="WUSH7"
          />
        </PackRoot>,
      );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const first = show();
    // The first fetch is the public view; the host's comes on the next poll.
    for (let i = 0; i < 2; i++)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SCREEN_POLL_MS);
      });
    await screen.findByRole("button", { name: "Start" });
    fireEvent.keyDown(window, { key: " ", code: "Space" });
    await screen.findByRole("button", { name: "Stop" });
    fireEvent.click(screen.getByRole("region", { name: "Raffle" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(posts).toEqual([
      { action: "raffle", step: "start", drawId: "d1" },
      { action: "raffle", step: "stop", drawId: "d1" },
    ]);
    first.unmount();
    signedIn = false;
    posts.length = 0;
    view = raffle({ status: "idle" });
    show();
    await screen.findByText("Get ready…");
    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(posts).toEqual([]);
    expect(screen.queryByRole("navigation", { name: "Host controls" })).toBeNull();
  });
});
