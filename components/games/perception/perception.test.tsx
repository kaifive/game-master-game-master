import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { gameLogic, type PerceptionSoloView } from "@/lib/games";
import { rendererFor } from "../renderers";
import { PerceptionStage } from "./stage";

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
  test("S28-AC2: Snow Pile shows the flakes, then a number pad that sends the count", async () => {
    const user = userEvent.setup();
    play("snowpile", soloView("snowpile", T0 + 200).view);
    expect(screen.getByText("Count the snowflakes!")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Snowflakes" })).toBeInTheDocument();
    const later = play("snowpile", soloView("snowpile", T0 + 2500).view);
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "Lock in 3" }));
    expect(later.onMove).toHaveBeenCalledWith({ answer: 3 });
  });

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

describe("Lion Drum on the phone (spec 28)", () => {
  const scene = { intervalMs: 500, shown: 4, keep: 2 };
  const stage = (elapsed: number, clock: () => number, onAnswer = vi.fn()) => (
    <PerceptionStage
      type="liondrum"
      scene={scene}
      elapsed={elapsed}
      clock={clock}
      showMs={2000}
      answerMs={3500}
      busy={false}
      onAnswer={onAnswer}
      timer={null}
      showOn="tv"
    />
  );

  test("S28-AC5: the drum flashes on the beat, then goes dark and takes taps timed by the phone, sent once the beats are over", () => {
    let now = 20;
    const onAnswer = vi.fn();
    const { rerender } = render(stage(now, () => now, onAnswer));
    expect(screen.getByText("Watch the beat…")).toBeInTheDocument();
    now = 2010;
    rerender(stage(now, () => now, onAnswer));
    expect(screen.getByText("Keep the beat!")).toBeInTheDocument();
    const drum = screen.getByRole("button", { name: "Tap the drum" });
    act(() => {
      drum.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    now = 2480;
    act(() => {
      drum.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(screen.getByRole("img", { name: "2 of 2 beats tapped" })).toBeInTheDocument();
    expect(onAnswer).not.toHaveBeenCalled();
    now = 2900;
    rerender(stage(now, () => now, onAnswer));
    expect(onAnswer).toHaveBeenCalledWith([2010, 2480]);
    rerender(stage(3000, () => 3000, onAnswer));
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });
});
