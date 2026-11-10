import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { toHex } from "@/lib/games";
import { ColorGame, colorSummary, hsvToRgb, wheelPick } from "./color/color";
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
  test("S18-AC2: the wheel and brightness mix the swatch, and Lock in sends its color", () => {
    // The wheel: the angle is the shade, the distance from the middle how strong it is.
    expect(wheelPick(0.5, 0.5).s).toBe(0);
    expect(wheelPick(0.5, 0)).toMatchObject({ h: 0, s: 1 });
    expect(wheelPick(1, 0.5).h).toBeCloseTo(90);
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual([255, 0, 0]);
    expect(hsvToRgb({ h: 120, s: 0, v: 1 })).toEqual([255, 255, 255]);
    const onMove = vi.fn();
    render(
      <ColorGame
        {...props({ kind: "pick", prompt: "Pick the color of the Nova Wushu logo" }, onMove)}
      />,
    );
    HTMLElement.prototype.setPointerCapture = () => undefined;
    const wheel = screen.getByLabelText("Your color: #BFBFBF")
      .previousElementSibling as HTMLElement;
    wheel.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    fireEvent.pointerDown(wheel, { clientX: 50, clientY: 0 }); // the top edge: red
    fireEvent.pointerUp(wheel);
    fireEvent.change(screen.getByLabelText("Brightness"), { target: { value: "100" } });
    expect(screen.getByRole("img", { name: "Your color: #FF0000" })).toBeInTheDocument();
    // The same choices by keyboard: the logo's purple.
    fireEvent.change(screen.getByLabelText("Shade around the wheel"), { target: { value: "307" } });
    fireEvent.change(screen.getByLabelText("Strength of the color"), { target: { value: "66" } });
    fireEvent.change(screen.getByLabelText("Brightness"), { target: { value: "53" } });
    fireEvent.click(screen.getByRole("button", { name: "Lock in this color" }));
    expect(onMove).toHaveBeenCalledWith({
      type: "pick",
      color: toHex(hsvToRgb({ h: 307, s: 0.66, v: 0.53 })),
    });
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
    expect(drawSummary({ kind: "done", match: 0.724 })).toBe("72% match");
    expect(drawSummary({ kind: "done", match: null })).toBe("No drawing was sent");
  });
});
