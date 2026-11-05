import { act, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { animateSpy, setReducedMotion } from "@/tests/motion";
import { BarRace, CountUp, PointsBurst, useFlip } from ".";

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
    ],
  });
});
afterEach(() => {
  vi.useRealTimers();
});

const animate = () => animateSpy;

function List({ items }: { items: string[] }) {
  const flip = useFlip(items);
  return (
    <ul>
      {items.map((id, i) => (
        <li
          key={id}
          ref={(el) => {
            flip(id)(el);
            if (el) el.getBoundingClientRect = () => ({ left: 0, top: i * 50 }) as DOMRect;
          }}
        >
          {id}
        </li>
      ))}
    </ul>
  );
}

describe("S14-AC2: useFlip glides reordered items from their old place", () => {
  test("a row that moved up starts where it was and slides to its new spot", () => {
    const { rerender } = render(<List items={["a", "b", "c"]} />);
    rerender(<List items={["c", "a", "b"]} />);
    const calls = animate().mock.calls.map(([frames]) => frames[0]?.transform);
    expect(calls).toContain("translate(0px, 100px)");
    expect(calls).toContain("translate(0px, -50px)");
  });

  test("S14-AC10: with reduced motion, rows snap into place", () => {
    setReducedMotion(true);
    const { rerender } = render(<List items={["a", "b"]} />);
    rerender(<List items={["b", "a"]} />);
    expect(animate()).not.toHaveBeenCalled();
  });
});

function Counter() {
  const [v, setV] = useState(100);
  return (
    <>
      <CountUp value={v} />
      <button
        onClick={() => {
          setV(1100);
        }}
      >
        add
      </button>
    </>
  );
}

describe("S14-AC3: CountUp rolls to the new value and lands exactly", () => {
  test("shows in-between numbers, then the exact value; screen readers get the final value", () => {
    render(<Counter />);
    act(() => {
      screen.getByRole("button").click();
    });
    expect(screen.getByText("1,100", { selector: ".sr-only" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(120);
    });
    const shown = Number(screen.getByTestId("count-up").textContent.replace(/,/g, ""));
    expect(shown).toBeGreaterThan(100);
    expect(shown).toBeLessThan(1100);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("count-up")).toHaveTextContent("1,100");
  });

  test("S14-AC10: with reduced motion, the number jumps straight to its value", () => {
    setReducedMotion(true);
    render(<Counter />);
    act(() => {
      screen.getByRole("button").click();
    });
    expect(screen.getByTestId("count-up")).toHaveTextContent("1,100");
  });
});

describe("S14-AC4: BarRace", () => {
  const entries = [
    { id: "t2", name: "Team Crane", score: 920, team: 2 },
    { id: "t1", name: "Team Dragon", score: 1840, team: 1 },
    { id: "t3", name: "Team Tiger", score: 0, team: 3 },
  ];

  test("is a ranked list, top score first, with bars sized by share of the top score", () => {
    render(<BarRace label="Team standings" entries={entries} />);
    const list = screen.getByRole("list", { name: "Team standings" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("aria-label"))).toEqual([
      "1. Team Dragon, 1,840 points",
      "2. Team Crane, 920 points",
      "3. Team Tiger, 0 points",
    ]);
    const bars = list.querySelectorAll<HTMLElement>("[data-part='bar']");
    expect(bars[0]?.style.width).toBe("100%");
    expect(bars[1]?.style.width).toBe("50%");
    expect(bars[2]?.style.width).toBe("4%");
  });
});

describe("S14-AC5: PointsBurst", () => {
  test("announces the points once, floats up, and removes itself when done", () => {
    const onDone = vi.fn();
    render(<PointsBurst points={150} onDone={onDone} />);
    expect(screen.getByRole("status")).toHaveTextContent("+150 points");
    expect(screen.getByText("+150")).toHaveClass(
      "motion-safe:animate-[gm-burst_var(--gm-motion-slow)_var(--gm-ease-out)_forwards]",
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText("+150")).toBeNull();
    expect(onDone).toHaveBeenCalledOnce();
  });
});
