import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ShowdownPhoneFrame, ShowdownTvFrame, TITLES } from "@/components/dev/showdown-gallery";
import { GALLERY_MOMENTS } from "@/components/dev/showdown-moments";
import { PackRoot } from "@/components/packs/judges-table/root";
import { holiday2026 } from "@/content/events/holiday-2026";
import { showdownTypes } from "@/lib/live";

/**
 * Every showdown screen, at every moment of a round, on the TV and on two
 * teams' phones, played on the real game logic (S24-AC9, specs 25 to 27):
 * nothing crashes, the TV names the game, and each phone shows its panel.
 */
const inPack = (node: React.ReactNode) =>
  render(<PackRoot styleRef={holiday2026.style}>{node}</PackRoot>);

describe("every showdown screen renders (specs 25 to 27)", () => {
  test("S24-AC9: the gallery knows every registered showdown", () => {
    expect(Object.keys(TITLES).sort()).toEqual(showdownTypes().sort());
  });

  for (const type of showdownTypes())
    test(`S24-AC9: ${type} renders on the TV and phones at every moment, with 2 and 6 teams`, () => {
      for (const teams of [2, 6])
        for (const moment of GALLERY_MOMENTS) {
          inPack(<ShowdownTvFrame type={type} moment={moment} teamCount={teams} />);
          expect(screen.getByRole("heading", { name: TITLES[type] ?? type })).toBeInTheDocument();
          cleanup();
          for (const as of ["t1", "t2"]) {
            inPack(<ShowdownPhoneFrame type={type} moment={moment} teamCount={teams} as={as} />);
            expect(screen.getByRole("main")).not.toBeEmptyDOMElement();
            cleanup();
          }
        }
    });
});
