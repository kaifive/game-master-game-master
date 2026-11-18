import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { showdownFor, type Role } from "@/lib/live";
import { LIVE_RENDERERS } from "../renderers";
import type { ActiveLiveView } from "../types";

const T0 = 1_000_000;
const TEAMS = ["t1", "t2", "t3"];
const NAMES: Record<string, string> = { t1: "Reds", t2: "Blues", t3: "Golds" };

/** A real round of a showdown, with moves played, and a view of it. */
function round(type: string, moves: [string, unknown, number][] = [], prev: unknown = null) {
  const game = showdownFor(type);
  if (!game) throw new Error(type);
  const c = game.content.parse({});
  let state = game.deal(c, { seed: 4, round: prev ? 2 : 1, teams: TEAMS, startsAt: T0, prev });
  for (const [teamId, move, at] of moves) {
    const r = game.move(state, c, { teamId, move, now: at });
    if (!r.ok) throw new Error(r.message);
    state = r.state;
  }
  const closed = () => (game.close ? game.close(state, c, T0 + 60_000) : state);
  const view = (role: Role, now: number, revealed = false): ActiveLiveView => {
    const s = revealed ? closed() : state;
    const points = revealed ? game.score(s, c, TEAMS) : null;
    return {
      active: true,
      serverNow: now,
      screen: "showdown",
      session: {
        id: "s",
        gameId: type,
        type,
        title: type,
        step: revealed ? "results" : "play",
        round: 1,
        rounds: 3,
        revision: 1,
      },
      demo: game.demo,
      teams: TEAMS.map((id, i) => ({
        id,
        name: NAMES[id] ?? id,
        color: i + 1,
        score: 0,
        roundPoints: points ? (points[id] ?? 0) : null,
      })),
      game: game.view(s, c, { role, revealed, now, teams: TEAMS }),
      you: role.kind === "tv" ? null : { teamId: role.teamId, captain: true },
    };
  };
  return { state, view, closed };
}

const cap = (teamId: string): Role => ({ kind: "captain", teamId });
const tv: Role = { kind: "tv" };

function show(type: string, v: ActiveLiveView, now: number, on: "phone" | "tv" = "phone") {
  const R = LIVE_RENDERERS[type];
  if (!R) throw new Error(type);
  const send = vi.fn(() => Promise.resolve());
  const revealed = v.session.step === "results";
  render(
    <PackRoot styleRef={holiday2026.style}>
      {on === "phone" ? (
        <R.Controller
          view={v}
          game={v.game}
          serverNow={() => now}
          revealed={revealed}
          send={send}
          busy={false}
        />
      ) : (
        <R.Tv view={v} game={v.game} serverNow={() => now} revealed={revealed} />
      )}
    </PackRoot>,
  );
  return send;
}

describe("Auction on the phone and TV (spec 26)", () => {
  test("S26-AC1: the phone shows the numbers left, used ones off, and bids the one picked", async () => {
    const user = userEvent.setup();
    const r1 = round("auction", [["t1", { bid: 10 }, T0 + 100]]);
    const r2 = round("auction", [], r1.closed());
    const send = show("auction", r2.view(cap("t1"), T0 + 500), T0 + 500);
    expect(screen.getByRole("button", { name: "10, used" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "7" }));
    await user.click(screen.getByRole("button", { name: "Bid 7" }));
    expect(send).toHaveBeenCalledWith({ bid: 7 });
  });

  test("S26-AC1: the reveal marks tied bids cancelled and names the winner", () => {
    const r = round("auction", [
      ["t1", { bid: 9 }, T0 + 100],
      ["t2", { bid: 9 }, T0 + 100],
      ["t3", { bid: 4 }, T0 + 100],
    ]);
    show("auction", r.view(tv, T0 + 20_000, true), T0 + 20_000, "tv");
    expect(screen.getByText(/Golds wins/)).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Answers" })).getAllByText("Tied: cancelled"),
    ).toHaveLength(2);
  });

  test("S26-AC1: while bidding the TV shows who's bid and everyone's numbers, not the bids", () => {
    const r = round("auction", [["t1", { bid: 3 }, T0 + 100]]);
    show("auction", r.view(tv, T0 + 500), T0 + 500, "tv");
    expect(
      within(screen.getByRole("list", { name: "Locked in" })).getAllByRole("listitem")[0],
    ).toHaveTextContent(/In/);
    expect(screen.getByRole("list", { name: "Numbers left" })).toBeInTheDocument();
  });
});

describe("Stocking Stuffer on the phone and TV (spec 26)", () => {
  test("S26-AC2: the phone offers Open or Bank with the pot, and sends the choice", async () => {
    const user = userEvent.setup();
    const r = round("stockings");
    const send = show("stockings", r.view(cap("t1"), T0 + 500), T0 + 500);
    await user.click(screen.getByRole("button", { name: "Open a stocking" }));
    expect(send).toHaveBeenCalledWith({ choice: "open" });
    expect(screen.getByRole("button", { name: "Bank 0" })).toBeInTheDocument();
  });

  test("S26-AC2: a team that banked waits, and the TV shows each team's pot and status", () => {
    const r = round("stockings", [
      ["t1", { choice: "bank" }, T0 + 100],
      ["t2", { choice: "open" }, T0 + 100],
      ["t3", { choice: "open" }, T0 + 100],
    ]);
    show("stockings", r.view(cap("t1"), T0 + 500), T0 + 500);
    expect(screen.getByText("Banked 0")).toBeInTheDocument();
    show("stockings", r.view(tv, T0 + 500), T0 + 500, "tv");
    const teams = screen.getByRole("list", { name: "Teams" });
    expect(within(teams).getAllByRole("listitem")[0]).toHaveTextContent(/Banked/);
  });
});

describe("Share or Snatch on the phone and TV (spec 26)", () => {
  test("S26-AC3: the phone names the rival and the pot, and sends Share or Snatch", async () => {
    const user = userEvent.setup();
    const r = round("snatch");
    const [a] = (r.state as { pairs: [string, string][] }).pairs[0] ?? [""];
    const send = show("snatch", r.view(cap(a), T0 + 500), T0 + 500);
    expect(screen.getByText(/a pot of/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Snatch" }));
    expect(send).toHaveBeenCalledWith({ choice: "snatch" });
  });

  test("S26-AC3: the team sitting out is told so, and the TV says who sits out", () => {
    const r = round("snatch");
    const out = (r.state as { sitOut: string }).sitOut;
    show("snatch", r.view(cap(out), T0 + 500), T0 + 500);
    expect(screen.getByText("You sit this one out")).toBeInTheDocument();
    show("snatch", r.view(tv, T0 + 500), T0 + 500, "tv");
    expect(screen.getByText(`${NAMES[out] ?? ""} sits this one out.`)).toBeInTheDocument();
  });

  test("S26-AC3: the reveal shows both choices and the points", () => {
    const r = round("snatch");
    const [a, b] = (r.state as { pairs: [string, string][] }).pairs[0] ?? ["", ""];
    const played = round("snatch", [
      [a, { choice: "snatch" }, T0 + 100],
      [b, { choice: "share" }, T0 + 100],
    ]);
    show("snatch", played.view(tv, T0 + 20_000, true), T0 + 20_000, "tv");
    const row = screen.getByRole("list", { name: "Matchups" });
    expect(row).toHaveTextContent("Snatch · +100");
    expect(row).toHaveTextContent("Share · +0");
  });
});
