import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { gameLogic, type PerceptionSoloView } from "@/lib/games";
import { rendererFor } from "../renderers";

const T0 = 1_000_000;

/** A real solo run's view at `now`, after the moves given. */
function soloView(type: string, now: number, moves: [unknown, number][] = []) {
  const logic = gameLogic(type);
  if (!logic) throw new Error(type);
  const c = logic.content.parse({});
  let s = logic.create(c, 7, { now: T0 });
  for (const [m, at] of moves) {
    const r = logic.move(s, c, m, { now: at });
    if (!r.ok) throw new Error(r.message);
    s = r.state;
  }
  return {
    view: logic.view(s, c, { now }) as PerceptionSoloView,
    state: s as { tasks: unknown[] },
  };
}

function play(type: string, view: PerceptionSoloView) {
  const R = rendererFor(type);
  if (!R) throw new Error(type);
  const onMove = vi.fn();
  const onTimeUp = vi.fn();
  render(
    <PackRoot styleRef={holiday2026.style}>
      <R.Play view={view} onMove={onMove} onTimeUp={onTimeUp} busy={false} />
    </PackRoot>,
  );
  return { onMove, onTimeUp, R };
}

describe("perception games solo on the phone (spec 28)", () => {
  test("S28-AC2: after an answer the phone holds up how close it was, and the result line averages them", () => {
    const first = soloView("staffangle", T0);
    const target = (first.state.tasks[0] as { target: number }).target;
    const { view } = soloView("staffangle", T0 + 1100, [[{ answer: target }, T0 + 1000]]);
    const { R } = play("staffangle", view);
    expect(screen.getByText("100% close")).toBeInTheDocument();
    expect(screen.getByText(`You said ${String(target)}°.`, { exact: false })).toBeInTheDocument();
    expect(R.summary(view)).toBeNull();
    expect(R.summary({ ...view, done: true, closeness: [1, 0.5, 0.75] })).toBe(
      "75% close on average",
    );
  });

  test("S28-AC2: when the answer time runs out the phone asks the server for what's next", () => {
    const { view } = soloView("ribbon", T0);
    const { onTimeUp } = play("ribbon", { ...view, elapsed: view.answerMs + 500 });
    expect(screen.getByText("Time's up!")).toBeInTheDocument();
    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });
});

describe("the counting games solo on the phone (spec 30)", () => {
  test("S30-AC2: Fly-by Count flies the presents across the phone, then takes a number", async () => {
    const user = userEvent.setup();
    play("flyby", soloView("flyby", T0 + 500).view);
    expect(screen.getByRole("img", { name: "Presents flying past" })).toBeInTheDocument();
    const later = play("flyby", soloView("flyby", T0 + 4500).view);
    await user.click(screen.getByRole("button", { name: "7" }));
    await user.click(screen.getByRole("button", { name: "Lock in 7" }));
    expect(later.onMove).toHaveBeenCalledWith({ answer: 7 });
  });

  test("S30-AC2: Snow Sum drops the snowflakes one at a time, and its pad can go below zero", () => {
    play("snowsum", soloView("snowsum", T0 + 200).view);
    expect(screen.getByText("Do the math!")).toBeInTheDocument();
    play("snowsum", soloView("snowsum", T0 + 7500).view);
    expect(screen.getByRole("button", { name: "Minus" })).toBeInTheDocument();
  });

  test("S30-AC3: Fly-by flies the presents without the question, and asks the server for it once they're gone", () => {
    const { onTimeUp } = play("flyby", soloView("flyby", T0 + 200).view);
    expect(screen.getByRole("img", { name: "Presents flying past" })).toBeInTheDocument();
    expect(screen.queryByText(/How many/)).toBeNull();
    expect(onTimeUp).not.toHaveBeenCalled();
    const shown = soloView("flyby", T0 + 200).view;
    const after = play("flyby", { ...shown, elapsed: shown.showMs + 50 });
    expect(after.onTimeUp).toHaveBeenCalledTimes(1);
    play("flyby", soloView("flyby", T0 + 4500).view);
    expect(screen.getAllByRole("button", { name: "Lock in" }).length).toBeGreaterThan(0);
  });
});

describe("the staff dial (spec 28)", () => {
  test("S28-AC1: up to 180° the staff stands on the floor; rounds 2 and 3 turn it on a full dial that winds past a whole turn", async () => {
    const { StaffDial, windTo } = await import("./scenes");
    // A pointer means the turn nearest where the staff already is, up to the round's limit.
    expect(windTo(90, 0, 540)).toBe(90);
    expect(windTo(10, 350, 540)).toBe(370);
    expect(windTo(-90, 0, 360)).toBe(270);
    // A drag past the limit stops there, not a whole turn back.
    expect(windTo(200, 500, 540, true)).toBe(540);
    expect(windTo(10, 350, 540, true)).toBe(370);
    expect(windTo(-20, 10, 540, true)).toBe(0);
    const user = userEvent.setup();
    let angle = 358;
    const onAngle = vi.fn((a: number) => {
      angle = a;
    });
    const { rerender } = render(<StaffDial angle={angle} onAngle={onAngle} max={540} />);
    const dial = screen.getByRole("slider", { name: /staff/ });
    expect(dial).toHaveAttribute("aria-valuemax", "540");
    expect(dial.getAttribute("viewBox")).toBe("0 0 200 200");
    dial.focus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    rerender(<StaffDial angle={angle} onAngle={onAngle} max={540} />);
    expect(onAngle).toHaveBeenLastCalledWith(359);
    render(<StaffDial angle={20} onAngle={vi.fn()} />);
    expect(screen.getAllByRole("slider")[1]?.getAttribute("viewBox")).toBe("0 0 200 112");
  });
});
