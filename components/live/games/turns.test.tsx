import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { showdownFor, type Role } from "@/lib/live";
import { LIVE_RENDERERS } from "../renderers";
import type { ActiveLiveView } from "../types";

const T0 = 1_000_000;
const TEAMS = ["t1", "t2"];
const NAMES: Record<string, string> = { t1: "Reds", t2: "Blues" };

// The state type is only for reading it back in each test.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function round<S>(type: string, content: unknown = {}) {
  const game = showdownFor(type);
  if (!game) throw new Error(type);
  const c = game.content.parse(content);
  let state = game.deal(c, { seed: 4, round: 1, teams: TEAMS, startsAt: T0, prev: null }) as S;
  const play = (teamId: string, move: unknown, now: number) => {
    const r = game.move(state, c, { teamId, move, now });
    if (!r.ok) throw new Error(r.message);
    state = r.state as S;
  };
  const view = (role: Role, now: number, revealed = false): ActiveLiveView => {
    const points = revealed ? game.score(state, c, TEAMS) : null;
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
        rounds: 2,
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
      game: game.view(state, c, { role, revealed, now, teams: TEAMS }),
      you: role.kind === "tv" ? null : { teamId: role.teamId, captain: true },
    };
  };
  return {
    get state() {
      return state;
    },
    play,
    view,
  };
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

describe("Snowball to 21 (spec 27)", () => {
  test("S27-AC3: on its turn a team adds 1, 2 or 3; a choice past 21 is off; others wait", async () => {
    const user = userEvent.setup();
    const r = round<{ count: number }>("to21");
    const send = show("to21", r.view(cap("t1"), T0 + 100), T0 + 100);
    await user.click(screen.getByRole("button", { name: "+3" }));
    expect(send).toHaveBeenCalledWith({ add: 3 });
    for (let i = 0; i < 6; i++) r.play(i % 2 ? "t2" : "t1", { add: 3 }, T0 + 200 + i);
    r.play("t1", { add: 1 }, T0 + 210);
    r.play("t2", { add: 1 }, T0 + 220);
    // At 20, only +1 is left.
    show("to21", r.view(cap("t1"), T0 + 300), T0 + 300);
    expect(screen.getAllByRole("button", { name: "+3" }).at(-1)).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "+2" }).at(-1)).toBeDisabled();
    show("to21", r.view(cap("t2"), T0 + 300), T0 + 300);
    expect(screen.getByText("The snowball is at 20")).toBeInTheDocument();
  });

  test("S27-AC3: the TV names the team that made 21", () => {
    const r = round("to21");
    for (let i = 0; i < 7; i++) r.play(i % 2 ? "t2" : "t1", { add: 3 }, T0 + 100 + i);
    show("to21", r.view(tv, T0 + 500, true), T0 + 500, "tv");
    expect(screen.getByText("Reds made 21!")).toBeInTheDocument();
  });
});

describe("Memory Path (spec 27)", () => {
  test("S27-AC1: phones wait while the path shows; on its turn a team steps with arrows, no grid to scroll", async () => {
    const user = userEvent.setup();
    const r = round<{ path: [number, number][]; showEndsAt: number; rows: number }>("path");
    show("path", r.view(cap("t1"), T0 + 1000), T0 + 1000);
    expect(screen.getByText("Watch the TV!")).toBeInTheDocument();
    const after = r.state.showEndsAt + 10;
    const send = show("path", r.view(cap("t1"), after), after);
    expect(screen.queryByRole("group", { name: "The path grid" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Up" }));
    expect(send).toHaveBeenCalledWith({ dir: "up" });
    await user.click(screen.getByRole("button", { name: "Left" }));
    expect(send).toHaveBeenCalledWith({ dir: "left" });
  });

  test("S27-AC1: a team that went out sees how far it got; the TV shows who crossed", () => {
    const r = round<{ path: [number, number][]; showEndsAt: number }>("path");
    const after = r.state.showEndsAt + 10;
    r.play("t1", { square: r.state.path[1] }, after);
    r.play("t1", { square: [-1, -1] }, after + 5);
    show("path", r.view(cap("t1"), after + 10), after + 10);
    expect(screen.getByText("Out at 2")).toBeInTheDocument();
    for (const [i, sq] of r.state.path.slice(1).entries())
      r.play("t2", { square: sq }, after + 20 + i);
    show("path", r.view(tv, after + 100, true), after + 100, "tv");
    expect(screen.getByText("Blues made it across!")).toBeInTheDocument();
  });
});

describe("Present Shuffle (spec 27)", () => {
  test("S27-AC2: on its turn a team taps a covered present; taken ones are off", async () => {
    const user = userEvent.setup();
    const r = round<{ shuffleEndsAt: number }>("shuffle");
    const at = r.state.shuffleEndsAt + 10;
    r.play("t1", { slot: 2 }, at);
    const send = show("shuffle", r.view(cap("t2"), at + 5), at + 5);
    expect(screen.getByRole("button", { name: /^Taken: \d+$/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Present 5" }));
    expect(send).toHaveBeenCalledWith({ slot: 4 });
  });

  test("S27-AC2: phones wait during the shuffle; the reveal shows each team's present", () => {
    const r = round<{ shuffleEndsAt: number; picks: Record<string, { value: number } | null> }>(
      "shuffle",
    );
    show("shuffle", r.view(cap("t1"), r.state.shuffleEndsAt - 100), r.state.shuffleEndsAt - 100);
    expect(screen.getByText("Watch the TV!")).toBeInTheDocument();
    const at = r.state.shuffleEndsAt + 10;
    r.play("t1", { slot: 0 }, at);
    r.play("t2", { slot: 1 }, at + 5);
    show("shuffle", r.view(tv, at + 100, true), at + 100, "tv");
    const answers = screen.getByRole("list", { name: "Answers" });
    expect(answers).toHaveTextContent(String(r.state.picks.t1?.value));
  });
});
