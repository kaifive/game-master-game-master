import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PackRoot } from "@/components/packs/judges-table/root";
import { MOMENT_KINDS } from "@/lib/motion";
import { MotionGallery, PRIMITIVES } from "./motion-gallery";

vi.mock("@/components/motion/confetti", () => ({ fireConfetti: vi.fn() }));

describe("S14-AC11: the motion gallery replays every primitive and every moment", () => {
  const view = () =>
    render(
      <PackRoot styleRef={{ pack: "judges-table", variant: "winter", colorMode: "dark" }}>
        <MotionGallery title="Judges' Table · Winter · Dark" />
      </PackRoot>,
    );

  test("has a replay button for every primitive and every moment kind", () => {
    view();
    for (const name of PRIMITIVES)
      expect(screen.getByRole("button", { name: `Replay ${name}` })).toBeInTheDocument();
    for (const kind of MOMENT_KINDS)
      expect(screen.getByRole("button", { name: `Play ${kind}` })).toBeInTheDocument();
  });

  test("playing a stage moment shows it; playing a toast moment adds a toast", async () => {
    view();
    await userEvent.click(screen.getByRole("button", { name: "Play lead-change" }));
    expect(screen.getByRole("status")).toHaveTextContent(/takes the lead/i);
    await userEvent.click(screen.getByRole("button", { name: "Play game-finished" }));
    expect(screen.getByRole("list", { name: "Latest" })).toHaveTextContent(/finished/i);
  });

  test("replaying the bar race reshuffles the scores", async () => {
    view();
    const before = screen.getByRole("list", { name: "Demo standings" }).textContent;
    await userEvent.click(screen.getByRole("button", { name: "Replay BarRace" }));
    act(() => undefined);
    expect(screen.getByRole("list", { name: "Demo standings" }).textContent).not.toBe(before);
  });
});
