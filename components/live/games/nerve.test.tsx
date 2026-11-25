import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { cap, NAMES, round, show, showNext, T0, tv } from "./showdown-kit.test.helpers";
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

  test("S26-AC1: a number picked but not bid goes in as time runs out in every round, and a new round starts with no pick", async () => {
    const user = userEvent.setup();
    const r1 = round("auction");
    const closesAt = (r1.state as { closesAt: number }).closesAt;
    let t = T0 + 500;
    const send = show("auction", r1.view(cap("t1"), t), () => t);
    await user.click(screen.getByRole("button", { name: "7" }));
    t = closesAt - 300;
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({ bid: 7 });
    });
    // Round 2, on the same phone: 7 is spent and nothing is picked.
    const done = round("auction", [["t1", { bid: 7 }, T0 + 100]]);
    const r2 = round("auction", [], done.closed());
    send.mockClear();
    t = T0 + 500;
    const v2 = r2.view(cap("t1"), t);
    showNext({ ...v2, session: { ...v2.session, round: 2 } });
    expect(screen.getByRole("button", { name: "Pick a number" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "9" }));
    t = closesAt - 300;
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({ bid: 9 });
    });
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
    const pot = (r.state as { pot: number }).pot;
    expect(row).toHaveTextContent(`Snatch · +${String(pot)}`);
    expect(row).toHaveTextContent("Share · +0");
  });
});
