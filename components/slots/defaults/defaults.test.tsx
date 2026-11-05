import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MOMENT_KINDS } from "@/lib/motion";
import { SLOT_NAMES } from "@/lib/themes";
import { runSlotContract } from "../contracts";
import { Celebration, DEFAULT_ANIMATIONS, DEFAULT_SLOTS } from ".";

vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));

describe("S09-AC3: the default slots pass their contract suites", () => {
  for (const name of SLOT_NAMES) {
    describe(name, () => {
      runSlotContract(name, DEFAULT_SLOTS[name]);
    });
  }
});

describe("S14-AC8: the default Celebration plays its animation for each moment", () => {
  test.each(MOMENT_KINDS)("%s", (kind) => {
    const { container } = render(
      <Celebration
        moment={{ id: "m", kind, text: "x" }}
        surface="display"
        onDone={() => undefined}
      />,
    );
    expect(container.querySelector("[data-animation]")).toHaveAttribute(
      "data-animation",
      DEFAULT_ANIMATIONS[kind],
    );
  });
});
