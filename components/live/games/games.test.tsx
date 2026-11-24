import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { showdownFor, type Role } from "@/lib/live";
import { LIVE_RENDERERS } from "../renderers";
import type { ActiveLiveView } from "../types";

const T0 = 1_000_000;
const teams = [
  { id: "t1", name: "Reds", color: 1, score: 0, roundPoints: null },
  { id: "t2", name: "Blues", color: 2, score: 0, roundPoints: null },
];

/** A real round of a showdown, and what a role sees of it at `now`. */
function round(type: string, moves: [string, unknown, number][] = [], content: unknown = {}) {
  const game = showdownFor(type);
  if (!game) throw new Error(type);
  const c = game.content.parse(content);
  let state = game.deal(c, { seed: 4, round: 1, teams: ["t1", "t2"], startsAt: T0, prev: null });
  for (const [teamId, move, at] of moves) {
    const r = game.move(state, c, { teamId, move, now: at });
    if (!r.ok) throw new Error(r.message);
    state = r.state;
  }
  const s = state as { showEndsAt?: number; closesAt?: number };
  const view = (role: Role, now: number, revealed = false, points?: Record<string, number>) => {
    const v: ActiveLiveView = {
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
      teams: teams.map((t) => ({ ...t, roundPoints: revealed ? (points?.[t.id] ?? 0) : null })),
      game: game.view(state, c, { role, revealed, now, teams: ["t1", "t2"] }),
      you: role.kind === "tv" ? null : { teamId: role.teamId, captain: true },
    };
    return v;
  };
  return { state, s, view, score: () => game.score(state, c, ["t1", "t2"]) };
}

const cap = { kind: "captain", teamId: "t1" } as const;
const tv = { kind: "tv" } as const;

function phone(
  type: string,
  v: ActiveLiveView,
  now: number | (() => number),
  send = vi.fn(() => Promise.resolve()),
) {
  const R = LIVE_RENDERERS[type];
  if (!R) throw new Error(type);
  render(
    <PackRoot styleRef={holiday2026.style}>
      <R.Controller
        view={v}
        game={v.game}
        serverNow={typeof now === "number" ? () => now : now}
        revealed={v.session.step === "results"}
        send={send}
        busy={false}
      />
    </PackRoot>,
  );
  return send;
}

function onTv(type: string, v: ActiveLiveView, now: number) {
  const R = LIVE_RENDERERS[type];
  if (!R) throw new Error(type);
  render(
    <PackRoot styleRef={holiday2026.style}>
      <R.Tv view={v} game={v.game} serverNow={() => now} revealed={v.session.step === "results"} />
    </PackRoot>,
  );
}

describe("count showdowns on the phone and TV (spec 25)", () => {
  test("S25-AC1: the phone waits while the presents fly, then takes one number and locks it in", () => {
    const r = round("flyby");
    const during = r.s.showEndsAt ?? 0;
    phone("flyby", r.view(cap, during - 100), during - 100);
    expect(screen.getByText("Watch the TV and count!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1" })).toBeNull();
  });

  test("S25-AC1: typing 1 then 2 sends 12 as the time runs out, with no Lock in; rub out takes a digit back", async () => {
    const user = userEvent.setup();
    const r = round("flyby");
    let t = (r.s.showEndsAt ?? 0) + 500;
    const send = phone("flyby", r.view(cap, t), () => t);
    expect(screen.queryByRole("button", { name: /Lock in/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "Rub out" }));
    await user.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByRole("status", { name: "Your number" })).toHaveTextContent("12");
    expect(send).not.toHaveBeenCalled();
    t = (r.s.closesAt ?? 0) - 300;
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({ answer: 12 });
    });
  });

  test("S25-AC2: Snow Sum's pad can type a negative total", async () => {
    const user = userEvent.setup();
    const r = round("snowsum");
    let t = (r.s.showEndsAt ?? 0) + 500;
    const send = phone("snowsum", r.view(cap, t), () => t);
    await user.click(screen.getByRole("button", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Minus" }));
    t = (r.s.closesAt ?? 0) - 300;
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({ answer: -4 });
    });
  });

  test("S25-AC1: once locked in, the phone says what it sent; the TV shows who's in but not what", () => {
    const r0 = round("flyby");
    const at = (r0.s.showEndsAt ?? 0) + 500;
    const r = round("flyby", [["t1", { answer: 7 }, at]]);
    phone("flyby", r.view(cap, at), at);
    expect(screen.getByText("Locked in: 7")).toBeInTheDocument();
    onTv("flyby", r.view(tv, at), at);
    const locked = screen.getByRole("list", { name: "Locked in" });
    expect(within(locked).getAllByRole("listitem")[0]).toHaveTextContent(/Reds\s*In/);
    expect(within(locked).getAllByRole("listitem")[1]).toHaveTextContent(/Blues\s*Thinking/);
    expect(locked).not.toHaveTextContent("7");
  });

  test("S25-AC1: the reveal shows the count, each team's answer and its points", () => {
    const r0 = round("flyby");
    const at = (r0.s.showEndsAt ?? 0) + 500;
    const count = (r0.state as { count: number }).count;
    const r = round("flyby", [["t1", { answer: count }, at]]);
    onTv("flyby", r.view(tv, at, true, r.score()), at);
    expect(
      screen.getByText(String(count), { selector: "span.text-gm-tile-correct" }),
    ).toBeInTheDocument();
    const answers = screen.getByRole("list", { name: "Answers" });
    expect(within(answers).getByText("Exactly right!")).toBeInTheDocument();
    expect(within(answers).getByText("No answer")).toBeInTheDocument();
    expect(
      within(answers).getByRole("img", { name: "Reds this round: 50 points" }),
    ).toBeInTheDocument();
  });

  // A round of three kinds of present, as Fly-by's later rounds are.
  const byKind = { rounds: [{ min: 10, max: 14, ms: 3000, cols: 6, rows: 3, kinds: 3 }] };

  test("S25-AC3: by kind, the phone says to count every kind and keeps which one secret until they've flown past", () => {
    const r = round("flyby", [], byKind);
    const end = r.s.showEndsAt ?? 0;
    phone("flyby", r.view(cap, end - 50), end - 50);
    expect(
      screen.getByText("Count every kind: you'll find out which one at the end."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/How many/)).toBeNull();
  });

  test("S25-AC3: after the fly-by the phone asks how many of one kind, with that present beside it", () => {
    const r = round("flyby", [], byKind);
    const end = (r.s.showEndsAt ?? 0) + 10;
    phone("flyby", r.view(cap, end), end);
    const ask = (r.state as { ask: number }).ask;
    const kind = ["red", "white", "green"][ask] ?? "";
    expect(screen.getByText(`${kind} presents?`)).toBeInTheDocument();
  });
});

describe("stop showdowns on the phone and TV (spec 25)", () => {
  test("S25-AC4: Blind Stop's phone shows no clock, and Stop sends the time from the shared start", async () => {
    const user = userEvent.setup();
    const r = round("blindstop");
    const send = phone("blindstop", r.view(cap, T0 + 4321), T0 + 4321);
    expect(screen.getByText("Tap Stop at exactly 10.00")).toBeInTheDocument();
    expect(screen.queryByText(/\d\.\d\d/, { selector: "p:not(:first-child)" })).toBeNull();
    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("button", { name: "Stop" }),
    });
    expect(send).toHaveBeenCalledWith({ elapsedMs: 4321 });
  });

  test("S25-AC4: the TV shows the clock for 3 s, then a question mark", () => {
    const r = round("blindstop");
    onTv("blindstop", r.view(tv, T0 + 2500), T0 + 2500);
    expect(screen.getByText("2.50")).toBeInTheDocument();
  });

  test("S25-AC4: after 3 s the TV clock hides behind a question mark", () => {
    const r = round("blindstop");
    onTv("blindstop", r.view(tv, T0 + 5000), T0 + 5000);
    expect(screen.getByText("?")).toBeInTheDocument();
    expect(screen.queryByText("5.00")).toBeNull();
  });

  test("S25-AC5: Last Second's Stop answers at once with the time stopped, timed on the phone", () => {
    const r = round("lastsecond");
    const at = T0 + 7_250;
    const send = phone("lastsecond", r.view(cap, at), at);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Stop" }));
    expect(send).toHaveBeenCalledWith({ elapsedMs: 7_250 });
    expect(screen.getByRole("button", { name: "7.25" })).toBeDisabled();
  });

  test("S25-AC5: Last Second counts down on the TV, and a team that didn't stop shows as a bust", () => {
    const r = round("lastsecond", [["t1", { elapsedMs: 9_500 }, T0 + 9_550]]);
    onTv("lastsecond", r.view(tv, T0 + 8_000), T0 + 8_000);
    expect(screen.getByText("2.00")).toBeInTheDocument();
  });

  test("S25-AC5: the Last Second reveal shows time left and too-late teams", () => {
    const r = round("lastsecond", [["t1", { elapsedMs: 9_500 }, T0 + 9_550]]);
    onTv("lastsecond", r.view(tv, T0 + 20_000, true, r.score()), T0 + 20_000);
    const answers = screen.getByRole("list", { name: "Answers" });
    expect(within(answers).getByText("0.50 left")).toBeInTheDocument();
    expect(within(answers).getByText("Too late")).toBeInTheDocument();
  });
});
