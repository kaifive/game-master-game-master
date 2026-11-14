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
        onClose={vi.fn()}
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

  test("keyboard focus stays inside the box", async () => {
    render(
      <>
        <button type="button">Behind</button>
        <InstructionsDialog
          instructions={{ title: "Rules", lines: ["Go."] }}
          onStart={vi.fn()}
          onClose={vi.fn()}
        />
      </>,
    );
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Start" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Start" })).toHaveFocus();
  });

  test("S08-AC17: Escape or a tap outside closes it, and focus returns to what opened it", async () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(
      <InstructionsDialog
        instructions={{ title: "Rules", lines: ["Go."] }}
        onStart={vi.fn()}
        onClose={onClose}
      />,
    );
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    // A tap inside the box doesn't close it; a tap on the dimmed space around it does.
    await user.click(screen.getByText("Go."));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId("sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  test("S08-AC17: opened mid-game, it has no Start, just a way back to the game", async () => {
    const onClose = vi.fn();
    render(
      <InstructionsDialog instructions={{ title: "Rules", lines: ["Go."] }} onClose={onClose} />,
    );
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Back to the game" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test("disables Start while the game is starting", () => {
    render(
      <InstructionsDialog
        instructions={{ title: "Rules", lines: ["Go."] }}
        onStart={vi.fn()}
        busy
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Starting…" })).toBeDisabled();
  });
});
