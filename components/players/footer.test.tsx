import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PlayerFooter } from "./footer";
import { TotalScore } from "./total-score";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const device = vi.hoisted(() => ({
  state: null as null | {
    slug: string;
    active: { id: string; nickname: string } | null;
    total: number;
    leaveWarning: string | null;
    setLeaveWarning: (m: string | null) => void;
  },
}));
vi.mock("./device", () => ({ useOptionalDevice: () => device.state }));

beforeEach(() => {
  push.mockClear();
  device.state = {
    slug: "holiday-2026",
    active: { id: "p1", nickname: "Mai" },
    total: 180,
    leaveWarning: null,
    setLeaveWarning: vi.fn(),
  };
});

describe("PlayerFooter", () => {
  test("S08-AC14: shows who's playing and the way back to the games", () => {
    render(<PlayerFooter />);
    const nav = screen.getByRole("navigation", { name: "Party" });
    expect(nav).toHaveTextContent("Mai");
    expect(screen.getByRole("link", { name: /Games/ })).toHaveAttribute("href", "/holiday-2026");
    expect(screen.getByRole("link", { name: /Mai/ })).toHaveAttribute(
      "href",
      "/holiday-2026#players",
    );
  });

  test("S08-AC14: asks before leaving a game in progress", async () => {
    if (device.state) device.state.leaveWarning = "Leave the game?";
    render(<PlayerFooter />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: /Games/ }));
    expect(screen.getByRole("alertdialog", { name: "Leave the game?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep playing" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("link", { name: /Games/ }));
    await user.click(screen.getByRole("button", { name: "Leave" }));
    expect(push).toHaveBeenCalledWith("/holiday-2026");
  });

  test("hidden until a player has joined", () => {
    if (device.state) device.state.active = null;
    const { container } = render(<PlayerFooter />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TotalScore", () => {
  test("S08-AC15: shows the active player's total in the header", () => {
    render(<TotalScore />);
    expect(screen.getByLabelText("Mai: 180 points")).toHaveAttribute("data-total-score");
  });

  test("shows nothing without a player", () => {
    device.state = null;
    const { container } = render(<TotalScore />);
    expect(container).toBeEmptyDOMElement();
  });
});
