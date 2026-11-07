import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { runSlotContract } from "@/components/slots/contracts";
import { DEFAULT_SLOTS } from "@/components/slots/defaults";
import { resolveSlots } from "@/components/slots/registry";
import { StyleRoot } from "@/components/theme";
import { MOMENT_KINDS } from "@/lib/motion";
import type { SlotName } from "@/lib/themes";
import { JT_ANIMATIONS, judgesTableSlots } from "./slots";

vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));

const S09_PROVIDED = [
  "Banner",
  "Key",
  "LeaderboardRow",
  "Progress",
  "ScoreCard",
  "Surface",
  "Tile",
  "Toast",
];
const PROVIDED = [...S09_PROVIDED, "Celebration"].sort();

describe("S09-AC11: Judges' Table provides its eight slots (plus Celebration, spec 14) and uses defaults for the rest", () => {
  test("provides exactly the listed slots", () => {
    expect(Object.keys(judgesTableSlots).sort()).toEqual(PROVIDED);
    for (const name of S09_PROVIDED) expect(PROVIDED).toContain(name);
  });

  test("every other slot resolves to the default", () => {
    const slots = resolveSlots(judgesTableSlots);
    for (const name of ["Button", "Panel", "Buzzer", "CodeEntry"] as const) {
      expect(slots[name]).toBe(DEFAULT_SLOTS[name]);
    }
  });

  test("the winter variant shows snow and holly; the base pack doesn't", () => {
    const { Surface, Banner } = resolveSlots(judgesTableSlots);
    const view = (variant: string | undefined) =>
      render(
        <StyleRoot
          styleRef={{ pack: "judges-table", colorMode: "light", ...(variant ? { variant } : {}) }}
        >
          <Surface>
            <Banner title="Party" />
          </Surface>
        </StyleRoot>,
      ).container;
    const winter = view("winter");
    expect(winter.querySelector('[data-decoration="snow"]')).not.toBeNull();
    expect(winter.querySelector('[data-decoration="holly"]')).not.toBeNull();
    const base = view(undefined);
    expect(base.querySelector('[data-decoration="snow"]')).toBeNull();
  });

  test("a score card has a handle, and a long list of scores still renders every card", () => {
    const { ScoreCard } = resolveSlots(judgesTableSlots);
    const { container } = render(
      <>
        {Array.from({ length: 20 }, (_, i) => (
          <ScoreCard key={i} label={`Game ${i}`} value={i * 10} state="scored" size="sm" />
        ))}
      </>,
    );
    expect(container.querySelectorAll('[data-slot="score-card"]')).toHaveLength(20);
    expect(container.querySelector('[data-part="handle"]')).not.toBeNull();
  });

  test("S14-AC12: a card flips when its score changes or a result is fresh, not on every visit", () => {
    const { ScoreCard } = resolveSlots(judgesTableSlots);
    const flipping = (el: HTMLElement) =>
      el.querySelector('[data-slot="score-card"] > span')?.className.includes("jt-flip") ?? false;
    const first = render(<ScoreCard label="Flip test" value={10} state="scored" />);
    expect(flipping(first.container)).toBe(false); // first sight: no flip
    first.rerender(<ScoreCard label="Flip test" value={30} state="scored" />);
    expect(flipping(first.container)).toBe(true); // the score changed
    first.unmount();
    const again = render(<ScoreCard label="Flip test" value={30} state="scored" />);
    expect(flipping(again.container)).toBe(false); // the same score on a later visit
    again.unmount();
    const later = render(<ScoreCard label="Flip test" value={50} state="scored" />);
    expect(flipping(later.container)).toBe(true); // a new best since the last visit
    const fresh = render(<ScoreCard label="Fresh result" value={0} state="scored" fresh />);
    expect(flipping(fresh.container)).toBe(true);
    // A blank card filling in as the page loads isn't a score landing.
    const loading = render(<ScoreCard label="Loading card" state="blank" />);
    loading.rerender(<ScoreCard label="Loading card" value={40} state="scored" />);
    expect(flipping(loading.container)).toBe(false);
  });

  test("a miss (0) is held up on the frosted card back, still reading 0", () => {
    const { ScoreCard } = resolveSlots(judgesTableSlots);
    const { container } = render(<ScoreCard label="Missed game" value={0} state="scored" />);
    const face = container.querySelector('[data-slot="score-card"] > span');
    expect(face?.className).toContain("card-back");
    expect(face).toHaveTextContent("0");
  });
});

const inPack = (node: ReactNode) => (
  <StyleRoot styleRef={{ pack: "judges-table", variant: "winter", colorMode: "light" }}>
    {node}
  </StyleRoot>
);

describe("S09-AC3: Judges' Table's slots pass the same contract suites", () => {
  for (const name of PROVIDED as SlotName[]) {
    describe(name, () => {
      const Component = judgesTableSlots[name] as unknown as (p: object) => ReactNode;
      // Pack components read the theme, so the contract runs them inside the pack.
      const Wrapped = (props: object) => inPack(<Component {...props} />);
      runSlotContract(name, Wrapped as never);
    });
  }
});

describe("S14-AC8: Judges' Table plays its own animation for each moment", () => {
  const { Celebration } = resolveSlots(judgesTableSlots);
  test.each(MOMENT_KINDS)("%s", (kind) => {
    const { container } = render(
      inPack(
        <Celebration
          moment={{ id: "m", kind, text: "x", value: 10 }}
          surface="display"
          onDone={() => undefined}
        />,
      ),
    );
    expect(container.querySelector("[data-animation]")).toHaveAttribute(
      "data-animation",
      JT_ANIMATIONS[kind],
    );
  });
});
