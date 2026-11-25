import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { showdownFor } from "@/lib/live";
import { LIVE_RENDERERS } from "../renderers";
import { cap, HOST, round, show, T0, tv } from "./showdown-kit.test.helpers";

const content = {
  questions: [{ id: "q1", prompt: "What is the straight sword called?", answer: "Jian" }],
};
const quiz = (moves: [string, unknown, number][] = []) => round("buzzer", moves, null, content);
const OPEN = T0 + 1000;

function host(state: unknown, now: number) {
  const game = showdownFor("buzzer");
  const Host = LIVE_RENDERERS.buzzer?.Host;
  if (!game?.hostView || !Host) throw new Error("buzzer");
  const r = quiz();
  const act = vi.fn();
  render(
    <PackRoot styleRef={holiday2026.style}>
      <Host
        view={r.view(tv, now)}
        host={game.hostView(state, game.content.parse(content), {
          now,
          teams: ["t1", "t2", "t3"],
        })}
        act={act}
        busy={false}
      />
    </PackRoot>,
  );
  return act;
}

describe("the buzzer round on the phone, the TV and Controls (spec 12)", () => {
  test("S12-AC1: the buzzer is red and locked until the host opens it, then green; the TV says the same", () => {
    const r = quiz();
    show("buzzer", r.view(cap("t1"), T0 + 500), T0 + 500);
    expect(screen.getByRole("button", { name: "Wait for green" })).toHaveTextContent("Wait…");
    cleanup();
    show("buzzer", r.view(tv, T0 + 500), T0 + 500, "tv");
    expect(screen.getByText("What is the straight sword called?")).toBeInTheDocument();
    expect(screen.getByText("Wait…")).toBeInTheDocument();
    cleanup();
    const open = quiz([[HOST, "open", OPEN]]);
    const send = show("buzzer", open.view(cap("t2"), OPEN + 100), OPEN + 100);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Buzz" }));
    expect(send).toHaveBeenCalledWith({ at: OPEN + 100 });
    cleanup();
    show("buzzer", open.view(tv, OPEN + 100), OPEN + 100, "tv");
    expect(screen.getByText("Buzz now!")).toBeInTheDocument();
  });

  test("S12-AC7: pressing while red sends the press and says Too early!", () => {
    const send = show("buzzer", quiz().view(cap("t1"), T0 + 500), T0 + 500);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Wait for green" }));
    expect(send).toHaveBeenCalledWith({ at: T0 + 500 });
    expect(screen.getByText("Too early!")).toBeInTheDocument();
    // Opened within the lockout: still locked on this phone.
    const r = quiz([
      ["t1", { at: OPEN - 100 }, OPEN - 50],
      [HOST, "open", OPEN],
    ]);
    show("buzzer", r.view(cap("t1"), OPEN + 50), OPEN + 50);
    expect(screen.getByRole("button", { name: "Too early, wait a moment" })).toBeInTheDocument();
  });

  test("S12-AC2: the TV shows who's up big and the order; each captain sees their place", () => {
    const r = quiz([
      [HOST, "open", OPEN],
      ["t2", { at: OPEN + 300 }, OPEN + 350],
      ["t1", { at: OPEN + 420 }, OPEN + 450],
    ]);
    show("buzzer", r.view(tv, OPEN + 500), OPEN + 500, "tv");
    expect(screen.getByText("Blues!")).toBeInTheDocument();
    const order = screen.getByRole("list", { name: "Buzz order" });
    expect(
      within(order)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([expect.stringContaining("Blues+0.30 s"), expect.stringContaining("Reds+0.42 s")]);
    show("buzzer", r.view(cap("t1"), OPEN + 500), OPEN + 500);
    expect(screen.getByText("You're 2nd!")).toBeInTheDocument();
  });

  test("S12-AC3 S12-AC4: Controls shows the answer and Right and Wrong for the team that's up; the TV shows the answer once it's right", async () => {
    const user = userEvent.setup();
    const r = quiz([
      [HOST, "open", OPEN],
      ["t2", { at: OPEN + 300 }, OPEN + 350],
      ["t1", { at: OPEN + 420 }, OPEN + 450],
    ]);
    show("buzzer", r.view(tv, OPEN + 500), OPEN + 500, "tv");
    expect(screen.queryByText("Jian")).toBeNull();
    cleanup();
    const act = host(r.state, OPEN + 500);
    expect(screen.getByText("Jian")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wrong" }));
    expect(act).toHaveBeenCalledWith({ action: "host", act: { act: "wrong", team: "t2" } });
    await user.click(screen.getByRole("button", { name: "Right" }));
    expect(act).toHaveBeenCalledWith({ action: "host", act: { act: "right", team: "t2" } });
    cleanup();
    const right = quiz([
      [HOST, "open", OPEN],
      ["t2", { at: OPEN + 300 }, OPEN + 350],
      [HOST, "right", OPEN + 2000],
    ]);
    show("buzzer", right.view(tv, OPEN + 2100), OPEN + 2100, "tv");
    expect(screen.getByText("Jian")).toBeInTheDocument();
    expect(screen.getByText("Blues")).toBeInTheDocument();
  });

  test("S12-AC5: Controls offers Open buzzers, then Reopen and Undo when they apply", async () => {
    const user = userEvent.setup();
    const act = host(quiz().state, T0 + 500);
    await user.click(screen.getByRole("button", { name: "Open buzzers" }));
    expect(act).toHaveBeenCalledWith({ action: "host", act: "open" });
    const missed = quiz([
      [HOST, "open", OPEN],
      ["t2", { at: OPEN + 300 }, OPEN + 350],
      [HOST, "wrong", OPEN + 2000],
    ]);
    const again = host(missed.state, OPEN + 2100);
    await user.click(screen.getAllByRole("button", { name: "Reopen buzzers" })[0] as HTMLElement);
    expect(again).toHaveBeenCalledWith({ action: "host", act: "reopen" });
    await user.click(screen.getAllByRole("button", { name: "Undo" })[0] as HTMLElement);
    expect(again).toHaveBeenCalledWith({ action: "host", act: "undo" });
  });
});
