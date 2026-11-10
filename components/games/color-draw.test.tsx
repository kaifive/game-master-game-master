import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ColorGame, colorSummary } from "./color/color";
import { DrawGame, drawSummary } from "./draw/draw";

const props = (view: unknown, onMove = vi.fn()) => ({
  view,
  onMove,
  onTimeUp: vi.fn(),
  busy: false,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Color Matcher and Quick Draw screens (spec 18)", () => {
  test("S18-AC2: the sliders mix the swatch and Lock in sends its color", () => {
    const onMove = vi.fn();
    render(
      <ColorGame
        {...props({ kind: "pick", prompt: "Pick the color of the Nova Wushu logo" }, onMove)}
      />,
    );
    fireEvent.change(screen.getByLabelText(/^Red/), { target: { value: "136" } });
    fireEvent.change(screen.getByLabelText(/^Green/), { target: { value: "46" } });
    fireEvent.change(screen.getByLabelText(/^Blue/), { target: { value: "126" } });
    expect(
      screen.getByRole("img", { name: "Your color: red 136, green 46, blue 126" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lock in this color" }));
    expect(onMove).toHaveBeenCalledWith({ type: "pick", color: "#882E7E" });
    expect(colorSummary({ kind: "done", picked: "#902F80", target: "#882E7E", match: 96 })).toBe(
      "96% match · yours #902F80, the logo #882E7E",
    );
    expect(colorSummary({ kind: "done", picked: "#902F80", target: null, match: 96 })).toBe(
      "96% match",
    );
  });

  test("S18-AC3: Quick Draw has no clock; strokes go when the player taps I'm done", () => {
    HTMLElement.prototype.setPointerCapture = () => undefined;
    const onMove = vi.fn();
    render(<DrawGame {...props({ kind: "drawing", prompt: "Draw the logo" }, onMove)} />);
    expect(screen.queryByText(/\d+ s$/)).toBeNull();
    const done = screen.getByRole("button", { name: "I'm done" });
    expect(done).toBeDisabled();
    const pad = screen.getByLabelText("Drawing area");
    pad.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(pad, { clientX: 50, clientY: 50 });
    fireEvent.pointerUp(pad);
    fireEvent.click(done);
    expect(onMove).toHaveBeenCalledWith({
      type: "submit",
      strokes: [
        [
          [0.1, 0.1],
          [0.5, 0.5],
        ],
      ],
    });
    expect(screen.getByRole("button", { name: "I'm done" })).toBeDisabled();
    expect(drawSummary({ kind: "done", match: 0.724 })).toBe("The judge says 72% like the logo");
    expect(drawSummary({ kind: "done", match: null })).toBe("No drawing was sent");
  });
});
