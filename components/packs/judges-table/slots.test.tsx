import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { runSlotContract } from "@/components/slots/contracts";
import { DEFAULT_SLOTS } from "@/components/slots/defaults";
import { resolveSlots } from "@/components/slots/registry";
import { StyleRoot } from "@/components/theme";
import type { SlotName } from "@/lib/themes";
import { judgesTableSlots } from "./slots";

const PROVIDED = [
  "Banner",
  "Key",
  "LeaderboardRow",
  "Progress",
  "ScoreCard",
  "Surface",
  "Tile",
  "Toast",
];

describe("S09-AC11: Judges' Table provides its eight slots and uses defaults for the rest", () => {
  test("provides exactly the listed slots", () => {
    expect(Object.keys(judgesTableSlots).sort()).toEqual(PROVIDED);
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
