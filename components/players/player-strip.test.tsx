import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PlayerStrip } from "./player-strip";

type Player = { id: string; nickname: string };
const device = vi.hoisted(() => ({
  state: {
    active: null as Player | null,
    total: 140,
    totalKnown: true,
    seat: { phase: "team", team: { id: "t1", name: "Snow Dragons", color: 1 }, isCaptain: false },
  },
}));
vi.mock("./device", () => ({ useOptionalDevice: () => device.state }));

device.state.active = { id: "p1", nickname: "Mai" };

describe("PlayerStrip", () => {
  test("S08-AC15: the games list opens with who's playing, their team, and their total", () => {
    render(<PlayerStrip />);
    const strip = screen.getByRole("region", { name: "You" });
    expect(strip).toHaveTextContent("Mai");
    expect(strip).toHaveTextContent("Snow Dragons");
    expect(screen.getByRole("img", { name: "Mai: 140 points" })).toHaveAttribute(
      "data-total-score",
    );
  });

  test("no total until it has loaded, and nothing without a player", () => {
    device.state.totalKnown = false;
    const { unmount } = render(<PlayerStrip />);
    expect(screen.queryByRole("img", { name: /points/ })).toBeNull();
    unmount();
    device.state.active = null;
    const { container } = render(<PlayerStrip />);
    expect(container).toBeEmptyDOMElement();
  });
});
