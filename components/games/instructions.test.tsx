import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { InstructionsDialog } from "./instructions";

describe("InstructionsDialog", () => {
  test("S08-AC9: shows the rules and starts only when closed with Start", async () => {
    const onStart = vi.fn();
    render(
      <InstructionsDialog
        instructions={{ title: "How to play", lines: ["5 quick questions.", "Tap to answer."] }}
        onStart={onStart}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "How to play" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("5 quick questions.")).toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toHaveFocus();
    expect(onStart).not.toHaveBeenCalled();
    await userEvent.setup().click(start);
    expect(onStart).toHaveBeenCalledOnce();
  });

  test("disables Start while the game is starting", () => {
    render(
      <InstructionsDialog
        instructions={{ title: "Rules", lines: ["Go."] }}
        onStart={vi.fn()}
        busy
      />,
    );
    expect(screen.getByRole("button", { name: "Starting…" })).toBeDisabled();
  });
});
